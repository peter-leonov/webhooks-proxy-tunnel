# Webhooks Proxy Tunnel

It is a really simple project. Essentially, it is an HTTP server (Worker) + simple pub/sub (Durable Object) + straightforward tunnel (WebSocket) + trivial tunnel client (Node.JS client).

The main limitation is that it does not stream neither the request nor the response. This means that the whole request and response body data has to fit in memory (and likely be under ~100MB to fit into CF workers memory limitations).

The monorepo is:

- the CF [worker](./worker) that does most of the work
- the [client](./client) that replays the requests
- the demo [server](./server) so you don't bother the AI to create one
