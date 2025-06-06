import type {
  RequestMessage,
  ResponseMessage,
} from "../../shared/protocol";
import { fromHex, toHex } from "../../shared/hex.ts";
import { TUNNEL_PROXY_PROTOCOL } from "../../shared/constants.ts";
import { generateToken, tokenFromParts } from "../../shared/token.ts";

const [, , tunnelURL, targetURL] = process.argv;

const WEBHOOKS_PROXY_TUNNEL_SECRET =
  process.env.WEBHOOKS_PROXY_TUNNEL_SECRET;

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

if (!WEBHOOKS_PROXY_TUNNEL_SECRET) {
  console.warn(
    "WEBHOOKS_PROXY_TUNNEL_SECRET is not set. Anyone can connect to the tunnel."
  );
  console.warn(
    "Please set the WEBHOOKS_PROXY_TUNNEL_SECRET by running `npm run set-secret` in the `./worker` directory."
  );
}

const { pathname } = new URL(tunnelURL);
const [, , tunnelId] = pathname.split("/");

const token = WEBHOOKS_PROXY_TUNNEL_SECRET
  ? await generateToken(tunnelId, WEBHOOKS_PROXY_TUNNEL_SECRET)
  : "<no-secret>";

const socket = new WebSocket(tunnelURL, [
  TUNNEL_PROXY_PROTOCOL,
  token,
]);

// Executes when the connection is successfully established.
socket.addEventListener("open", (event) => {
  console.log(
    `proxying requests from tunnel ${tunnelURL} to target ${targetURL}`
  );
});

socket.addEventListener("message", async (event) => {
  const message: RequestMessage = JSON.parse(event.data);
  if (message.type === "request") {
    // As the client code is the easies to test and debug, we will
    // handle all the edge cases with transporting the request
    // and response objects here (e.g. keep-alive, gzip, etc.)
    const headers = new Headers();
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    headers.delete("keep-alive");
    headers.delete("host");
    const url = new URL(message.request.url);
    const requestBody = message.request.body
      ? fromHex(message.request.body)
      : undefined;
    const localURL = new URL(targetURL);
    localURL.search = url.search;
    // if you need a custom host header, you can set it here
    // headers.set("host", "example.com");
    try {
      const response = await fetch(localURL, {
        method: message.request.method,
        headers,
        body: requestBody,
      });
      let body;
      if (response.body) {
        body = toHex(await response.bytes());
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
    } catch (error) {
      console.error("Error while fetching:", error);
      const responseMessage: ResponseMessage = {
        type: "response",
        response: {
          status: 500,
          statusText: "Internal Server Error",
          headers: [["content-type", "text/plain"]],
          body: stringToHex(
            `Error while fetching the target URL.
Please check if the target server is running on "${targetURL}".
For more information check the tunnel client logs.
`
          ),
        },
      };
      socket.send(JSON.stringify(responseMessage));
    }
  } else {
    console.error("Unknown message type:", message.type);
  }
});

export function stringToHex(str: string): string {
  const buffer = Buffer.from(str, "utf8");
  return toHex(buffer);
}

// Executes when the connection is closed, providing the close code and reason.
socket.addEventListener("close", (event) => {
  console.log("Connection closed:", event.code, event.reason);
});

// Executes if an error occurs during the WebSocket communication.
socket.addEventListener("error", (event) => {
  console.error("WebSocket error:", (event as ErrorEvent).message);
});
