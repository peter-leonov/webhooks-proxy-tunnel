import { setSecretAside } from "./setSecretAside";

type Params = {
  isSecretSet: boolean;
};

export function homePage({ isSecretSet }: Params): string {
  const uuid = crypto.randomUUID();
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Webhooks Proxy Tunnel</title>
  <link rel="stylesheet" href="/pico.min.css">
</head>
<body>
<main class="container">
<h1>Webhooks Proxy Tunnel <sup><small>(<a href="https://github.com/peter-leonov/webhooks-proxy-tunnel">GitHub</a>)</small></sup></h1>
${isSecretSet ? "" : setSecretAside()}
<p>This tool proxies HTTP requests made to a public URL to your project local web server.</p>
<p>Start by clicking on the link to a fresh new unique tunnel: <a href="/tunnel/${uuid}">${uuid}</a>.</p>
<p>Refresh the page for a new tunnel ID. There can be multiple tunnels used on a single deployment, it only depends on your Cloudflare plan limits.</p>
</body>
</html>`;
}
