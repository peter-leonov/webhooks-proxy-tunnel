export function toHex(bytes: Uint8Array): string {
  const codes = [];
  for (const byte of bytes) {
    const hex = byte.toString(16);
    if (byte < 16) {
      codes.push(`0${hex}`);
    } else {
      codes.push(hex);
    }
  }
  return codes.join("");
}

export function fromHex(hex: string): Uint8Array {
  const bytesLength = hex.length / 2;
  if (!Number.isInteger(bytesLength)) {
    throw new Error("hex string length must be even");
  }
  const bytes = new Uint8Array(bytesLength);
  for (let i = 0; i < bytesLength; i++) {
    const start = i << 1;
    bytes[i] = parseInt(hex.substring(start, start + 2), 16);
  }
  return bytes;
}
