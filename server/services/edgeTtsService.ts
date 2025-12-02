import path from "path";
import fs from "fs";
import crypto from "crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Voice Behaviour Types
export type VoiceBehaviour = "kind" | "normal" | "firm" | "strict" | "final_warning";

// Voice Behaviour Configurations - ENHANCED for noticeable differences
export const VOICE_BEHAVIOURS: Record<VoiceBehaviour, {
  name: string;
  description: string;
  icon: string;
  rateAdjust: number;  // Percentage adjustment to base rate
  pitchAdjust: number; // Hz adjustment to base pitch
  volumeAdjust: number; // Percentage adjustment to base volume
  color: string;
  suggestedForDaysOverdue: [number, number]; // [min, max] days overdue range
}> = {
  kind: {
    name: "Kind & Friendly",
    description: "Soft, polite tone for gentle reminders",
    icon: "😊",
    rateAdjust: -20,   // Much slower - calm and gentle
    pitchAdjust: 15,   // Higher pitch - friendlier, warmer
    volumeAdjust: -10, // Softer - less intimidating
    color: "#22c55e",  // Green
    suggestedForDaysOverdue: [0, 7],
  },
  normal: {
    name: "Normal & Professional",
    description: "Standard professional tone",
    icon: "😐",
    rateAdjust: 0,
    pitchAdjust: 0,
    volumeAdjust: 0,
    color: "#3b82f6",  // Blue
    suggestedForDaysOverdue: [8, 15],
  },
  firm: {
    name: "Firm & Serious",
    description: "Assertive but respectful tone",
    icon: "😤",
    rateAdjust: 15,    // Noticeably faster - more direct
    pitchAdjust: -10,  // Lower pitch - more authoritative
    volumeAdjust: 10,  // Louder - more assertive
    color: "#f59e0b",  // Amber
    suggestedForDaysOverdue: [16, 30],
  },
  strict: {
    name: "Strict & Urgent",
    description: "Strong, urgent tone for overdue payments",
    icon: "😠",
    rateAdjust: 25,    // Fast - urgent and serious
    pitchAdjust: -20,  // Much lower - commanding, authoritative
    volumeAdjust: 20,  // Much louder - demanding attention
    color: "#ef4444",  // Red
    suggestedForDaysOverdue: [31, 60],
  },
  final_warning: {
    name: "Final Warning",
    description: "Very firm, last chance warning tone",
    icon: "🚨",
    rateAdjust: 35,    // Very fast - extremely urgent
    pitchAdjust: -30,  // Very low - grave and serious
    volumeAdjust: 30,  // Very loud - maximum urgency
    color: "#7c2d12",  // Dark red
    suggestedForDaysOverdue: [61, 999],
  },
};

// Get suggested behaviour based on days overdue
export function getSuggestedBehaviour(daysOverdue: number): VoiceBehaviour {
  if (daysOverdue <= 7) return "kind";
  if (daysOverdue <= 15) return "normal";
  if (daysOverdue <= 30) return "firm";
  if (daysOverdue <= 60) return "strict";
  return "final_warning";
}

// Edge TTS Available Voices
export interface EdgeVoice {
  id: string;
  name: string;
  shortName: string;
  language: string;
  gender: "Male" | "Female";
  locale: string;
}

// Hindi Voices
export const HINDI_VOICES: EdgeVoice[] = [
  { id: "hi-IN-SwaraNeural", name: "Swara (Female)", shortName: "Swara", language: "Hindi", gender: "Female", locale: "hi-IN" },
  { id: "hi-IN-MadhurNeural", name: "Madhur (Male)", shortName: "Madhur", language: "Hindi", gender: "Male", locale: "hi-IN" },
];

// English (India) Voices
export const ENGLISH_IN_VOICES: EdgeVoice[] = [
  { id: "en-IN-NeerjaNeural", name: "Neerja (Female)", shortName: "Neerja", language: "English (India)", gender: "Female", locale: "en-IN" },
  { id: "en-IN-PrabhatNeural", name: "Prabhat (Male)", shortName: "Prabhat", language: "English (India)", gender: "Male", locale: "en-IN" },
];

// English (US) Voices
export const ENGLISH_US_VOICES: EdgeVoice[] = [
  { id: "en-US-JennyNeural", name: "Jenny (Female)", shortName: "Jenny", language: "English (US)", gender: "Female", locale: "en-US" },
  { id: "en-US-GuyNeural", name: "Guy (Male)", shortName: "Guy", language: "English (US)", gender: "Male", locale: "en-US" },
  { id: "en-US-AriaNeural", name: "Aria (Female)", shortName: "Aria", language: "English (US)", gender: "Female", locale: "en-US" },
  { id: "en-US-DavisNeural", name: "Davis (Male)", shortName: "Davis", language: "English (US)", gender: "Male", locale: "en-US" },
];

// English (UK) Voices
export const ENGLISH_UK_VOICES: EdgeVoice[] = [
  { id: "en-GB-SoniaNeural", name: "Sonia (Female)", shortName: "Sonia", language: "English (UK)", gender: "Female", locale: "en-GB" },
  { id: "en-GB-RyanNeural", name: "Ryan (Male)", shortName: "Ryan", language: "English (UK)", gender: "Male", locale: "en-GB" },
];

// All Available Voices
export const ALL_VOICES: EdgeVoice[] = [
  ...HINDI_VOICES,
  ...ENGLISH_IN_VOICES,
  ...ENGLISH_US_VOICES,
  ...ENGLISH_UK_VOICES,
];

// Voice Categories for UI
export const VOICE_CATEGORIES = {
  hindi: { name: "Hindi", voices: HINDI_VOICES },
  english_in: { name: "English (India)", voices: ENGLISH_IN_VOICES },
  english_us: { name: "English (US)", voices: ENGLISH_US_VOICES },
  english_uk: { name: "English (UK)", voices: ENGLISH_UK_VOICES },
};

interface TextToSpeechResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioPath?: string;
  error?: string;
}

export class EdgeTtsService {
  private audioDir: string;

  constructor() {
    this.audioDir = path.join(process.cwd(), "generated_audio");
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * Get all available voices
   */
  getAllVoices(): EdgeVoice[] {
    return ALL_VOICES;
  }

  /**
   * Get voices by language category
   */
  getVoicesByLanguage(language: "hindi" | "english_in" | "english_us" | "english_uk"): EdgeVoice[] {
    return VOICE_CATEGORIES[language]?.voices || [];
  }

  /**
   * Get default voice for a language
   */
  getDefaultVoice(language: "hindi" | "english" | "hinglish"): string {
    switch (language) {
      case "hindi":
        return "hi-IN-SwaraNeural"; // Default Hindi female voice
      case "english":
        return "en-IN-NeerjaNeural"; // Default English (India) female voice
      case "hinglish":
        return "hi-IN-SwaraNeural"; // Use Hindi voice for Hinglish
      default:
        return "hi-IN-SwaraNeural";
    }
  }

  /**
   * Generate unique filename for audio
   */
  private generateFilename(prefix: string = "tts"): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    return `${prefix}_${timestamp}_${random}.mp3`;
  }

  /**
   * Convert text to speech using Edge TTS
   * @param text - The text to convert to speech
   * @param voiceId - The Edge TTS voice ID (e.g., "hi-IN-SwaraNeural")
   * @param options - Additional options like rate, pitch, volume, behaviour
   */
  async textToSpeech(
    text: string,
    voiceId: string = "hi-IN-SwaraNeural",
    options?: {
      rate?: string; // e.g., "+0%", "-10%", "+20%"
      pitch?: string; // e.g., "+0Hz", "-50Hz", "+50Hz"
      volume?: string; // e.g., "+0%", "-10%", "+20%"
      behaviour?: VoiceBehaviour; // kind, normal, firm, strict, final_warning
    }
  ): Promise<TextToSpeechResult> {
    try {
      const filename = this.generateFilename("edge_tts");
      const outputPath = path.join(this.audioDir, filename);

      // Apply behaviour adjustments to base rate/pitch/volume
      let finalRate = options?.rate || "+0%";
      let finalPitch = options?.pitch || "+0Hz";
      let finalVolume = options?.volume || "+0%";

      if (options?.behaviour) {
        const behaviourConfig = VOICE_BEHAVIOURS[options.behaviour];
        if (behaviourConfig) {
          // Parse current values
          const baseRate = this.parsePercentValue(finalRate);
          const basePitch = this.parseHzValue(finalPitch);
          const baseVolume = this.parsePercentValue(finalVolume);

          // Apply behaviour adjustments
          const adjustedRate = baseRate + behaviourConfig.rateAdjust;
          const adjustedPitch = basePitch + behaviourConfig.pitchAdjust;
          const adjustedVolume = baseVolume + behaviourConfig.volumeAdjust;

          // Clamp values to safe ranges (extended for more noticeable effect)
          finalRate = `${adjustedRate >= 0 ? '+' : ''}${Math.max(-50, Math.min(150, adjustedRate))}%`;
          finalPitch = `${adjustedPitch >= 0 ? '+' : ''}${Math.max(-100, Math.min(100, adjustedPitch))}Hz`;
          finalVolume = `${adjustedVolume >= 0 ? '+' : ''}${Math.max(-50, Math.min(100, adjustedVolume))}%`;

          console.log(`[EdgeTTS] Behaviour "${options.behaviour}" applied:`, {
            original: { rate: options.rate, pitch: options.pitch, volume: options.volume },
            adjustment: behaviourConfig,
            final: { rate: finalRate, pitch: finalPitch, volume: finalVolume },
          });
        }
      }

      console.log(`[EdgeTTS] Generating audio with voice: ${voiceId}`);
      console.log(`[EdgeTTS] Text: "${text.substring(0, 100)}..."`);
      console.log(`[EdgeTTS] Parameters: rate=${finalRate}, pitch=${finalPitch}, volume=${finalVolume}`);

      // Use msedge-tts npm package
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      
      // Convert rate/pitch to msedge-tts format
      const rateValue = this.parseRateValue(finalRate);
      const pitchValue = finalPitch;
      const volumeValue = finalVolume;

      // Generate to file
      const { audioFilePath } = await tts.toFile(this.audioDir, text, {
        rate: rateValue,
        pitch: pitchValue,
        volume: volumeValue,
      });

      tts.close();

      // Read the generated file
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        const audioBuffer = await fs.promises.readFile(audioFilePath);
        
        // Rename to our naming convention
        await fs.promises.rename(audioFilePath, outputPath);
        
        console.log(`[EdgeTTS] Audio generated successfully: ${filename} (${audioBuffer.length} bytes)`);
        return {
          success: true,
          audioBuffer,
          audioPath: outputPath,
        };
      } else {
        return {
          success: false,
          error: "No audio file generated from Edge TTS",
        };
      }
    } catch (error: any) {
      console.error("[EdgeTTS] Error:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  /**
   * Parse percentage string like "+20%" to number (20)
   */
  private parsePercentValue(value: string): number {
    const match = value.match(/([+-]?\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Parse Hz string like "+10Hz" to number (10)
   */
  private parseHzValue(value: string): number {
    const match = value.match(/([+-]?\d+)Hz/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Parse rate string like "+20%" to decimal (1.2)
   */
  private parseRateValue(rate: string): number {
    const match = rate.match(/([+-]?\d+)%/);
    if (match) {
      const percent = parseInt(match[1], 10);
      return 1 + (percent / 100);
    }
    return 1;
  }

  /**
   * Parse volume string like "+20%" to proper format
   */
  private parseVolumeValue(volume: string): string {
    // msedge-tts accepts volume as string like "+0%"
    return volume;
  }

  /**
   * Alternative method using stream (for real-time use cases)
   */
  async textToSpeechStream(
    text: string,
    voiceId: string,
    options?: { rate?: string; pitch?: string; volume?: string }
  ): Promise<TextToSpeechResult> {
    try {
      const filename = this.generateFilename("edge_tts");
      const outputPath = path.join(this.audioDir, filename);

      console.log(`[EdgeTTS-Stream] Starting audio generation with voice: ${voiceId}`);
      
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

      const rateValue = options?.rate ? this.parseRateValue(options.rate) : 1;
      const pitchValue = options?.pitch || "+0Hz";
      const volumeValue = options?.volume || "+0%";

      const { audioStream } = tts.toStream(text, {
        rate: rateValue,
        pitch: pitchValue,
        volume: volumeValue,
      });

      // Collect stream data
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        audioStream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        audioStream.on("end", async () => {
          const audioBuffer = Buffer.concat(chunks);
          tts.close();
          
          if (audioBuffer.length > 0) {
            await fs.promises.writeFile(outputPath, audioBuffer);
            console.log(`[EdgeTTS-Stream] Audio generated: ${outputPath} (${audioBuffer.length} bytes)`);
            resolve({
              success: true,
              audioBuffer,
              audioPath: outputPath,
            });
          } else {
            resolve({
              success: false,
              error: "No audio data received",
            });
          }
        });

        audioStream.on("error", (error: Error) => {
          tts.close();
          reject(error);
        });
      });
    } catch (error: any) {
      console.error("[EdgeTTS-Stream] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to generate audio with stream",
      };
    }
  }

  /**
   * Generate audio from template with variable substitution
   * Supports variables like {{customerName}}, {{amount}}, {{invoiceNumber}}, etc.
   */
  async generateAudioFromTemplate(
    templateText: string,
    variables: Record<string, any>,
    voiceId: string
  ): Promise<TextToSpeechResult> {
    // Replace all {{variable}} placeholders
    let script = templateText;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      script = script.replace(regex, String(value || ""));
    });

    console.log(`[EdgeTTS] Template processed. Final text: "${script.substring(0, 100)}..."`);
    
    return this.textToSpeech(script, voiceId);
  }

  /**
   * Preview a voice with sample text
   */
  async previewVoice(
    voiceId: string,
    language: "hindi" | "english" | "hinglish" = "hindi"
  ): Promise<TextToSpeechResult> {
    const sampleTexts = {
      hindi: "नमस्ते, यह मेरी आवाज़ का प्रीव्यू है। आप इस आवाज़ को अपने कॉल्स में इस्तेमाल कर सकते हैं।",
      english: "Hello, this is a preview of my voice. You can use this voice for your calls.",
      hinglish: "Namaste, yeh meri awaaz ka preview hai. Aap is awaaz ko apne calls mein use kar sakte hain.",
    };

    return this.textToSpeech(sampleTexts[language], voiceId);
  }

  /**
   * Test if Edge TTS is working
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.textToSpeech("Test audio generation.", "en-IN-NeerjaNeural");
      
      if (result.success) {
        // Clean up test file
        if (result.audioPath && fs.existsSync(result.audioPath)) {
          await fs.promises.unlink(result.audioPath);
        }
        return {
          success: true,
          message: "Edge TTS is working correctly. Free unlimited text-to-speech is ready!",
        };
      } else {
        return {
          success: false,
          message: result.error || "Failed to generate test audio",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Edge TTS test failed",
      };
    }
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    let deletedCount = 0;
    try {
      const files = await fs.promises.readdir(this.audioDir);
      const now = Date.now();

      for (const file of files) {
        if (file.startsWith("edge_tts_")) {
          const filePath = path.join(this.audioDir, file);
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            console.log(`[EdgeTTS] Deleted old file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error("[EdgeTTS] Cleanup error:", error);
    }
    return deletedCount;
  }
}
