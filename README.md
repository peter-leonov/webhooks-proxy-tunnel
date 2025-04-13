# Webhooks Proxy Tunnel

A tool to expose a local HTTP endpoint to the public Internet. Works by reverse proxying HTTP requests through a Cloudflare worker into your local machine.

## How to use

It takes just 10 minutes: 5 mins to register a new Cloudflare account and 5 minutes to clone the repo and run the tunnel.

1. Create a [Cloudflare account](https://www.cloudflare.com/) with the default free plan. You can always upgrade later to the [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) plan if you're going to test thousands of tunnels in parallel.

1. [Install](https://nodejs.org/en/download) Node.js. Tested on `v22.14.0`.

1. Clone the repo:

    ```bash
    git clone https://github.com/peter-leonov/webhooks-proxy-tunnel.git
    ```

1. Then deploy the worker:

    ```bash
    cd webhooks-proxy-tunnel
    # this step might ask you to log into your Cloudflare account
    ( cd worker && npm i && npm run deploy )
    ```

1. Then open the `*.worker.dev` URL from the deploment output and follow the instructions there (last 30 seconds).

## Previous art

* of course, the first and special [ngrok](https://ngrok.com)
* a (relatively) new [smee.io](https://smee.io)

## About

It's free and expects you to self host it on Cloudflare Free plan. It usually take about 10 minutes to deploy from scratch and will cost you nothing, no EULA, no fine text, no data protection issues: just your laptop, your Cloudfare account and the Internet.

Also, it is a really simple project, should take no longer than 30 mins to inspect all the code. It is, essentially, an HTTP server (the Worker) + a simple 1:1 pub/sub bus (the Durable Object) + a straightforward tunnel (over a WebSocket over HTTPS) + trivial tunnel client (Node.JS client).

The main limitation is that it does not stream either the request nor the response. This means that the whole request and response body data has to fit in memory (and likely be under ~100MB to fit into CF workers memory limitations). It does support posting binary data though (for both the requests and responses).

It does support multiple parallel tunnels with unique IDs.

Should you need to fine tune the requests that the tunnel client (the terminator) please inspect the `client/src/index.ts` source code, it's like 50 lines of trivial HTTP code. Pull requests are welcome!

## Monorepo layout

The monorepo is:

* the CF [worker](./worker#readme) that does most of the work
* the [client](./client#readme) that replays the requests
* the demo [server](./server#readme) so you don't bother the AI to create one

## TODO

* If this project grows any big try using the lazy websocket API that allows the DOs to hibernate.

## Contributing

Feel free to create a PR with any extension you find worthy a PR.
