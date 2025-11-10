import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-change-me-in-production-32bytes";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export function encrypt(text: string, keyVersion: number = 1): EncryptedData {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedText: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    keyVersion,
  };
}

export function decrypt(encryptedData: EncryptedData): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encryptedData.iv, "hex")
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));
  
  let decrypted = decipher.update(encryptedData.encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function encryptApiKey(apiKey: string): string {
  const encrypted = encrypt(apiKey, 1);
  return JSON.stringify(encrypted);
}

export function decryptApiKey(encryptedJson: string): string {
  const encrypted: EncryptedData = JSON.parse(encryptedJson);
  return decrypt(encrypted);
}
