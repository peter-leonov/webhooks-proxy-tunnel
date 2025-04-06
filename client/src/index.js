const [, , tunnelURL, targetURL] = process.argv;

function usage() {
  console.error("Usage:");
  console.error("  node src/client.js <tunnelURL> <targetURL>");
  console.error();
  console.error("Example:");
  console.error(
    "  node src/client.js https://webhooks-proxy-tunnel.YOUR_ORG.workers.dev/tunnel http://localhost:3000"
  );
}

if (!tunnelURL) {
  console.error("Please provide a tunnel URL.");
  console.error();
  usage();
  process.exit(1);
}
if (!targetURL) {
  console.error("Please provide a target URL.");
  console.error();
  usage();
  process.exit(1);
}

const socket = new WebSocket(tunnelURL);

// Executes when the connection is successfully established.
socket.addEventListener("open", (event) => {
  console.log(
    `proxying requests from tunnel ${tunnelURL} to target ${targetURL}`
  );
});

socket.addEventListener("message", async (event) => {
  console.debug("event.data", event.data);
  const message = JSON.parse(event.data);
  if (message.type === "ping") {
    socket.send(JSON.stringify({ type: "pong" }));
  } else if (message.type === "request") {
    // As the client code is the easies to test and debug, we will
    // handle all the edge cases with transporting the request
    // and response objects here (e.g. keep-alive, gzip, etc.)
    console.debug("start fetch", event.data);
    const url = new URL(message.request.url);
    const response = await fetch(`${targetURL}${url.pathname}`);
    let body;
    if (response.body) {
      body = Buffer.from(await response.bytes()).toString("base64");
    }

    const responseSerializable = {
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers.entries()],
      body,
    };
    socket.send(
      JSON.stringify({
        type: "response",
        response: responseSerializable,
      })
    );
  } else {
    console.error("Unknown message type:", message.type);
  }
});

// Executes when the connection is closed, providing the close code and reason.
socket.addEventListener("close", (event) => {
  console.log("Connection closed:", event.code, event.reason);
});

// Executes if an error occurs during the WebSocket communication.
socket.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
});
