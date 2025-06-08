import type {
  RequestMessage,
  ResponseMessage,
} from "../../shared/protocol";
import { fromHex, toHex } from "../../shared/hex.ts";
import { TUNNEL_PROXY_PROTOCOL } from "../../shared/constants.ts";
import { generateToken, tokenFromParts } from "../../shared/token.ts";

const [, , tunnelURLStr, targetURLStr] = process.argv;

function usage() {
  console.error("Usage:");
  console.error("  node src/client.js <tunnelURL> <targetURL>");
  console.error("");
  console.error(
    "  Use env var WEBHOOKS_PROXY_TUNNEL_SECRET to secure the tunnel."
  );
  console.error();
  console.error("Example:");
  console.error(
    "  node src/client.js https://webhooks-proxy-tunnel.YOUR_ORG.workers.dev/connect/00000000-0000-0000-0000-000000000000 http://localhost:3000"
  );
}

if (!tunnelURLStr) {
  console.error("Please provide a tunnel URL.");
  console.error();
  usage();
  process.exit(1);
}
if (!targetURLStr) {
  console.error("Please provide a target URL.");
  console.error();
  usage();
  process.exit(1);
}

const WEBHOOKS_PROXY_TUNNEL_SECRET =
  process.env.WEBHOOKS_PROXY_TUNNEL_SECRET;

if (!WEBHOOKS_PROXY_TUNNEL_SECRET) {
  console.warn(
    "WEBHOOKS_PROXY_TUNNEL_SECRET is not set. Anyone can connect to the tunnel."
  );
  console.warn(
    "Please set the WEBHOOKS_PROXY_TUNNEL_SECRET by running `npm run set-secret` in the `./worker` directory."
  );
}

const { pathname } = new URL(tunnelURLStr);
const [, , tunnelId] = pathname.split("/");

const token = WEBHOOKS_PROXY_TUNNEL_SECRET
  ? await generateToken(tunnelId, WEBHOOKS_PROXY_TUNNEL_SECRET)
  : "<no-secret>";

const socket = new WebSocket(tunnelURLStr, [
  TUNNEL_PROXY_PROTOCOL,
  token,
]);

// Executes when the connection is successfully established.
socket.addEventListener("open", (event) => {
  console.log(
    `proxying requests from tunnel ${tunnelURLStr} to target ${targetURLStr}`
  );
});

// Executes when the connection is closed, providing the close code and reason.
socket.addEventListener("close", (event) => {
  console.log("Connection closed:", event.code, event.reason);
});

// Executes if an error occurs during the WebSocket communication.
socket.addEventListener("error", (event) => {
  console.error("WebSocket error:", (event as ErrorEvent).message);
});

socket.addEventListener("message", async (event) => {
  const message: RequestMessage = JSON.parse(event.data);
  if (message.type === "request") {
    // As the client code is the easies to test and debug, we will
    // handle all the edge cases with transporting the request
    // and response objects here (e.g. keep-alive, gzip, etc.)
    const headers = new Headers(message.request.headers);
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    headers.delete("keep-alive");
    headers.delete("host");
    const requestBody = message.request.body
      ? fromHex(message.request.body)
      : undefined;
    const targetURL = mergeURLs(targetURLStr, message.request.url);
    // if you need a custom host header, you can set it here
    const cfConnectingIp = headers.get("cf-connecting-ip");
    if (cfConnectingIp) {
      headers.set("x-forwarded-for", cfConnectingIp);
    }
    // headers.set("host", "example.com");
    try {
      const response = await fetch(targetURL, {
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
Please check if the target server is running on "${targetURLStr}".
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

const PROXY_PREFIX_LENGTH =
  "/proxy/00000000-0000-0000-0000-000000000000".length;

function mergeURLs(targetURLStr: string, requestURLStr: string): URL {
  const requestURL = new URL(requestURLStr);
  const proxyPath = requestURL.pathname.substring(
    PROXY_PREFIX_LENGTH
  );

  const finalURL = new URL(targetURLStr);
  if (finalURL.pathname == "/") {
    finalURL.pathname = proxyPath;
  } else if (
    finalURL.pathname.endsWith("/") &&
    proxyPath.startsWith("/")
  ) {
    finalURL.pathname += proxyPath.slice(1);
  } else {
    finalURL.pathname += proxyPath;
  }

  const targetURL = new URL(targetURLStr);
  // Preserve the search parameters from the target URL
  for (const [key, value] of targetURL.searchParams) {
    finalURL.searchParams.set(key, value);
  }
  for (const [key, value] of requestURL.searchParams) {
    finalURL.searchParams.set(key, value);
  }

  return finalURL;
}
