# Worker

To deploy this worker you need to register at Cloudflare. The Free plan should be enough to deploy and test it for a small team, otherwise get a [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) plan.

```bash
npm run cf-typegen
npm start
npm run deploy
```

Play with the protocol using [wscat](https://github.com/websockets/wscat).

## How to use

Create a [Cloudflare account](https://www.cloudflare.com/) on the Free plan, or if you plan to test thousands of tunnels try the [Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) plan.

[Install Node.js](https://nodejs.org/en/download). Tested on `v22.14.0`.

Clone the repo:

```bash
git clone https://github.com/peter-leonov/webhooks-proxy-tunnel.git
cd webhooks-proxy-tunnel
# this step might ask you to log in
( cd worker && npm i && npm run deploy )
```

Then open the URL that the deploment gave you and follow the instructions.
