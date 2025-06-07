import { toHex } from "./hex.ts";

const TIME_SPAN = 10; // 10 seconds

function getTime(): number {
  return Math.floor(Date.now() / 1000 / TIME_SPAN);
}

export async function isValidToken(
  secret: string,
  tunnelID: string,
  token: string
): Promise<boolean> {
  const baseTime = getTime();
  if (token.length !== 64) {
    return false; // Invalid token length
  }

  const hash1 = await tokenFromParts(tunnelID, secret, baseTime);
  if (token === hash1) {
    return true; // Token matches the current time hash
  }

  const hash2 = await tokenFromParts(
    tunnelID,
    secret,
    baseTime - TIME_SPAN
  );
  if (token === hash2) {
    return true; // Token matches the previous time hash
  }

  const hash3 = await tokenFromParts(
    tunnelID,
    secret,
    baseTime + TIME_SPAN
  );
  if (token === hash3) {
    return true; // Token matches the next time hash
  }

  return false; // Token does not match any expected hash
}

export async function generateToken(
  tunnelId: string,
  secret: string
): Promise<string> {
  const time = getTime();
  return tokenFromParts(tunnelId, secret, time);
}

export async function tokenFromParts(
  tunnelID: string,
  secret: string,
  time: number
): Promise<string> {
  return sha256Hex(`${tunnelID}${secret}${time}`);
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return await crypto.subtle.digest("SHA-256", data).then((hash) => {
    return toHex(new Uint8Array(hash));
  });
}
