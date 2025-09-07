import { api } from "./api";

export interface UserMegaConfigInfo {
  id: string;
  email: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface GetUserMegaConfigResponse {
  hasConfig: boolean;
  message?: string;
  config?: UserMegaConfigInfo;
}

export async function getUserMegaConfig() {
  return api<GetUserMegaConfigResponse>(`/user-mega-config`, {
    method: "GET",
    auth: true,
  });
}

export async function saveUserMegaConfig(email: string, password: string) {
  // Chiffrement XOR léger côté frontend (obfuscation transport)
  const { emailEnc, passwordEnc, key } = xorEncryptPayload(email, password);
  return api<{ message: string; config: UserMegaConfigInfo }>(
    `/user-mega-config`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ emailEnc, passwordEnc, key, enc: "xor" }),
    }
  );
}

export async function testUserMegaCredentials(email: string, password: string) {
  const { emailEnc, passwordEnc, key } = xorEncryptPayload(email, password);
  return api<{ ok: boolean; message: string }>(`/user-mega-config/test`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ emailEnc, passwordEnc, key, enc: "xor" }),
  });
}

export async function deleteUserMegaConfig() {
  return api<{ message: string }>(`/user-mega-config`, {
    method: "DELETE",
    auth: true,
  });
}

// --- helpers encryption (XOR) ---
function encrypt(text: string, key: string): string {
  let encrypted = "";
  for (let i = 0; i < text.length; i++) {
    encrypted += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return encrypted;
}

function randomKey(len = 24): string {
  // Génère une clé pseudo-aléatoire ASCII sûre pour le transport JSON
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  const cryptoObj = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoObj && "getRandomValues" in cryptoObj) {
    const buf = new Uint8Array(len);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
    return out;
  }
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function toBase64(s: string): string {
  if (typeof btoa !== "undefined") return btoa(s);
  // Node polyfill (tests) – non utilisé en runtime navigateur normalement
  return Buffer.from(s, "binary").toString("base64");
}

function xorEncryptPayload(email: string, password: string) {
  const key = randomKey();
  // Encode en base64 pour éviter les problèmes de caractères de contrôle
  const emailEnc = toBase64(encrypt(email, key));
  const passwordEnc = toBase64(encrypt(password, key));
  return { emailEnc, passwordEnc, key };
}
