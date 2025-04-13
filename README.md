# Webhooks Proxy Tunnel

```console
┌───────────┐       ┌────────────────┐      ┌────────────────┐
│ JIRA      │       │Public endpoint │      │Local dev       │
│ GitHub    │       │at Cloudflare:  │      │server:         │
│ GitLab    │──────►│                │─────►│                │
│ Slack     │       │ *.workers.dev  │      │ localhost:3000 │
│ etc...    │       │                │      │                │
└───────────┘       └────────────────┘      └────────────────┘
```

A tool to expose a local HTTP endpoint to the public Internet. Works by reverse proxying HTTP requests through a Cloudflare worker over a WebSocket into your local machine.

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

1. Then open the `*.worker.dev` URL from the deployment output and follow the instructions there (last 30 seconds).

## About

This tunneling solution is free. It's expected that you self host it on your Cloudflare Free plan. It usually take about 10 minutes to deploy the whole thing from scratch and will cost you nothing, require no EULA agreement, no fine text attached, no data protection issues. Just your laptop and your trusty Cloudfare account.

Also, it is a really simple project, should take no longer than 30 mins to audit all the code. It is basically an HTTP server (the Worker) + a simple 1:1 pub/sub bus (the Durable Object) + a straightforward tunnel (over a WebSocket over HTTPS) + trivial tunnel client (Node.JS client).

The main limitation so far is that it does not stream neither the request nor the response. This means that the whole request body data has to fit in memory (and likely be under ~100MB to fit into CF workers memory limitations). Same for the response body. It does support posting binary data though (for both the requests and responses).

It does support multiple parallel tunnels with unique IDs.

Should you need to fine tune the requests that the tunnel client makes, please, inspect the `client/src/index.ts` source code on your own for now as the client is not yet a CLI. It's like 50 lines of trivial HTTP code. Pull requests are welcome!

## Monorepo layout

The monorepo is:

* the CF [worker](./worker#readme) that does most of the work
* the [client](./client#readme) that replays the requests
* the demo echo HTTP [server](./server#readme) so you don't bother the AI to create one

## TODO

* If this project grows any big try using the lazy websocket API that allows the DOs to hibernate to even further reduce potential costs.

## Prior art

* of course, the first and special [ngrok](https://ngrok.com)
* a (relatively) new [smee.io](https://smee.io)

## Contributing

Feel free to create a PR with any extension you find worthy a PR.
