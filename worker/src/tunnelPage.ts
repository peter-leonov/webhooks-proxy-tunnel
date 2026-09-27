import { TUNNEL_PROXY_PROTOCOL } from "../../shared/constants";
import { setSecretAside } from "./setSecretAside";
import { Stats } from "./types";

export function tunnelPage(
  origin: string,
  tunnelId: string,
  stats: Stats,
  isSecretSet: boolean,
): string {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Webhooks Proxy Tunnel / ${tunnelId}</title>
  <link rel="stylesheet" href="/pico.min.css">
</head>
<body>
<main class="container">
<h1>Tunnel ${tunnelId}</h1>
${isSecretSet ? "" : setSecretAside()}
<p>This tunnel proxies HTTP requests made to a public URL to your project local web server.</p>
<h2>Connect</h2>
<p>
  Enter the local server URL: <input type="text" autofocus value="http://localhost:3000" id="target-input" />
</p>
<p>
  Start the tunnel locally on your machine (or container):
  <pre><code>(cd client && npm start -- ${origin}/connect/${tunnelId} <span class="target-span">http://localhost:3000</span>)
</code></pre>
</p>
<p>
Use this public URL in the third party app that is going to send webhook requests to your local server:
<pre><code>${origin}/proxy/${tunnelId}</code></pre>
</p>
<p>
For example like this:
<pre><code>curl -i ${origin}/proxy/${tunnelId}</code></pre>
</p>
<p>
The connection now looks like this:
<pre><code>${origin}/proxy/${tunnelId} → <span class="target-span">http://localhost:3000</span></code></pre>
</p>
<h2>Inspect in the browser</h2>
<p>
  To see what a third party sends without running a local server, connect this browser as the tunnel client instead.
  Every request to the public URL is then logged to the DevTools console of this tab and answered with <code>200 OK</code>.
  Nothing is stored: the requests only live in this tab until you close it.
</p>
<form id="inspect-form">
  ${
    isSecretSet
      ? `<input type="password" id="inspect-secret" placeholder="WEBHOOKS_PROXY_TUNNEL_SECRET" autocomplete="off" required />
  <small>The secret stays in this tab. It is only used to sign the connection, the same way the tunnel client does.</small>`
      : ""
  }
  <button type="submit" id="inspect-connect">Connect this browser</button>
  <button type="button" id="inspect-test" class="secondary">Send a test request</button>
</form>
<p id="inspect-status"></p>
<h2>Stats</h2>
<p><small><small>(refresh the page to update)</small></small></p>
<p>Connected: ${stats.isConnected ? `yes (force <a href="/close/${tunnelId}">close</a>)` : "no"}</p>
<p>Requests: ${stats.requests}</p>
<p>
  Connecting a new client kicks out the currently connected one.
  This is by design as the idea is to proxy all the requests to a single developer machine without any round-robin or load balancing. If you need more tunnels just <a href="/">create a new one</a>!
</p>
</main>
<script>
const targetInput = document.getElementById("target-input");
const targetURL = localStorage.getItem("targetURL");
if (targetURL) {
  targetInput.value = targetURL;
}
function updateUI() {
  const value = targetInput.value;
  localStorage.setItem("targetURL", value);
  const targetSpans = document.querySelectorAll(".target-span");
  targetSpans.forEach((node) => {
    node.innerText = value;
  });
}
targetInput.addEventListener("input", updateUI)
updateUI()
</script>
<script
  src="/inspect.js"
  data-connect-url="${origin}/connect/${tunnelId}"
  data-proxy-url="${origin}/proxy/${tunnelId}"
  data-tunnel-id="${tunnelId}"
  data-protocol="${TUNNEL_PROXY_PROTOCOL}"
></script>
</body>
</html>`;
}
