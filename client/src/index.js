// Creates a new WebSocket connection to the specified URL.
const socket = new WebSocket("ws://localhost:8787/tunnel");

// Executes when the connection is successfully established.
socket.addEventListener("open", (event) => {
  console.log("Connected.", event);
  // Sends a message to the WebSocket server.
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
    const response = await fetch("http://localhost:3000");
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
