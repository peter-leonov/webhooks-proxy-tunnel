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
  <style>
    #inspector {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 1.25rem;
      align-items: start;
    }
    @media (max-width: 800px) { #inspector { grid-template-columns: 1fr; } }

    #log-panel {
      border: 1px solid var(--pico-muted-border-color, #ddd);
      border-radius: 0.375rem;
      overflow: hidden;
      max-height: 520px;
      overflow-y: auto;
    }
    .req-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.65rem;
      border-bottom: 1px solid var(--pico-muted-border-color, #eee);
      cursor: pointer;
    }
    .req-row:last-child { border-bottom: none; }
    .req-row:hover { background: var(--pico-primary-background, rgba(0,0,0,0.04)); }
    .req-row.active { background: var(--pico-primary-focus, rgba(37,99,235,0.1)); }
    .r-method { font-size: 0.72em; font-weight: 700; font-family: monospace; min-width: 3.2rem; }
    .r-path { flex: 1; font-size: 0.78em; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r-status { font-size: 0.78em; font-weight: 600; min-width: 2.2rem; text-align: right; }
    .r-time { font-size: 0.68em; color: var(--pico-muted-color, #888); min-width: 2.8rem; text-align: right; }
    .r-replay-badge { font-size: 0.6em; padding: 0.05em 0.3em; border-radius: 0.2rem; background: var(--pico-secondary-background, #e9e9e9); }
    .r-acts { display: flex; gap: 0.2rem; }
    .r-acts button { padding: 0.1rem 0.35rem; font-size: 0.72em; margin: 0; height: auto; min-height: unset; line-height: 1.4; }

    .s2xx { color: #2da54e; }
    .s4xx { color: #d97706; }
    .s5xx { color: #dc2626; }
    .serr { color: #dc2626; }
    .spend { color: var(--pico-muted-color, #888); }

    #detail-panel { min-height: 160px; }
    .det-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem; }
    .det-url { font-size: 0.72em; color: var(--pico-muted-color, #888); word-break: break-all; margin-bottom: 0.5rem; }
    .det-err { color: #dc2626; font-size: 0.82em; margin: 0.25rem 0; }
    .det-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem; }
    @media (max-width: 600px) { .det-cols { grid-template-columns: 1fr; } }
    .det-col h5 { font-size: 0.85em; margin: 0 0 0.25rem; }
    .det-col pre {
      margin: 0.35rem 0 0;
      padding: 0.5rem;
      border-radius: 0.25rem;
      background: var(--pico-code-background-color, #f5f5f5);
      font-size: 0.73em;
      overflow: auto;
      max-height: 160px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .hdr-tbl { font-size: 0.73em; font-family: monospace; width: 100%; border-collapse: collapse; }
    .hdr-tbl td { padding: 0.1rem 0.2rem; word-break: break-all; vertical-align: top; }
    .hdr-tbl td:first-child { color: var(--pico-muted-color, #888); white-space: nowrap; padding-right: 0.5rem; }
    .det-btns { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .det-btns button { margin: 0; }

    #status-bar { display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    #status-bar .sp { flex: 1; }
    #status-bar button { margin: 0; }
    .conn-dot { font-size: 1.1em; line-height: 1; }

    dialog article { max-width: 560px; }
    dialog h3 { margin: 0 0 1rem; }
    .ed-grid2 { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 0.75rem; align-items: center; margin-bottom: 0.75rem; }
    .ed-grid2 label, .ed-grid2 select, .ed-grid2 input { margin: 0; }
    #hdr-editor { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.5rem; }
    .hdr-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.4rem; align-items: center; }
    .hdr-row input { margin: 0; min-width: 0; }
    .hdr-row button { margin: 0; padding: 0.2rem 0.45rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
    .modal-footer button { margin: 0; }
  </style>
</head>
<body>
<main class="container">

<h1>Tunnel ${tunnelId}</h1>
${isSecretSet ? "" : setSecretAside()}

<p>This tunnel proxies HTTP requests made to a public URL to your project local web server.</p>

<h2>Connect</h2>
<p>
  Enter the local server URL: <input type="text" autofocus value="http://localhost:3000" id="target-input" style="display:inline-block;width:auto" />
</p>
<p>
  Start the tunnel locally on your machine (or container):
  <pre><code>(cd client &amp;&amp; npm start -- ${origin}/connect/${tunnelId} <span class="target-span">http://localhost:3000</span>)</code></pre>
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
  <pre><code>${origin}/proxy/${tunnelId} &rarr; <span class="target-span">http://localhost:3000</span></code></pre>
</p>
<p>
  Connecting a new client kicks out the currently connected one.
  This is by design as the idea is to proxy all the requests to a single developer machine without any round-robin or load balancing. If you need more tunnels just <a href="/">create a new one</a>!
</p>

<h2>HTTP Inspector</h2>
<p><small><small>(updates automatically every 5 seconds)</small></small></p>

<div id="status-bar">
  <span class="conn-dot" id="conn-dot">&#9679;</span>
  <span id="conn-label">Loading&hellip;</span>
  <span class="sp"></span>
  <button class="outline secondary" onclick="clearLog()">Clear all</button>
  <button onclick="openNewRequest()">+ New request</button>
</div>

<div id="inspector">
  <div id="log-panel">
    <p style="padding:1rem;color:var(--pico-muted-color,#888);margin:0">Waiting for requests&hellip;</p>
  </div>
  <div id="detail-panel">
    <p style="color:var(--pico-muted-color,#888)">Select a request to view its details.</p>
  </div>
</div>

<dialog id="edit-modal">
  <article>
    <h3 id="modal-title">Edit &amp; replay</h3>
    <form id="edit-form" onsubmit="submitEdit(event)">
      <div class="ed-grid2">
        <label for="edit-method" style="white-space:nowrap">Method</label>
        <select id="edit-method">
          <option>GET</option><option>POST</option><option>PUT</option>
          <option>PATCH</option><option>DELETE</option><option>HEAD</option><option>OPTIONS</option>
        </select>
      </div>
      <label for="edit-url">
        Path
        <small style="font-weight:normal;color:var(--pico-muted-color,#888)">
          &mdash; relative to tunnel (e.g. <code>/api/webhook</code>)
        </small>
      </label>
      <input type="text" id="edit-url" placeholder="/api/webhook" required />
      <fieldset style="margin-top:0.75rem">
        <legend>Headers</legend>
        <div id="hdr-editor"></div>
        <button type="button" class="outline secondary" style="margin-top:0.25rem" onclick="addHeaderRow()">+ Add header</button>
      </fieldset>
      <label for="edit-body" style="margin-top:0.75rem;display:block">Body</label>
      <textarea id="edit-body" rows="5" placeholder='{"key": "value"}'></textarea>
      <div class="modal-footer">
        <button type="button" class="secondary outline" onclick="closeModal()">Cancel</button>
        <button type="submit" id="modal-submit-btn">Send</button>
      </div>
    </form>
  </article>
</dialog>

</main>
<script>
var TUNNEL_ID = "${tunnelId}";
var ORIGIN = "${origin}";
var API = "/api/" + TUNNEL_ID;

var log = [];
var selectedId = null;
var isConnected = false;
var busy = false;

function hexToText(hex) {
  if (!hex) return "";
  try {
    var bytes = new Uint8Array(hex.match(/.{2}/g).map(function(b) { return parseInt(b, 16); }));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch(e) { return null; }
}

function textToHex(text) {
  var bytes = new TextEncoder().encode(text);
  return Array.from(bytes, function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}

function formatBody(hex) {
  var text = hexToText(hex);
  if (text === null) return "[binary data \u2013 " + (hex.length >> 1) + " bytes]";
  if (!text) return "";
  try { return JSON.stringify(JSON.parse(text), null, 2); } catch(e) { return text; }
}

function pathOf(url) {
  try {
    var u = new URL(url);
    var p = u.pathname.replace(/^\\/proxy\\/[0-9a-f-]{36}/, "") || "/";
    return p + u.search;
  } catch(e) { return url; }
}

function fmtTime(ts) { return new Date(ts).toLocaleTimeString(); }

var METHOD_COLORS = {
  GET: "#61affe", POST: "#49cc90", PUT: "#fca130",
  DELETE: "#f93e3e", PATCH: "#50e3c2", HEAD: "#9012fe", OPTIONS: "#0d5aa7"
};
function methodColor(m) { return METHOD_COLORS[m] || "#aaa"; }

function statusCls(entry) {
  if (!entry.response) return entry.error ? "serr" : "spend";
  var s = entry.response.status;
  return s >= 500 ? "s5xx" : s >= 400 ? "s4xx" : "s2xx";
}
function statusLabel(entry) {
  if (!entry.response) return entry.error ? "ERR" : "\u2026";
  return entry.response.status;
}

function esc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderStatus() {
  var dot = document.getElementById("conn-dot");
  var lbl = document.getElementById("conn-label");
  dot.style.color = isConnected ? "#2da54e" : "#dc2626";
  if (isConnected) {
    lbl.innerHTML = "Connected (force <a href=\\"/close/" + TUNNEL_ID + "\\">close</a>)";
  } else {
    lbl.textContent = "Disconnected";
  }
}

function renderLog() {
  var panel = document.getElementById("log-panel");
  if (!log.length) {
    panel.innerHTML = '<p style="padding:1rem;color:var(--pico-muted-color,#888);margin:0">Waiting for requests\u2026</p>';
    return;
  }
  var html = "";
  for (var i = 0; i < log.length; i++) {
    var e = log[i];
    var active = selectedId === e.id ? " active" : "";
    var replayBadge = e.isReplay ? '<span class="r-replay-badge">replay</span>' : "";
    html += '<div class="req-row' + active + '" onclick="selectEntry(\\'' + e.id + '\\')" title="' + esc(e.request.url) + '">'
      + '<span class="r-method" style="color:' + methodColor(e.request.method) + '">' + esc(e.request.method) + '</span>'
      + '<span class="r-path">' + esc(pathOf(e.request.url)) + '</span>'
      + '<span class="r-status ' + statusCls(e) + '">' + statusLabel(e) + '</span>'
      + '<span class="r-time">' + fmtTime(e.timestamp) + '</span>'
      + replayBadge
      + '<span class="r-acts" onclick="event.stopPropagation()">'
      + '<button class="outline secondary" title="Replay" onclick="doReplay(\\'' + e.id + '\\')">&#8635;</button>'
      + '<button class="outline" title="Edit &amp; replay" onclick="editEntry(\\'' + e.id + '\\')">&#9998;</button>'
      + '</span>'
      + '</div>';
  }
  panel.innerHTML = html;
}

function renderHeaders(hdrs) {
  if (!hdrs || !hdrs.length) return '<small><em>None</em></small>';
  var rows = "";
  for (var i = 0; i < hdrs.length; i++) {
    rows += '<tr><td>' + esc(hdrs[i][0]) + '</td><td>' + esc(hdrs[i][1]) + '</td></tr>';
  }
  return '<table class="hdr-tbl"><tbody>' + rows + '</tbody></table>';
}

function renderDetail(entry) {
  var panel = document.getElementById("detail-panel");
  var reqBody = formatBody(entry.request.body);
  var resBody = entry.response ? formatBody(entry.response.body) : null;
  var scls = statusCls(entry);
  var statusBadge = entry.response
    ? '<span class="' + scls + '" style="margin-left:auto;font-weight:700">'
      + entry.response.status + " " + esc(entry.response.statusText) + '</span>'
    : "";
  var replayBadge = entry.isReplay ? '<span class="r-replay-badge">replay</span>' : "";
  var resContent;
  if (entry.response) {
    resContent = renderHeaders(entry.response.headers)
      + (resBody ? '<pre>' + esc(resBody) + '</pre>' : '<p style="margin:0"><small><em>No body</em></small></p>');
  } else if (entry.error) {
    resContent = '<p style="color:#dc2626"><small><em>No response received</em></small></p>';
  } else {
    resContent = '<p style="color:var(--pico-muted-color,#888)"><small><em>Pending\u2026</em></small></p>';
  }
  var errHtml = (entry.error && !entry.response)
    ? '<p class="det-err">Error: ' + esc(entry.error) + '</p>' : "";

  panel.innerHTML =
    '<div class="det-header">'
    + '<strong style="color:' + methodColor(entry.request.method) + '">' + esc(entry.request.method) + '</strong>'
    + '<code style="font-size:0.85em">' + esc(pathOf(entry.request.url)) + '</code>'
    + replayBadge + statusBadge
    + '</div>'
    + '<div class="det-url">' + esc(entry.request.url) + '</div>'
    + errHtml
    + '<div class="det-cols">'
    + '<div class="det-col"><h5>Request</h5>'
    + renderHeaders(entry.request.headers)
    + (reqBody ? '<pre>' + esc(reqBody) + '</pre>' : '<p style="margin:0"><small><em>No body</em></small></p>')
    + '</div>'
    + '<div class="det-col"><h5>Response</h5>' + resContent + '</div>'
    + '</div>'
    + '<div class="det-btns">'
    + '<button class="outline secondary" onclick="doReplay(\\'' + entry.id + '\\')" ' + (busy ? "disabled" : "") + '>&#8635; Replay</button>'
    + '<button onclick="editEntry(\\'' + entry.id + '\\')" ' + (busy ? "disabled" : "") + '>&#9998; Edit &amp; replay</button>'
    + '</div>';
}

function selectEntry(id) {
  selectedId = id;
  renderLog();
  var entry = log.find(function(e) { return e.id === id; });
  if (entry) renderDetail(entry);
}

function doReplay(id) {
  var entry = log.find(function(e) { return e.id === id; });
  if (!entry || busy) return;
  setBusy(true);
  fetch(API + "/replay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: entry.request.method, url: entry.request.url, headers: entry.request.headers, body: entry.request.body })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) { return poll().then(function() { if (data.id) selectEntry(data.id); }); })
  .catch(function(e) { console.error("replay error", e); })
  .finally(function() { setBusy(false); });
}

function editEntry(id) {
  var entry = log.find(function(e) { return e.id === id; });
  if (entry) openModal(entry);
}

function openNewRequest() { openModal(null); }

function openModal(entry) {
  document.getElementById("modal-title").textContent = entry ? "Edit & replay" : "New request";
  document.getElementById("edit-method").value = entry ? entry.request.method : "POST";
  document.getElementById("edit-url").value = entry ? pathOf(entry.request.url) : "/";
  document.getElementById("edit-body").value = (entry && entry.request.body) ? (hexToText(entry.request.body) || "") : "";
  var ed = document.getElementById("hdr-editor");
  ed.innerHTML = "";
  var hdrs = (entry && entry.request.headers) || [];
  for (var i = 0; i < hdrs.length; i++) addHeaderRow(hdrs[i][0], hdrs[i][1]);
  document.getElementById("edit-modal").showModal();
}

function closeModal() { document.getElementById("edit-modal").close(); }

function addHeaderRow(key, value) {
  var ed = document.getElementById("hdr-editor");
  var row = document.createElement("div");
  row.className = "hdr-row";
  row.innerHTML = '<input type="text" placeholder="Name" value="' + esc(key || "") + '" />'
    + '<input type="text" placeholder="Value" value="' + esc(value || "") + '" />'
    + '<button type="button" class="outline secondary" onclick="this.parentElement.remove()">&times;</button>';
  ed.appendChild(row);
}

function submitEdit(event) {
  event.preventDefault();
  var method = document.getElementById("edit-method").value;
  var path = document.getElementById("edit-url").value;
  var bodyText = document.getElementById("edit-body").value.trim();
  var rows = document.querySelectorAll("#hdr-editor .hdr-row");
  var headers = [];
  rows.forEach(function(row) {
    var inputs = row.querySelectorAll("input");
    var k = inputs[0].value.trim(), v = inputs[1].value.trim();
    if (k) headers.push([k, v]);
  });
  var url = ORIGIN + "/proxy/" + TUNNEL_ID + (path.startsWith("/") ? path : "/" + path);
  closeModal();
  setBusy(true);
  fetch(API + "/replay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: method, url: url, headers: headers, body: bodyText ? textToHex(bodyText) : undefined })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) { return poll().then(function() { if (data.id) selectEntry(data.id); }); })
  .catch(function(e) { console.error("replay error", e); })
  .finally(function() { setBusy(false); });
}

function clearLog() {
  log = []; selectedId = null;
  renderLog();
  document.getElementById("detail-panel").innerHTML = '<p style="color:var(--pico-muted-color,#888)">Select a request to view its details.</p>';
  fetch(API + "/log/clear", { method: "POST" });
}

function setBusy(val) {
  busy = val;
  document.querySelectorAll("#inspector button, #modal-submit-btn").forEach(function(b) { b.disabled = val; });
}

function poll() {
  return fetch(API + "/log")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      isConnected = data.isConnected;
      log = data.log;
      renderStatus();
      renderLog();
      if (selectedId) {
        var entry = log.find(function(e) { return e.id === selectedId; });
        if (entry) renderDetail(entry);
      }
    })
    .catch(function(e) { console.warn("poll failed", e); });
}

setInterval(poll, 5000);
poll();

var targetInput = document.getElementById("target-input");
var savedTarget = localStorage.getItem("targetURL");
if (savedTarget) targetInput.value = savedTarget;
function updateTarget() {
  var value = targetInput.value;
  localStorage.setItem("targetURL", value);
  document.querySelectorAll(".target-span").forEach(function(n) { n.innerText = value; });
}
targetInput.addEventListener("input", updateTarget);
updateTarget();
</script>
</body>
</html>`;
}
