# Webhooks Proxy Tunnel

An HTTP tunnel designed to be self hosted for free in minutes.

```console
┌───────────┐     ┌─────────────────┐                       ┌────────────────┐
│ JIRA      │     │ Public endpoint │                       │ Local HTTP     │
│ GitHub    │     │ at Cloudflare:  │     ┌───────────┐     │ dev server:    │
│ GitLab    │◄───►│                 │◄───►│ WebSocket │◄───►│                │
│ Slack     │     │ *.workers.dev   │     └───────────┘     │ localhost:3000 │
│ etc...    │     │                 │                       │                │
└───────────┘     └─────────────────┘                       └────────────────┘
```

Webhooks Proxy Tunnel exposes a local HTTP endpoint to the public Internet. It works by reverse proxying HTTP requests through a Cloudflare worker over a WebSocket into your local machine's HTTP server.

## How to use

It takes just under 10 minutes to set up.

1. (5 mins) Create a [Cloudflare account](https://www.cloudflare.com/) with the default free plan. You can always upgrade later to the [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) plan if you're going to test thousands of tunnels in parallel.

1. (1 min) [Install](https://nodejs.org/en/download) Node.js. Tested on `v22.14.0`.

1. (15 sec) Clone the repo:

    ```bash
    git clone https://github.com/peter-leonov/webhooks-proxy-tunnel.git
    ```

1. (45 sec) Deploy the worker:

    ```bash
    cd webhooks-proxy-tunnel
    # this step will ask you to log into your Cloudflare account
    ( cd worker && npm i && npm run deploy )
    ```

1. (2 min) Then open the `https://webhooks-proxy-tunnel.YOUR_ACCOUND.workers.dev` link from the console output above and follow the instructions there.

## About

This tunneling solution is free. It's expected that you self host it on your Cloudflare Free plan. It should take under 10 minutes to deploy the whole thing from scratch and will cost you nothing, require no EULA agreement, no fine text attached, no data protection issues. Just your laptop and your trusty Cloudfare account.

Also, it is a really simple project, should take no longer than 30 mins to audit all the code. It is basically an HTTP server (the Worker) + a simple 1:1 pub/sub bus (the Durable Object) + a straightforward tunnel (over a WebSocket over HTTPS) + trivial tunnel client (Node.JS client).

The main limitation so far is that it does not stream neither the request nor the response. This means that the whole request body data has to fit in memory (and likely be under ~100MB to fit into CF workers memory limitations). Same for the response body. It does support posting binary data though (for both the requests and responses).

It does support multiple parallel tunnels with unique IDs.

Should you need to fine tune the requests that the tunnel client makes, please, inspect the `client/src/index.ts` source code on your own as the client is not a fully featured CLI yet. It's about 50 lines of simple Node.js HTTP code. Also, pull requests are welcome!

## Monorepo layout

The monorepo is:

* the CF [worker](./worker#readme) that does most of the work
* the [client](./client#readme) that forwards the requests from the tunnel locally
* extra: a demo HTTP [server](./server#readme) that echoes requests back (so you don't spend AI tokens creating one)

## TODO

* If this project grows any big try using the lazy websocket API that allows the DOs to hibernate to even further reduce potential costs.

## Prior art

* of course, the first and special to the nginx community [ngrok](https://ngrok.com)
* a nice and free [smee.io](https://smee.io)

## Contributing

Feel free to create a PR with any extension you find worthy a PR.

<!-- https://deploy.workers.cloudflare.com/?url=https://github.com/peter-leonov/webhooks-proxy-tunnel/tree/main/worker -->
