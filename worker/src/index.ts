import { DurableObject } from "cloudflare:workers";
import type { RequestMessage, ResponseMessage } from "../../shared/protocol";
import { toHex, fromHex } from "../../shared/hex";
import {
  TUNNEL_PROXY_PROTOCOL,
  X_WEBHOOKS_PROXY_TUNNEL_PREFLIGHT,
} from "../../shared/constants";
import { isValidToken, tokenFromParts } from "../../shared/token";
import { homePage } from "./homePage";
import { Stats } from "./types";
import { tunnelPage } from "./tunnelPage";

const RESPONSE_TIMEOUT_MS = 30_000; // 30 seconds

export class MyDurableObject extends DurableObject {
  // TODO: think of using a WeakMap
  proxyTo: WebSocket | null = null;
  resolve: ((value: Response) => void) | null = null;
  reject: ((value: Error) => void) | null = null;
  requests: number = 0;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Has to be called `fetch()` otherwise CF errors out with some
   * JSON related error resulting in 500.
   */
  async fetch(request: Request): Promise<Response> {
    console.info("connecting client from", request.url);
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Calling `accept()` tells the runtime that this WebSocket is to begin terminating
    // request within the Durable Object. It has the effect of "accepting" the connection,
    // and allowing the WebSocket to send and receive messages.
    server.accept();
    this.reject?.(new Error("new tunnel client connected"));
    this.proxyTo?.close(4101, "new tunnel client connected");
    this.proxyTo = server;

    server.addEventListener("message", (event: MessageEvent) => {
      console.info("got a message from client");

      if (typeof event.data !== "string") {
        console.error("message is not a string", typeof event.data);
        this.reject?.(new Error("message is not a string"));
        return;
      }

      const message: ResponseMessage = JSON.parse(event.data);
      if (message.type === "response") {
        this.response(message);
      } else {
        this.reject?.(new Error("unknown message type"));
      }
    });

    server.addEventListener("close", (cls: CloseEvent) => {
      this.proxyTo = null;
      this.reject?.(new Error("server closed"));
      console.info("closing connection", cls.code, cls.reason);
      server.close(1001, `server closed (${cls.code}: ${cls.reason})`);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: {
        "Sec-WebSocket-Protocol": TUNNEL_PROXY_PROTOCOL,
      },
    });
  }

  async proxy(request: Request): Promise<Response> {
    this.requests++;
    console.info("proxying request", request.url);
    if (!this.proxyTo) {
      return new Response("There is no proxy connected to the tunnel.", {
        status: 502,
      });
    }

    const bodyHex = request.body ? toHex(await request.bytes()) : undefined;

    const requestSerializable = {
      method: request.method,
      url: request.url,
      headers: [...request.headers.entries()],
      body: bodyHex,
    };
    const requestMessage: RequestMessage = {
      type: "request",
      request: requestSerializable,
    };
    this.proxyTo.send(JSON.stringify(requestMessage));

    try {
      return await withTimeout(
        new Promise<Response>((resolve, reject) => {
          this.resolve = resolve;
          this.reject = reject;
        }),
        RESPONSE_TIMEOUT_MS,
      );
    } catch (error) {
      if (error instanceof TimeoutError) {
        return new Response(
          "waiting for response from the tunnel client timed out",
          { status: 504 },
        );
      }
      throw error;
    }
  }

  response(message: ResponseMessage): void {
    const { status, statusText, headers, body: bodyHex } = message.response;

    const body = bodyHex ? fromHex(bodyHex) : undefined;

    this.resolve?.(
      new Response(body, {
        status,
        statusText,
        headers: new Headers(headers),
      }),
    );
  }

  async close(): Promise<boolean> {
    this.reject?.(new Error("Manually closed"));
    if (!this.proxyTo) {
      return false;
    }
    this.proxyTo.close(4102, "manually closed");
    this.proxyTo = null;
    return true;
  }

  async stats(): Promise<Stats> {
    return {
      isConnected: !!this.proxyTo,
      requests: this.requests,
    };
  }
}

class ClientError extends Error {}

function getTunnelId(path: string): string {
  const [, , uuid] = path.split("/");
  if (!uuid) {
    throw new ClientError("Missing tunnel URL");
  }
  if (uuid.length !== 36) {
    throw new ClientError("Invalid tunnel URL");
  }
  return uuid;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    try {
      const isSecretSet = isValidSecret(env.WEBHOOKS_PROXY_TUNNEL_SECRET);
      const url = new URL(request.url);
      if (url.pathname.startsWith("/tunnel/")) {
        const tunnelId = getTunnelId(url.pathname);
        const doId = env.MY_DURABLE_OBJECT.idFromName(tunnelId);
        const stub = env.MY_DURABLE_OBJECT.get(doId);
        const stats = await stub.stats();

        return new Response(
          tunnelPage(url.origin, tunnelId, stats, isSecretSet),
          {
            headers: { "content-type": "text/html" },
          },
        );
      } else if (url.pathname.startsWith("/connect/")) {
        const tunnelId = getTunnelId(url.pathname);
        if (isSecretSet) {
          const secret = env.WEBHOOKS_PROXY_TUNNEL_SECRET;
          const swspHeader = request.headers.get("Sec-WebSocket-Protocol");
          if (!swspHeader) {
            return new Response(
              "Unauthorized. Please provide the access token in the Sec-WebSocket-Protocol header.",
              { status: 401 },
            );
          }
          const [protocol, token] = swspHeader.split(/,\s*/);
          if (protocol !== TUNNEL_PROXY_PROTOCOL) {
            return new Response("Invalid protocol. Expected 'tunnel-proxy'.", {
              status: 400,
            });
          }

          if (!(await isValidToken(secret, tunnelId, token))) {
            return new Response("Unauthorized. Invalid token.", {
              status: 401,
            });
          }
        }

        if (request.headers.get(X_WEBHOOKS_PROXY_TUNNEL_PREFLIGHT) === "yes") {
          // This is a preflight request to check if the tunnel is reachable.
          // We can return a simple 200 OK response to indicate that the tunnel is ready.
          return new Response("Tunnel is ready");
        }

        // Expect to receive a WebSocket Upgrade request.
        // If there is one, accept the request and return a WebSocket Response.

        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
          return new Response("Expected `Upgrade: websocket`", {
            status: 426,
          });
        }
        const doId = env.MY_DURABLE_OBJECT.idFromName(tunnelId);
        const stub = env.MY_DURABLE_OBJECT.get(doId);
        return stub.fetch(request);
      } else if (url.pathname.startsWith("/proxy/")) {
        const tunnelId = getTunnelId(url.pathname);
        const doId = env.MY_DURABLE_OBJECT.idFromName(tunnelId);
        const stub = env.MY_DURABLE_OBJECT.get(doId);
        return stub.proxy(request);
      } else if (url.pathname.startsWith("/close/")) {
        const tunnelId = getTunnelId(url.pathname);
        const doId = env.MY_DURABLE_OBJECT.idFromName(tunnelId);
        const stub = env.MY_DURABLE_OBJECT.get(doId);

        return new Response(
          (await stub.close())
            ? "Closed connection"
            : "No proxy connection found, all good.",
          {
            headers: { "cache-control": "no-cache, no-store, max-age=0" },
          },
        );
      } else if (url.pathname == "/") {
        return new Response(
          homePage({
            isSecretSet,
          }),
          {
            headers: { "content-type": "text/html" },
          },
        );
      }
      return new Response("Not found", { status: 404 });
    } catch (error) {
      if (error instanceof ClientError) {
        return new Response(error.message, { status: 400 });
      }
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`a promise timed out after ${ms}ms`));
    }, ms);

    promise.then(resolve, reject).finally(() => {
      clearTimeout(timeoutId);
    });
  });
}

function isValidSecret(secret: unknown): boolean {
  // A valid secret is a string of 40 characters (30 bytes in Base64).
  return typeof secret === "string" && secret.length === 40;
}
