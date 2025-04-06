# Client

The client that replays the requests and returns the responses to the target server.

## Usage

```bash
node src/client.js <tunnelURL> <targetURL>
```

Example:

```bash
node src/client.js https://webhooks-proxy-tunnel.YOUR_ORG.workers.dev/tunnel http://localhost:3000
```

## Dev mode

```bash
npm start
```
