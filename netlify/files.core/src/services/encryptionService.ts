/**
 * Service d'obfuscation XOR + Base64 pour credentials MEGA.
 * Attention: il s'agit d'une obfuscation légère, pas d'un chiffrement fort.
 */
export interface XorEncryptedCreds {
  email: string; // Base64(XOR(email, key))
  password: string; // Base64(XOR(password, key))
  key: string; // clé en clair stockée en DB (champ encKey)
}

function fromBase64(b64: string): string {
  return Buffer.from(b64, 'base64').toString('binary');
}

function toBase64(bin: string): string {
  return Buffer.from(bin, 'binary').toString('base64');
}

function xor(text: string, key: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

export const encryptionService = {
  encryptWithKey(email: string, password: string, key: string): XorEncryptedCreds {
    const emailEnc = toBase64(xor(email, key));
    const passwordEnc = toBase64(xor(password, key));
    return { email: emailEnc, password: passwordEnc, key };
  },
  decryptWithKey(emailB64: string, passwordB64: string, key: string): { email: string; password: string } {
    const email = xor(fromBase64(emailB64), key);
    const password = xor(fromBase64(passwordB64), key);
    return { email, password };
  },
};
