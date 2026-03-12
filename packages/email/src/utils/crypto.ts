import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  const buf = Buffer.from(key, "base64");
  if (buf.length < KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must decode to at least ${KEY_LENGTH} bytes (got ${buf.length})`
    );
  }
  return buf.subarray(0, KEY_LENGTH);
}

/**
 * Encrypt a UTF-8 string using AES-256-CBC.
 * Returns a hex string in the format: <iv_hex>:<ciphertext_hex>
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypt a string previously produced by `encrypt`.
 * Expects format: <iv_hex>:<ciphertext_hex>
 */
export function decrypt(encryptedText: string): string {
  const colonIndex = encryptedText.indexOf(":");
  if (colonIndex === -1) {
    throw new Error("Invalid encrypted text format — expected <iv>:<ciphertext>");
  }
  const ivHex = encryptedText.slice(0, colonIndex);
  const encryptedHex = encryptedText.slice(colonIndex + 1);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
