import { DurableObject } from "cloudflare:workers";

const RESPONSE_TIMEOUT = 30_000; // ms

export class MyDurableObject extends DurableObject {
  // TODO: think of using a WeakMap
  proxyTo: WebSocket | null = null;
  resolve: ((value: Response) => void) | null = null;
  reject: ((value: Error) => void) | null = null;
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
      this.message(event);
    });

    server.addEventListener("close", (cls: CloseEvent) => {
      console.info("closing connection", cls.code, cls.reason);
      server.close(1001, `server closed (${cls.code}: ${cls.reason})`);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async proxy(request: Request): Promise<Response> {
    console.info("proxying request", request.url);
    if (!this.proxyTo) {
      return new Response("no proxy connection", { status: 502 });
    }

    const requestSerializable = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    };

    this.proxyTo.send(
      JSON.stringify({
        type: "request",
        request: requestSerializable,
      }),
    );

    try {
      return await withTimeout(
        new Promise<Response>((resolve, reject) => {
          this.resolve = resolve;
          this.reject = reject;
        }),
        RESPONSE_TIMEOUT,
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

  message(event: MessageEvent): void {
    this.resolve?.(new Response(String(event.data)));
  }

  async close(): Promise<Response> {
    this.reject?.(new Error("Manually closed"));
    if (!this.proxyTo) {
      return new Response("No proxy connection");
    }
    this.proxyTo.close(4102, "manually closed");
    this.proxyTo = null;
    return new Response("Closed connection");
  }
}

const DO_ID = "foo";

export default {
  /**
   * This is the standard fetch handler for a Cloudflare Worker
   *
   * @param request - The request submitted to the Worker from the client
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   * @param ctx - The execution context of the Worker
   * @returns The response to be sent back to the client
   */
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname == "/tunnel") {
      // Expect to receive a WebSocket Upgrade request.
      // If there is one, accept the request and return a WebSocket Response.
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected `Upgrade: websocket`", {
          status: 426,
        });
      }

      // Create a `DurableObjectId` for an instance of the `MyDurableObject`
      // class named "foo". Requests from all Workers to the instance named
      // "foo" will go to a single globally unique Durable Object instance.
      const id = env.MY_DURABLE_OBJECT.idFromName(DO_ID);

      // Create a stub to open a communication channel with the Durable
      // Object instance.
      const stub = env.MY_DURABLE_OBJECT.get(id);

      return stub.fetch(request);
    } else if (url.pathname.startsWith("/proxy/")) {
      const id = env.MY_DURABLE_OBJECT.idFromName(DO_ID);

      // Create a stub to open a communication channel with the Durable
      // Object instance.
      const stub = env.MY_DURABLE_OBJECT.get(id);
      return stub.proxy(request);
    } else if (url.pathname.startsWith("/close")) {
      const id = env.MY_DURABLE_OBJECT.idFromName(DO_ID);

      // Create a stub to open a communication channel with the Durable
      // Object instance.
      const stub = env.MY_DURABLE_OBJECT.get(id);
      return stub.close();
    } else {
      return new Response(
        "Websocket endpoint is listenning on <code>/tunnel</code>",
        {
          headers: {
            "Content-Type": "text/html",
          },
        },
      );
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
