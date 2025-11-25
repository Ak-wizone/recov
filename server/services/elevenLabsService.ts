import type { IStorage } from "../storage";
import { decryptApiKey } from "../encryption";
import FormData from "form-data";

interface VoiceCloneResult {
  success: boolean;
  voiceId?: string;
  voiceName?: string;
  error?: string;
}

interface TextToSpeechResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioUrl?: string;
  charactersUsed?: number;
  error?: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

export class ElevenLabsService {
  private storage: IStorage;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  private async getApiKey(): Promise<string | null> {
    const configData = await this.storage.getElevenLabsConfigSecure();
    if (!configData) {
      console.error("[ElevenLabsService] No config found");
      return null;
    }
    return configData.decryptedApiKey;
  }

  private async getConfig(): Promise<any | null> {
    const config = await this.storage.getElevenLabsConfig();
    return config || null;
  }

  async testConnection(): Promise<{ success: boolean; message: string; subscription?: any }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, message: "ElevenLabs API key not configured" };
      }

      const response = await fetch(`${this.baseUrl}/user/subscription`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.detail?.message || "Failed to connect to ElevenLabs" };
      }

      const subscription = await response.json();
      return {
        success: true,
        message: "Connected successfully",
        subscription: {
          tier: subscription.tier,
          characterCount: subscription.character_count,
          characterLimit: subscription.character_limit,
          voiceLimit: subscription.voice_limit,
          professionalVoiceLimit: subscription.professional_voice_limit,
        },
      };
    } catch (error: any) {
      console.error("[ElevenLabsService] Connection test error:", error);
      return { success: false, message: error.message || "Connection failed" };
    }
  }

  async listVoices(): Promise<{ success: boolean; voices?: ElevenLabsVoice[]; error?: string }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: "ElevenLabs API key not configured" };
      }

      const response = await fetch(`${this.baseUrl}/voices`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail?.message || "Failed to list voices" };
      }

      const data = await response.json();
      return { success: true, voices: data.voices };
    } catch (error: any) {
      console.error("[ElevenLabsService] List voices error:", error);
      return { success: false, error: error.message || "Failed to list voices" };
    }
  }

  async createVoiceClone(
    name: string,
    description: string,
    audioBuffer: Buffer,
    filename: string
  ): Promise<VoiceCloneResult> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: "ElevenLabs API key not configured" };
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description || `Voice clone for ${name}`);
      formData.append("files", audioBuffer, {
        filename: filename,
        contentType: this.getContentType(filename),
      });

      // Convert form-data to buffer for native fetch compatibility
      const formBuffer = formData.getBuffer();
      const formHeaders = formData.getHeaders();

      console.log("[ElevenLabsService] Sending voice clone request, file size:", audioBuffer.length, "bytes");

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          ...formHeaders,
        },
        body: formBuffer,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ElevenLabsService] Voice clone error:", JSON.stringify(errorData, null, 2));
        console.error("[ElevenLabsService] Response status:", response.status);
        
        // Extract error message from various possible formats
        let errorMessage = "Failed to create voice clone";
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (errorData.detail?.message) {
          errorMessage = errorData.detail.message;
        } else if (errorData.detail?.status === "quota_exceeded") {
          errorMessage = "Voice clone quota exceeded. Please check your ElevenLabs subscription.";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === "string" ? errorData.error : errorData.error.message || "Unknown error";
        }
        
        // Add HTTP status context for common errors
        if (response.status === 401) {
          errorMessage = "Invalid API key. Please check your ElevenLabs configuration.";
        } else if (response.status === 403) {
          errorMessage = "API key lacks permission for voice cloning. Please enable 'voices_write' permission.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again later.";
        }
        
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      return {
        success: true,
        voiceId: data.voice_id,
        voiceName: name,
      };
    } catch (error: any) {
      console.error("[ElevenLabsService] Create voice clone error:", error);
      return { success: false, error: error.message || "Failed to create voice clone" };
    }
  }

  async deleteVoice(voiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: "ElevenLabs API key not configured" };
      }

      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: "DELETE",
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail?.message || "Failed to delete voice" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("[ElevenLabsService] Delete voice error:", error);
      return { success: false, error: error.message || "Failed to delete voice" };
    }
  }

  async textToSpeech(
    text: string,
    voiceId: string,
    options?: {
      model?: string;
      stability?: number;
      similarityBoost?: number;
    }
  ): Promise<TextToSpeechResult> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: "ElevenLabs API key not configured" };
      }

      const config = await this.getConfig();
      const model = options?.model || config?.defaultModel || "eleven_multilingual_v2";
      const stability = options?.stability || parseFloat(config?.defaultStability || "0.50");
      const similarityBoost = options?.similarityBoost || parseFloat(config?.defaultSimilarityBoost || "0.75");

      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[ElevenLabsService] TTS error:", error);
        return { success: false, error: error.detail?.message || "Failed to generate audio" };
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      return {
        success: true,
        audioBuffer,
        charactersUsed: text.length,
      };
    } catch (error: any) {
      console.error("[ElevenLabsService] Text to speech error:", error);
      return { success: false, error: error.message || "Failed to generate audio" };
    }
  }

  async generateAudioFromTemplate(
    templateText: string,
    variables: Record<string, any>,
    voiceId: string
  ): Promise<TextToSpeechResult> {
    let script = templateText;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      script = script.replace(regex, String(value || ""));
    });

    return this.textToSpeech(script, voiceId);
  }

  async previewVoice(voiceId: string): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: "ElevenLabs API key not configured" };
      }

      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail?.message || "Failed to get voice details" };
      }

      const data = await response.json();
      return {
        success: true,
        previewUrl: data.preview_url,
      };
    } catch (error: any) {
      console.error("[ElevenLabsService] Preview voice error:", error);
      return { success: false, error: error.message || "Failed to get voice preview" };
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "m4a":
        return "audio/mp4";
      case "ogg":
        return "audio/ogg";
      case "webm":
        return "audio/webm";
      default:
        return "audio/mpeg";
    }
  }
}
