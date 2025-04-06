import { DurableObject } from "cloudflare:workers";

export class MyDurableObject extends DurableObject {
  // TODO: think of using a WeakMap
  proxyTo: WebSocket | null = null;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Has to be called `fetch()` otherwise CF errors out with some
   * JSON related error resulting in 500.
   */
  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Calling `accept()` tells the runtime that this WebSocket is to begin terminating
    // request within the Durable Object. It has the effect of "accepting" the connection,
    // and allowing the WebSocket to send and receive messages.
    server.accept();
    this.proxyTo?.close(4100, "New connection");
    this.proxyTo = server;

    server.addEventListener("message", (event: MessageEvent) => {
      console.log("Received message from client:", event.data);
      server.send(`[Durable Object] ${event.data}`);
    });

    server.addEventListener("close", (cls: CloseEvent) => {
      server.close(1001, "Server closed");
      console.log("Durable Object has closed WebSocket", server, cls.code);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async proxy(request: Request): Promise<Response> {
    if (!this.proxyTo) {
      return new Response("No proxy connection", { status: 502 });
    }

    this.proxyTo.send(`Proxying request: ${request.url}`);

    return new Response("Proxying request");
  }

  close() {
    this.proxyTo?.close(undefined, "Manually closed");
    this.proxyTo = null;
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
    if (url.pathname.startsWith("/tunnel/")) {
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
      stub.close();
      return new Response("Closed all tunnels");
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
