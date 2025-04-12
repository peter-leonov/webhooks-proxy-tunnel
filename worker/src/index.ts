import { DurableObject } from "cloudflare:workers";
import type { RequestMessage, ResponseMessage } from "../../shared/protocol";
import { toHex, fromHex } from "../../shared/hex";

const RESPONSE_TIMEOUT_MS = 30_000; // 30 seconds

type Stats = {
  isConnected: boolean;
  requests: number;
};

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
    });
  }

  async proxy(request: Request): Promise<Response> {
    this.requests++;
    console.info("proxying request", request.url);
    if (!this.proxyTo) {
      return new Response("no proxy connection", { status: 502 });
    }

    const body = request.body ? toHex(await request.bytes()) : undefined;

    const requestSerializable = {
      method: request.method,
      url: request.url,
      headers: [...request.headers.entries()],
      body: body,
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

function getTunnelId(path: string): string {
  const [, , uuid] = path.split("/");
  if (!uuid) {
    throw new Error("Missing tunnel URL");
  }
  if (uuid.length !== 36) {
    throw new Error("Invalid tunnel URL");
  }
  return uuid;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/tunnel/")) {
      const tunnelId = getTunnelId(url.pathname);
      const doId = env.MY_DURABLE_OBJECT.idFromName(tunnelId);
      const stub = env.MY_DURABLE_OBJECT.get(doId);
      const stats = await stub.stats();

      return new Response(tunnelPage(url.origin, tunnelId, stats), {
        headers: { "content-type": "text/html" },
      });
    } else if (url.pathname.startsWith("/connect/")) {
      // Expect to receive a WebSocket Upgrade request.
      // If there is one, accept the request and return a WebSocket Response.
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected `Upgrade: websocket`", {
          status: 426,
        });
      }

      const tunnelId = getTunnelId(url.pathname);
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
      return new Response(homePage(), {
        headers: { "content-type": "text/html" },
      });
    }
    return new Response("Not found", { status: 404 });
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

function homePage(): string {
  const uuid = crypto.randomUUID();
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Webhooks Proxy Tunnel</title>
  <link rel="stylesheet" href="/pico.min.css">
</head>
<body>
<main class="container">
<h1>Webhooks Proxy Tunnel</h1>
<p>Use Webhooks Proxy Tunnel (<a href="https://github.com/peter-leonov/webhooks-proxy-tunnel">GitHub</a>) to proxy HTTP requests made to the public URL to your project local web server.</p>
<p>Here is your very personal tunnel: <a href="/tunnel/${uuid}">${uuid}</a> (refresh the page for a new one).</p>
</body>
</html>`;
}

function tunnelPage(origin: string, tunnelId: string, stats: Stats): string {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Webhooks Proxy Tunnel / ${tunnelId}</title>
  <link rel="stylesheet" href="/pico.min.css">
</head>
<body>
<main class="container">
<h1>Tunnel ${tunnelId}</h1>
<p>Connected: ${stats.isConnected ? "yes" : "no"}</p>
<p>Requests: ${stats.requests}</p>
<p>Public URL: <code>${origin}/proxy/${tunnelId}</code></p>
<p>Connect URL: <code>${origin}/connect/${tunnelId}</code></p>
<p>
  Local server URL: <input type="text" value="http://localhost:3000" id="target-input" />
  Client command:
  <pre><code>cd webhooks-proxy-tunnel/client
npm start -- ${origin}/connect/${tunnelId} <span id="target-span">http://localhost:3000</span>
</code></pre>
  Connecting a new client kicks out the currently connected one.
</p>
<p>Force <a href="/close/${tunnelId}">close</a> the tunnel if the connected client got stuck.</p>
</main>
<script>
const targetInput = document.getElementById("target-input");
const targetSpan = document.getElementById("target-span");
targetInput.addEventListener("input", (event) => {
  console.log("target input changed", event);
  const value = event.target.value;
  targetSpan.firstChild.nodeValue = value;
})
</script>
</body>
</html>`;
}
