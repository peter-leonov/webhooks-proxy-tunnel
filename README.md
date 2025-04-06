# Webhooks Proxy Tunnel

It is a really simple project. Essentially, it is an HTTP server (Worker) + simple pub/sub (Durable Object) + straightforward tunnel (WebSocket) + trivial tunnel client (Node.JS client).

The main limitation is that it does not stream neither the request nor the response. This means that the whole request and response body data has to fit in memory (and likely be under ~100MB to fit into CF workers memory limitations).

## How to use

Create a [Cloudflare account](https://www.cloudflare.com/) on the Free plan, or if you plan to test thousands of tunnels try the [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) plan.

[Install](https://nodejs.org/en/download) Node.js. Tested on `v22.14.0`.

Clone the repo:

```bash
git clone https://github.com/peter-leonov/webhooks-proxy-tunnel.git
cd webhooks-proxy-tunnel
# this step might ask you to log in
( cd worker && npm i && npm run deploy )
```

Then open the URL from the deploment output and follow the instructions.

## Monorepo layout

The monorepo is:

- the CF [worker](./worker#readme) that does most of the work
- the [client](./client#readme) that replays the requests
- the demo [server](./server#readme) so you don't bother the AI to create one
