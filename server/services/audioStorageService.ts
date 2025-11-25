import { Storage, File } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import type { Response } from "express";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class AudioStorageService {
  private bucketName: string;
  private audioDir: string;

  constructor() {
    const publicPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = publicPaths.split(",").map(p => p.trim()).filter(p => p.length > 0);
    
    if (paths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set. Object storage not configured.");
    }

    const firstPath = paths[0];
    const parts = firstPath.split("/").filter(p => p.length > 0);
    this.bucketName = parts[0];
    this.audioDir = "telecmi-audio";
  }

  async uploadAudioBuffer(
    buffer: Buffer, 
    filename: string,
    contentType: string = "audio/mpeg"
  ): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
      const bucket = objectStorageClient.bucket(this.bucketName);
      const objectName = `${this.audioDir}/${filename}`;
      const file = bucket.file(objectName);

      await file.save(buffer, {
        metadata: {
          contentType,
        },
        public: true,
      });

      try {
        await file.makePublic();
        console.log(`[AudioStorageService] Made file public: ${objectName}`);
      } catch (aclError) {
        console.warn(`[AudioStorageService] Could not set public ACL, using signed URL:`, aclError);
      }

      const directUrl = `https://storage.googleapis.com/${this.bucketName}/${objectName}`;
      
      const isPublic = await this.checkIfPublic(directUrl);
      
      if (isPublic) {
        console.log(`[AudioStorageService] Using direct public URL: ${directUrl}`);
        return { success: true, publicUrl: directUrl };
      }

      const signedUrl = await this.getSignedUrl(objectName);
      console.log(`[AudioStorageService] Using signed URL (file not public): ${signedUrl.substring(0, 100)}...`);
      
      return { success: true, publicUrl: signedUrl };
    } catch (error: any) {
      console.error("[AudioStorageService] Upload error:", error);
      return { success: false, error: error.message };
    }
  }

  private async checkIfPublic(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async getSignedUrl(objectName: string, ttlSec: number = 900): Promise<string> {
    const request = {
      bucket_name: this.bucketName,
      object_name: objectName,
      method: "GET",
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };

    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sign object URL, status: ${response.status}`);
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  async deleteAudioFile(filename: string): Promise<boolean> {
    try {
      const bucket = objectStorageClient.bucket(this.bucketName);
      const objectName = `${this.audioDir}/${filename}`;
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log(`[AudioStorageService] Deleted audio file: ${objectName}`);
      }
      
      return true;
    } catch (error: any) {
      console.error("[AudioStorageService] Delete error:", error);
      return false;
    }
  }

  async cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    let deletedCount = 0;
    try {
      const bucket = objectStorageClient.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix: `${this.audioDir}/` });
      
      const now = Date.now();
      
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const createdTime = new Date(metadata.timeCreated || 0).getTime();
        
        if (now - createdTime > maxAgeMs) {
          await file.delete();
          deletedCount++;
        }
      }
      
      console.log(`[AudioStorageService] Cleaned up ${deletedCount} old audio files`);
    } catch (error) {
      console.error("[AudioStorageService] Cleanup error:", error);
    }
    return deletedCount;
  }

  async getAudioFile(filename: string): Promise<File | null> {
    try {
      const bucket = objectStorageClient.bucket(this.bucketName);
      const objectName = `${this.audioDir}/${filename}`;
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }
      
      return file;
    } catch (error) {
      console.error("[AudioStorageService] Get file error:", error);
      return null;
    }
  }

  async streamAudioToResponse(filename: string, res: Response): Promise<boolean> {
    try {
      const file = await this.getAudioFile(filename);
      if (!file) {
        return false;
      }

      const [metadata] = await file.getMetadata();
      
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": metadata.size?.toString() || "0",
        "Cache-Control": "public, max-age=900",
        "Accept-Ranges": "bytes",
      });

      const stream = file.createReadStream();
      
      stream.on("error", (err) => {
        console.error("[AudioStorageService] Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming audio" });
        }
      });

      stream.pipe(res);
      return true;
    } catch (error) {
      console.error("[AudioStorageService] Stream error:", error);
      return false;
    }
  }
}
