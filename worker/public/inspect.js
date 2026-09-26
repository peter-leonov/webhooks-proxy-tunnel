// A tunnel client that runs in the browser: instead of forwarding the
// requests to a local server it logs them to the DevTools console and
// answers them itself. Nothing is persisted anywhere.

const { connectUrl, tunnelId, protocol } = document.currentScript.dataset;

const form = document.getElementById("inspect-form");
const secretInput = document.getElementById("inspect-secret");
const connectButton = document.getElementById("inspect-connect");
const statusNode = document.getElementById("inspect-status");

const RESPONSE_BODY =
  "Received by the webhooks proxy tunnel browser inspector.\n";

let socket = null;
let opened = false;
let received = 0;

function setStatus(text) {
  statusNode.textContent = text;
}

// Mirrors `generateToken()` in shared/token.ts.
async function generateToken(secret) {
  const time = Math.floor(Date.now() / 1000 / 10);
  const data = new TextEncoder().encode(`${tunnelId}${secret}${time}`);
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function decodeBody(hex) {
  if (!hex) {
    return undefined;
  }
  const bytes = fromHex(hex);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return bytes;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function logRequest(request) {
  const url = new URL(request.url);
  // Strip the /proxy/<tunnel id> prefix, the same way the tunnel client does.
  const path = url.pathname.slice(`/proxy/${tunnelId}`.length) || "/";
  console.group(`${request.method} ${path}${url.search}`);
  console.log("url", request.url);
  console.log("headers", Object.fromEntries(request.headers));
  console.log("body", decodeBody(request.body));
  console.groupEnd();
}

function connect(token) {
  socket = new WebSocket(connectUrl.replace(/^http/, "ws"), [protocol, token]);

  socket.addEventListener("open", () => {
    opened = true;
    connectButton.textContent = "Disconnect";
    setStatus(
      "Connected. Requests to the public URL are logged to the DevTools console of this tab.",
    );
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type !== "request") {
      console.error("Unknown message type:", message.type);
      return;
    }
    logRequest(message.request);
    received++;
    setStatus(
      `Connected. ${received} request(s) logged to the DevTools console of this tab.`,
    );
    socket.send(
      JSON.stringify({
        type: "response",
        response: {
          status: 200,
          statusText: "OK",
          headers: [["content-type", "text/plain"]],
          body: toHex(new TextEncoder().encode(RESPONSE_BODY)),
        },
      }),
    );
  });

  socket.addEventListener("close", (event) => {
    socket = null;
    connectButton.textContent = "Connect this browser";
    if (!opened) {
      // Browsers do not expose why a WebSocket handshake was refused.
      setStatus(
        "Could not connect. Check the secret, and the Network tab for the refused request.",
      );
      return;
    }
    opened = false;
    setStatus(
      `Disconnected (${event.code}${event.reason ? `: ${event.reason}` : ""}).`,
    );
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (socket) {
    socket.close(1000, "browser inspector disconnected");
    return;
  }
  const token = secretInput
    ? await generateToken(secretInput.value.trim())
    : "no-secret";
  setStatus("Connecting…");
  connect(token);
});
