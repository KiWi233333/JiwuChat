const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;

async function deriveKey(salt: string): Promise<CryptoKey> {
  if (!crypto?.subtle?.importKey || !crypto?.subtle?.deriveKey) {
    throw new Error("Web Crypto API is not supported in this environment.");
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder!.encode(salt),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder!.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

interface EncryptedData {
  iv: number[];
  data: number[];
}

/**
 * 加密
 * @param text 内容
 * @param salt 盐
 */
export async function encrypt(text: string, salt: string): Promise<EncryptedData> {
  if (!encoder) {
    throw new Error("TextEncoder is not supported in this environment.");
  }
  if (!crypto?.subtle?.encrypt) {
    throw new Error("Web Crypto API encryption is not supported in this environment.");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoder.encode(text),
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

/**
 * 解密
 * @param encrypted 加密数据
 * @param salt 盐
 */
export async function decrypt(encrypted: EncryptedData, salt: string): Promise<string> {
  if (!decoder) {
    throw new Error("TextDecoder is not supported in this environment.");
  }
  if (!crypto?.subtle?.decrypt) {
    throw new Error("Web Crypto API decryption is not supported in this environment.");
  }
  const iv = new Uint8Array(encrypted.iv);
  const data = new Uint8Array(encrypted.data);
  const key = await deriveKey(salt);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data,
  );
  return decoder.decode(decrypted);
}
