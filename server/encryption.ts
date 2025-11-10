import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is required for API key encryption. " +
    "Generate a secure key with: openssl rand -base64 32"
  );
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  authTag: string;
  salt: string;
  keyVersion: number;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.scryptSync(password, salt, 32);
}

export function encrypt(text: string, keyVersion: number = 1): EncryptedData {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input: text must be a non-empty string");
  }

  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw new Error("Invalid keyVersion: must be a positive integer");
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(ENCRYPTION_KEY, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedText: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    salt: salt.toString("hex"),
    keyVersion,
  };
}

export function decrypt(encryptedData: EncryptedData): string {
  if (!encryptedData || typeof encryptedData !== "object") {
    throw new Error("Invalid encrypted data: must be an EncryptedData object");
  }

  const { encryptedText, iv, authTag, salt, keyVersion } = encryptedData;

  if (!encryptedText || !iv || !authTag || !salt) {
    throw new Error("Invalid encrypted data: missing required fields");
  }

  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw new Error("Invalid keyVersion in encrypted data");
  }

  try {
    const saltBuffer = Buffer.from(salt, "hex");
    const key = deriveKey(ENCRYPTION_KEY, saltBuffer);
    
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, "hex")
    );
    
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function encryptApiKey(apiKey: string, keyVersion: number = 1): string {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("API key must be a non-empty string");
  }

  const encrypted = encrypt(apiKey, keyVersion);
  return JSON.stringify(encrypted);
}

export function decryptApiKey(encryptedJson: string): string {
  if (!encryptedJson || typeof encryptedJson !== "string") {
    throw new Error("Encrypted data must be a non-empty JSON string");
  }

  try {
    const parsed = JSON.parse(encryptedJson);
    
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSON: must be an object");
    }

    const requiredFields = ["encryptedText", "iv", "authTag", "salt", "keyVersion"];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return decrypt(parsed as EncryptedData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format in encrypted data");
    }
    throw error;
  }
}

export function validateEncryptionKey(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32;
}
