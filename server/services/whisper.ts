import OpenAI from "openai";
import { decryptApiKey } from "../encryption";
import type { IStorage } from "../storage";

export interface TranscriptionOptions {
  language?: string; // ISO 639-1 code (en, hi, etc.) or auto-detect
  prompt?: string; // Optional context to improve accuracy
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number; // in seconds
  cost: number; // in minor units (paise)
}

export class WhisperService {
  private openai: OpenAI | null = null;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  private async initializeClient(): Promise<void> {
    if (this.openai) return;

    const config = await this.storage.getWhisperConfig();
    if (!config || !config.isEnabled) {
      throw new Error("Whisper Voice AI is not enabled");
    }

    const apiKey = decryptApiKey(config.apiKey);
    this.openai = new OpenAI({ apiKey });
  }

  private async transcribeRaw(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    await this.initializeClient();

    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    // Create a File-like object for OpenAI API (Node.js compatibility)
    const file = await OpenAI.toFile(audioBuffer, filename, {
      type: this.getContentType(filename),
    });

    const startTime = Date.now();

    try {
      // Call OpenAI Whisper API
      const transcription: any = await this.openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: options.language || undefined,
        prompt: options.prompt,
      });

      const duration = (Date.now() - startTime) / 1000;

      // OpenAI charges $0.006 per minute (rounded up)
      const audioDuration = transcription.duration || duration;
      const minutesBilled = Math.ceil(audioDuration / 60);
      const costInPaise = Math.ceil(minutesBilled * 0.6); // ₹0.006/min = 0.6 paise/min

      return {
        text: transcription.text,
        language: transcription.language || "unknown",
        duration: audioDuration,
        cost: costInPaise,
      };
    } catch (error: any) {
      console.error("[WhisperService] OpenAI API error:", error);
      // Sanitize error - don't leak API details to client
      if (error.status === 401) {
        throw new Error("Voice AI service configuration error");
      } else if (error.status === 429) {
        throw new Error("Voice AI service temporarily unavailable. Please try again later.");
      } else if (error.status >= 500) {
        throw new Error("Voice AI service error. Please try again.");
      }
      throw new Error("Transcription failed. Please try again.");
    }
  }

  async transcribeWithCreditDeduction(
    audioBuffer: Buffer,
    filename: string,
    tenantId: string,
    userId: string | null,
    feature: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // PRE-CHECK: Verify sufficient credits BEFORE calling OpenAI
    const credits = await this.storage.getWhisperCredits(tenantId);
    if (!credits) {
      throw new Error("Voice AI credits not initialized for your account");
    }

    const remainingMinutes =
      credits.planMinutesCurrent +
      credits.addonMinutesBalance -
      credits.usedPlanMinutes -
      credits.usedAddonMinutes;

    if (remainingMinutes <= 0) {
      throw new Error("Insufficient Voice AI credits. Please purchase addon credits from Voice AI Credits page.");
    }

    // Call OpenAI API (throws on failure)
    const result = await this.transcribeRaw(audioBuffer, filename, options);

    // Deduct credits and log usage in try/catch to handle failures gracefully
    try {
      const minutesBilled = Math.ceil(result.duration / 60);
      
      // Atomic credit deduction (returns success status)
      const deduction = await this.storage.deductWhisperCredits(tenantId, minutesBilled);

      if (!deduction.success) {
        throw new Error(deduction.error || "Credit deduction failed");
      }

      // Log usage only if deduction succeeded
      await this.storage.createWhisperUsage({
        tenantId,
        userId: userId || undefined,
        feature,
        secondsUsed: Number(result.duration.toFixed(2)).toString(),
        minutesBilled,
        costMinorUnits: result.cost,
        transcriptPreview: result.text.substring(0, 200),
      });

      console.log(
        `[WhisperService] Transcription complete for tenant ${tenantId}: ${minutesBilled} min billed, ${deduction.remainingMinutes} min remaining`
      );
    } catch (deductionError: any) {
      console.error("[WhisperService] Credit deduction failed:", deductionError);
      // If credit deduction fails, still return the transcript but log the error
      // This prevents losing the OpenAI API call cost if deduction fails
      throw new Error("Transcription succeeded but credit deduction failed. Please contact support.");
    }

    return result;
  }

  private getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      mp4: "audio/mp4",
      mpeg: "audio/mpeg",
      mpga: "audio/mpeg",
      m4a: "audio/m4a",
      wav: "audio/wav",
      webm: "audio/webm",
    };
    return contentTypes[ext || ""] || "audio/mpeg";
  }
}
