# Webhooks Proxy Tunnel

It is a really simple toy project. Essentially it is an HTTP server (Worker) + simple pub/sub (Durable Object) + trivial HTTP tunnel (Node.JS client).

It does not stream neither the request nor the response. This means that the whole request and response body data has to fit in memory (and likely be under ~100MB to fit into CF workers memory limitations).

Using multiple DOs it should be trivial to make multiple tunnels routed in parallel.

```bash
npm run cf-typegen
npm start
npm run deploy
```

Play with the protocol using [wscat](https://github.com/websockets/wscat).
