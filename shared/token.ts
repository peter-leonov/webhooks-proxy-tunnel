import { toHex } from "./hex.ts";

const TIME_STEP = 10; // 10 seconds

function getTime(): number {
  return Math.floor(Date.now() / 1000 / TIME_STEP);
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
  if (timingSafeCompareStringsOfKnownLength(token, hash1)) {
    return true; // Token matches the current time hash
  }

  const hash2 = await tokenFromParts(
    tunnelID,
    secret,
    baseTime - TIME_STEP
  );
  if (timingSafeCompareStringsOfKnownLength(token, hash2)) {
    return true; // Token matches the previous time hash
  }

  const hash3 = await tokenFromParts(
    tunnelID,
    secret,
    baseTime + TIME_STEP
  );
  if (timingSafeCompareStringsOfKnownLength(token, hash3)) {
    return true; // Token matches the next time hash
  }

  return false; // Token does not match any expected hash
}

/**
 * Compares two strings in a timing-safe manner.
 * This function assumes that both strings are of known length.
 * It uses the `crypto.subtle.timingSafeEqual` method to prevent timing attacks.
 */
function timingSafeCompareStringsOfKnownLength(
  strA: string,
  strB: string
): boolean {
  if (strA.length !== strB.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(strA);
  const b = encoder.encode(strB);

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  // @ts-ignore: timingSafeEqual is not available in all environments
  return crypto.subtle.timingSafeEqual(a, b);
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
