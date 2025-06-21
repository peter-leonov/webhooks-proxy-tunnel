import type {
  ProxyRequest,
  ProxyResponse,
  RequestMessage,
  ResponseMessage,
} from "../../shared/protocol";
import { fromHex, toHex } from "../../shared/hex.ts";
import {
  TUNNEL_PROXY_PROTOCOL,
  X_WEBHOOKS_PROXY_TUNNEL_PREFLIGHT,
} from "../../shared/constants.ts";
import { generateToken } from "../../shared/token.ts";

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

const MINUTE = 60 * 1000;

const TOTAL_TIMEOUT_MIN = Number(
  process.env.WEBHOOKS_PROXY_CLIENT_TOTAL_TIMEOUT_MIN || "60"
);
if (TOTAL_TIMEOUT_MIN <= 0) {
  console.warn(
    "Total timeout is disabled. The client will not be terminated automatically after 60 minutes."
  );
} else {
  console.log(
    `For increased security, the client will be terminated after ${TOTAL_TIMEOUT_MIN} minutes.`
  );
  setTimeout(() => {
    console.log(
      `Total timeout of ${TOTAL_TIMEOUT_MIN} minutes reached. Terminating the client.`
    );
    process.exit(0);
  }, TOTAL_TIMEOUT_MIN * MINUTE);
}

// Disconnect the client after 10 minutes of inactivity.
const INACTIVE_TIMEOUT_MIN = Number(
  process.env.WEBHOOKS_PROXY_CLIENT_INACTIVE_TIMEOUT_MIN || "10"
);

function terminateInactiveClient() {
  console.log(
    `Terminating the client after ${INACTIVE_TIMEOUT_MIN} minutes of inactivity.`
  );
  process.exit(0);
}

let inactiveTimeout: NodeJS.Timeout;

function resetInactiveTimeout() {
  clearTimeout(inactiveTimeout);
  if (INACTIVE_TIMEOUT_MIN <= 0) {
    return;
  }
  inactiveTimeout = setTimeout(
    terminateInactiveClient,
    INACTIVE_TIMEOUT_MIN * MINUTE
  );
}

if (INACTIVE_TIMEOUT_MIN > 0) {
  console.log(
    `For increased security, the client will be terminated after ${INACTIVE_TIMEOUT_MIN} minutes of inactivity.`
  );
} else {
  console.warn(
    "Inactivity timeout is disabled. The client will not be terminated after 10 minutes of inactivity."
  );
}

// Start counting inactivity timeout right away.
resetInactiveTimeout();

const BASIC_AUTH = process.env.WEBHOOKS_PROXY_TUNNEL_BASIC_AUTH;
if (BASIC_AUTH) {
  console.log(
    `Using basic auth for the tunnel: ${BASIC_AUTH.split(":")[0]}:***`
  );
}
const WEBHOOKS_PROXY_TUNNEL_SECRET =
  process.env.WEBHOOKS_PROXY_TUNNEL_SECRET;

if (!WEBHOOKS_PROXY_TUNNEL_SECRET) {
  console.warn(
    "WEBHOOKS_PROXY_TUNNEL_SECRET is not set. Anyone can connect to the tunnel."
  );
  console.warn(
    "Please set the WEBHOOKS_PROXY_TUNNEL_SECRET by running `npm run reset-secret` in the `./worker` directory."
  );
}

async function main(): Promise<number> {
  const sleep = (timeout: number) =>
    new Promise((resolve) => setTimeout(resolve, timeout));

  // Try to connect to the tunnel every second for 5 seconds.
  const retryCount = 5;
  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`Connecting to the tunnel at ${tunnelURLStr}...`);
      await proxy();
      return 0;
    } catch (error) {
      if (error instanceof TypeError) {
        console.error("Error:", error.stack);
      } else {
        console.error("Unexpected error:", error);
      }
      if (i < retryCount - 1) {
        console.log(
          `Retrying in 1 second... (${i + 1}/${retryCount})`
        );
        await sleep(1000);
      } else {
        console.error("Max retries reached.");
      }
    }
  }

  console.error(
    `Failed to connect to the tunnel at ${tunnelURLStr}. Please check if the tunnel is running.`
  );

  return 1;
}

async function proxy() {
  const { pathname } = new URL(tunnelURLStr);
  const [, , tunnelId] = pathname.split("/");

  const token = WEBHOOKS_PROXY_TUNNEL_SECRET
    ? await generateToken(tunnelId, WEBHOOKS_PROXY_TUNNEL_SECRET)
    : "no-secret";

  // Partially simulate a WebSocket request to the tunnel
  // to ensure that the tunnel is reachable and the secret is correct.
  const preflight = await fetch(tunnelURLStr, {
    method: "GET",
    headers: {
      "Sec-WebSocket-Protocol": `${TUNNEL_PROXY_PROTOCOL},${token}`,
      [X_WEBHOOKS_PROXY_TUNNEL_PREFLIGHT]: "yes",
    },
  });
  if (!preflight.ok) {
    // JSON.stringify'ing to avoid the response to mess with the terminal output.
    throw new TypeError(
      `Received status code ${preflight.status} (${
        preflight.statusText
      }) from the tunnel: ${JSON.stringify(await preflight.text())}`
    );
  }

  let resolve: (value: unknown) => void,
    reject: (reason?: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const socket = new WebSocket(tunnelURLStr, [
    TUNNEL_PROXY_PROTOCOL,
    token,
  ]);

  // Executes when the connection is successfully established.
  socket.addEventListener("open", (event) => {
    console.log(
      `Proxying requests from tunnel ${tunnelURLStr} to target ${targetURLStr}…`
    );
  });

  // Executes when the connection is closed, providing the close code and reason.
  socket.addEventListener("close", (event) => {
    console.log("Connection closed:", event.code, event.reason);
    resolve(null);
  });

  // Executes if an error occurs during the WebSocket communication.
  socket.addEventListener("error", (event) => {
    reject(
      new Error("WebSocket error: " + (event as ErrorEvent).message)
    );
  });

  socket.addEventListener("message", async (event) => {
    resetInactiveTimeout();

    const message: RequestMessage = JSON.parse(event.data);
    if (message.type === "request") {
      const response = await handleRequestMessage(message.request);
      const responseMessage: ResponseMessage = {
        type: "response",
        response,
      };
      socket.send(JSON.stringify(responseMessage));
    } else {
      console.error("Unknown message type:", message.type);
    }
  });

  return await promise;
}

async function handleRequestMessage(
  request: ProxyRequest
): Promise<ProxyResponse> {
  console.log(`Received request: ${request.method}`);
  // As the client code is the easies to test and debug, we will
  // handle all the edge cases with transporting the request
  // and response objects here (e.g. keep-alive, gzip, etc.)
  const headers = new Headers(request.headers);

  if (BASIC_AUTH) {
    const [username, password] = BASIC_AUTH.split(":");
    const basic = headers.get("authorization");
    if (!basic || !basic.startsWith("Basic ")) {
      console.warn(
        `Basic Auth is enabled, but no credentials provided.`
      );
      return {
        status: 401,
        statusText: "Unauthorized",
        headers: [
          ["content-type", "text/plain"],
          ["www-authenticate", "Basic"],
        ],
        body: stringToHex(
          `Unauthorized. Please provide the correct Basic Auth credentials.`
        ),
      };
    }
    const decoded = atob(basic.slice(6));
    const [reqUsername, reqPassword] = decoded.split(":");
    if (reqUsername !== username || reqPassword !== password) {
      console.warn(
        `Basic Auth credentials provided, but they are incorrect.`
      );
      return {
        status: 401,
        statusText: "Unauthorized",
        headers: [
          ["content-type", "text/plain"],
          ["www-authenticate", "Basic"],
        ],
        body: stringToHex(
          `Unauthorized. Please provide the correct Basic Auth credentials.`
        ),
      };
    }
    console.log(
      `Basic Auth credentials provided and verified: ${username}:***`
    );
  }

  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("keep-alive");
  headers.delete("host");
  const requestBody = request.body
    ? fromHex(request.body)
    : undefined;
  const targetURL = mergeURLs(targetURLStr, request.url);
  // if you need a custom host header, you can set it here
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    headers.set("x-forwarded-for", cfConnectingIp);
  }
  // headers.set("host", "example.com");
  try {
    const response = await fetch(targetURL, {
      method: request.method,
      headers,
      body: requestBody,
    });
    let body;
    if (response.body) {
      body = toHex(await response.bytes());
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers.entries()],
      body,
    };
  } catch (error) {
    console.error("Error while fetching:", error);
    return {
      status: 500,
      statusText: "Internal Server Error",
      headers: [["content-type", "text/plain"]],
      body: stringToHex(
        `Error while fetching the target URL.
Please check if the target server is running on "${targetURLStr}".
For more information check the tunnel client logs.
`
      ),
    };
  }
}

export function stringToHex(str: string): string {
  const buffer = Buffer.from(str, "utf8");
  return toHex(buffer);
}

function mergeURLs(targetURLStr: string, requestURLStr: string): URL {
  const PROXY_PREFIX_LENGTH =
    "/proxy/00000000-0000-0000-0000-000000000000".length;

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

process.exit(await main());
