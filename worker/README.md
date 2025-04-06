# Webhooks Proxy Tunnel

It is a really simple toy project. Essentially it is an HTTP server (Worker) + simple pub/sub (Durable Object) + trivial HTTP tunnel (Node.JS client).

Using multiple DOs it should be trivial to make multiple tunnels routed in parallel.

```bash
npm run cf-typegen
npm start
npm run deploy
```
