import type {
  RequestMessage,
  ResponseMessage,
} from "../../types/protocol";

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
  const message: RequestMessage = JSON.parse(event.data);
  if (message.type === "request") {
    console.log("got request", message.request.url);
    // As the client code is the easies to test and debug, we will
    // handle all the edge cases with transporting the request
    // and response objects here (e.g. keep-alive, gzip, etc.)
    const url = new URL(message.request.url);
    const response = await fetch(`${targetURL}${url.pathname}`, {
      method: message.request.method,
      headers: new Headers(message.request.headers),
      body: message.request.body
        ? Buffer.from(message.request.body, "base64")
        : undefined,
    });
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
    const responseMessage: ResponseMessage = {
      type: "response",
      response: responseSerializable,
    };
    socket.send(JSON.stringify(responseMessage));
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
