import { Stats } from "./types";

export function tunnelPage(
  origin: string,
  tunnelId: string,
  stats: Stats,
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
<p>This tunnel proxies HTTP requests made to a public URL to your project local web server.</p>
<h2>Connect</h2>
<p>
  Enter the local server URL: <input type="text" autofocus value="http://localhost:3000" id="target-input" />
</p>
<p>
  Start the tunnel locally on your machine (or container):
  <pre><code>cd webhooks-proxy-tunnel/client
npm start -- ${origin}/connect/${tunnelId} <span class="target-span">http://localhost:3000</span>
</code></pre>
</p>
<p>
Use this public URL in the third party app that is going to send webhook requests to your local server:
<pre><code>${origin}/proxy/${tunnelId}</code></pre>
</p>
<p>
For example like this:
<pre><code>curl ${origin}/proxy/${tunnelId}</code></pre>
</p>
<p>
The connection now looks like this:
<pre><code>${origin}/proxy/${tunnelId} → <span class="target-span">http://localhost:3000</span></code></pre>
</p>
<h2>Stats</h2>
<p><small><small>(refresh the page to update)</small></small></p>
<p>Connected: ${stats.isConnected ? `yes (force <a href="/close/${tunnelId}">close</a>)` : "no"}</p>
<p>Requests: ${stats.requests}</p>
<p>
  Connecting a new client kicks out the currently connected one.
  It is by design as the idea is to proxy all the requests to a single developer machine without any round-robin or load balancing. <a href="/">Create new tunnel</a>.
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
</body>
</html>`;
}
