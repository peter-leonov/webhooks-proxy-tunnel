# Client

The client that replays the requests and returns the responses to the target server.

It's a single (+a tiny bit of code shared with worker) TypeScript file natively runnable with Node.js.

## Usage

```bash
npm start -- <TUNNEL_URL> <TARGET_URL>
```

Example:

```bash
npm start -- https://webhooks-proxy-tunnel.acme.workers.dev/tunnel http://localhost:3000
```

## Dev mode

```bash
npm run dev -- <TUNNEL_URL> <TARGET_URL>
```
