# Worker

## Deploy

To deploy this worker you need to register at Cloudflare. The Free plan should be enough to deploy and test it for a small team, otherwise get a [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) plan.

```bash
npm i
npm run generate-secret
npm run deploy
```

## Develop

```bash
npm i
npm run cf-typegen
npm start
npm run deploy
```

Play with the protocol using [wscat](https://github.com/websockets/wscat).
