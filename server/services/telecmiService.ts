import { Piopiy, PiopiyAction } from "piopiy";
import type { IStorage } from "../storage";
import { decryptApiKey, encryptApiKey } from "../encryption";
import crypto from "crypto";
import { ElevenLabsService } from "./elevenLabsService";
import { AudioStorageService } from "./audioStorageService";
import fs from "fs";
import path from "path";

interface TelecmiConfig {
  appId: number;
  appSecret: string;
  fromNumber: string;
  answerUrl?: string;
  webhookSecret?: string;
}

interface MakeCallOptions {
  to: string;
  callMode: "simple" | "ai";
  language: "hindi" | "english" | "hinglish";
  templateId?: string;
  scriptText?: string;
  context?: Record<string, any>;
  userId?: string;
  baseUrl?: string;
}

interface CallResponse {
  success: boolean;
  requestId?: string;
  message?: string;
  error?: string;
}

export class TelecmiService {
  private storage: IStorage;
  private elevenLabsService: ElevenLabsService;
  private audioStorageService: AudioStorageService | null = null;
  private audioDir = path.join(process.cwd(), "generated_audio");

  constructor(storage: IStorage) {
    this.storage = storage;
    this.elevenLabsService = new ElevenLabsService(storage);
    
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
    
    try {
      this.audioStorageService = new AudioStorageService();
      console.log("[TelecmiService] AudioStorageService initialized for cloud audio hosting");
    } catch (error) {
      console.warn("[TelecmiService] AudioStorageService not available, using local storage:", error);
    }
  }

  private generateAudioFilename(tenantId: string, callId: string): string {
    return `call_${tenantId}_${callId}_${Date.now()}.mp3`;
  }

  private async saveAudioFile(buffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.audioDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async getAudioFilePath(filename: string): Promise<string | null> {
    const filePath = path.join(this.audioDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }

  async cleanupOldAudioFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    let deletedCount = 0;
    try {
      const files = await fs.promises.readdir(this.audioDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.audioDir, file);
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error("[TelecmiService] Cleanup error:", error);
    }
    return deletedCount;
  }

  async generateCallAudio(
    tenantId: string,
    userId: string,
    scriptText: string,
    baseUrl: string
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      const voiceClone = await this.storage.getVoiceCloneByUserId(tenantId, userId);
      if (!voiceClone || voiceClone.status !== "active" || !voiceClone.elevenLabsVoiceId) {
        return { success: false, error: "No active voice clone found for user" };
      }

      const result = await this.elevenLabsService.textToSpeech(
        scriptText,
        voiceClone.elevenLabsVoiceId
      );

      if (!result.success || !result.audioBuffer) {
        return { success: false, error: result.error || "Failed to generate audio" };
      }

      const callId = crypto.randomBytes(8).toString("hex");
      const filename = this.generateAudioFilename(tenantId, callId);

      if (this.audioStorageService) {
        const uploadResult = await this.audioStorageService.uploadAudioBuffer(
          result.audioBuffer,
          filename,
          "audio/mpeg"
        );

        if (uploadResult.success && uploadResult.publicUrl) {
          console.log(`[TelecmiService] Uploaded audio to cloud storage for user ${userId}`);
          console.log(`[TelecmiService] Public URL: ${uploadResult.publicUrl.substring(0, 80)}...`);
          return { success: true, audioUrl: uploadResult.publicUrl };
        }

        console.warn("[TelecmiService] Cloud upload failed, falling back to local storage");
      }

      await this.saveAudioFile(result.audioBuffer, filename);
      const audioUrl = `${baseUrl}/api/telecmi/audio/${filename}`;
      
      console.log(`[TelecmiService] Generated ElevenLabs audio (local) for user ${userId}: ${audioUrl}`);
      return { success: true, audioUrl };
    } catch (error: any) {
      console.error("[TelecmiService] Generate call audio error:", error);
      return { success: false, error: error.message || "Failed to generate audio" };
    }
  }

  /**
   * Get webhook secret for tenant (for Telecmi registration)
   */
  async getWebhookSecret(tenantId: string): Promise<string | null> {
    const config = await this.storage.getTelecmiConfig(tenantId);
    if (!config) {
      return null;
    }

    try {
      return decryptApiKey(config.webhookSecret);
    } catch (error) {
      console.error("[TelecmiService] Failed to decrypt webhook secret:", error);
      return null;
    }
  }

  /**
   * Get Telecmi configuration for a tenant (with decrypted credentials)
   */
  private async getConfig(tenantId: string): Promise<TelecmiConfig | null> {
    const config = await this.storage.getTelecmiConfig(tenantId);
    if (!config || config.isActive !== "Active") {
      return null;
    }

    try {
      // Debug: Log raw encrypted values
      console.log(`[TelecmiService] Raw config from DB:`, {
        appSecret: config.appSecret?.substring(0, 50) + '...',
        appSecretLength: config.appSecret?.length,
      });

      // Decrypt both app secret and webhook secret
      let decryptedAppSecret: string;
      try {
        decryptedAppSecret = decryptApiKey(config.appSecret);
        console.log(`[TelecmiService] Decryption result:`, {
          decryptedLength: decryptedAppSecret.length,
          decryptedPreview: decryptedAppSecret.substring(0, 20) + '...',
        });
      } catch (decryptError) {
        console.error(`[TelecmiService] Decryption failed:`, decryptError);
        throw new Error(`Failed to decrypt app secret: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`);
      }

      const decryptedWebhookSecret = config.webhookSecret ? decryptApiKey(config.webhookSecret) : undefined;

      // CRITICAL FIX: PIOPIY SDK requires appId as NUMBER and appSecret as STRING
      const appId = Number(config.appId);
      const appSecret = String(decryptedAppSecret);

      // Guard against invalid appId conversion
      if (!Number.isFinite(appId) || appId <= 0) {
        console.error(`[TelecmiService] Invalid appId conversion: ${config.appId} -> ${appId}`);
        return null;
      }

      console.log(`[TelecmiService] Credentials prepared for tenant ${tenantId}:`, {
        rawAppId: config.appId,
        appIdType: typeof appId,
        appIdValue: appId,
        appSecretType: typeof appSecret,
        appSecretLength: appSecret.length,
        appSecretPreview: appSecret.substring(0, 20) + '...',
        fromNumber: config.fromNumber,
      });

      return {
        appId,
        appSecret,
        fromNumber: config.fromNumber,
        answerUrl: config.answerUrl || undefined,
        webhookSecret: decryptedWebhookSecret,
      };
    } catch (error) {
      console.error("[TelecmiService] Failed to decrypt credentials:", error);
      return null;
    }
  }

  /**
   * Normalize phone number with country code for India
   * Ensures all Indian numbers have +91 prefix for proper capacity routing
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all whitespace and special characters except +
    let normalized = phoneNumber.replace(/[\s\-()]/g, '');
    
    // If already has country code, return as is
    if (normalized.startsWith('+')) {
      return normalized;
    }
    
    // If starts with 91 but no +, add +
    if (normalized.startsWith('91') && normalized.length === 12) {
      return '+' + normalized;
    }
    
    // If 10-digit Indian number, add +91
    if (normalized.length === 10 && /^[6-9]\d{9}$/.test(normalized)) {
      return '+91' + normalized;
    }
    
    // Default: assume Indian number and add +91
    return '+91' + normalized;
  }

  /**
   * Build text-to-speech script with variable substitution
   */
  private buildScript(template: string, variables: Record<string, any>): string {
    let script = template;
    
    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      script = script.replace(regex, String(value || ""));
    });

    return script;
  }

  /**
   * Make a simple recorded call with text-to-speech
   */
  async makeSimpleCall(
    tenantId: string,
    options: MakeCallOptions
  ): Promise<CallResponse> {
    try {
      const config = await this.getConfig(tenantId);
      if (!config) {
        return {
          success: false,
          error: "Telecmi is not configured or inactive for this tenant",
        };
      }

      // Initialize Piopiy client
      console.log(`[TelecmiService] Initializing Piopiy client:`, {
        appIdType: typeof config.appId,
        appIdValue: config.appId,
        appSecretType: typeof config.appSecret,
        appSecretLength: config.appSecret?.length || 0,
      });
      // Note: Piopiy TS definitions say string but runtime checks for number
      // Piopiy SDK expects appId as NUMBER, appSecret as STRING
      const appId = parseInt((config.appId || "").toString());
      const piopiy = new Piopiy(appId, config.appSecret);
      const action = new PiopiyAction();

      // Build the script from template
      let scriptText = options.scriptText;
      if (!scriptText && options.templateId) {
        const template = await this.storage.getCallTemplateById(options.templateId);
        if (template) {
          scriptText = this.buildScript(template.scriptText, options.context || {});
        }
      }

      if (!scriptText) {
        return {
          success: false,
          error: "No script text or template provided",
        };
      }

      // Check if user has a cloned voice and should use ElevenLabs TTS
      let useElevenLabsAudio = false;
      let audioUrl: string | undefined;

      console.log(`[TelecmiService] Voice clone check params:`, {
        userId: options.userId,
        hasBaseUrl: !!options.baseUrl,
        tenantId,
      });

      if (options.userId && options.baseUrl) {
        try {
          const voiceClone = await this.storage.getVoiceCloneByUserId(tenantId, options.userId);
          console.log(`[TelecmiService] Voice clone lookup result:`, {
            found: !!voiceClone,
            status: voiceClone?.status,
            elevenLabsVoiceId: voiceClone?.elevenLabsVoiceId,
            isDefault: voiceClone?.isDefault,
          });
          if (voiceClone && voiceClone.status === "active" && voiceClone.elevenLabsVoiceId) {
            console.log(`[TelecmiService] Found cloned voice for user ${options.userId}, generating ElevenLabs audio`);
            
            const audioResult = await this.generateCallAudio(
              tenantId,
              options.userId,
              scriptText,
              options.baseUrl
            );
            
            if (audioResult.success && audioResult.audioUrl) {
              useElevenLabsAudio = true;
              audioUrl = audioResult.audioUrl;
              console.log(`[TelecmiService] Using ElevenLabs cloned voice audio: ${audioUrl}`);
            } else {
              console.warn(`[TelecmiService] ElevenLabs audio generation failed: ${audioResult.error}, falling back to Telecmi TTS`);
            }
          }
        } catch (error) {
          console.warn(`[TelecmiService] Error checking voice clone, falling back to Telecmi TTS:`, error);
        }
      } else {
        console.log(`[TelecmiService] Skipping voice clone check - userId: ${options.userId}, baseUrl: ${options.baseUrl ? 'present' : 'missing'}`);
      }

      // Configure PCMO actions for simple call
      if (useElevenLabsAudio && audioUrl) {
        // Bypass SDK validation by directly pushing play action to PCMO array
        // Piopiy SDK's playMusic() validates URL ending, but signed URLs have query params
        const pcmoActions = action.PCMO() as any[];
        pcmoActions.push({
          action: "play",
          file_name: audioUrl
        });
        console.log(`[TelecmiService] Using direct PCMO play action with cloned voice audio`);
      } else {
        // Fall back to Telecmi's built-in TTS
        action.speak(scriptText);
        console.log(`[TelecmiService] Using Telecmi speak() TTS`);
      }
      action.record(); // Enable recording

      // Normalize phone numbers with +91 prefix for proper Nation Capacity routing
      const normalizedTo = this.normalizePhoneNumber(options.to);
      const normalizedFrom = this.normalizePhoneNumber(config.fromNumber);

      // Convert phone numbers to NUMBER type (PIOPIY SDK requirement)
      // Remove + and convert to number
      const toNumber = Number(normalizedTo.replace(/\+/g, ''));
      const fromNumber = Number(normalizedFrom.replace(/\+/g, ''));

      console.log(`[TelecmiService] Phone numbers normalized and converted:`, {
        toOriginal: options.to,
        toNormalized: normalizedTo,
        toNumber,
        toType: typeof toNumber,
        fromOriginal: config.fromNumber,
        fromNormalized: normalizedFrom,
        fromNumber,
        fromType: typeof fromNumber,
        pcmoType: typeof action.PCMO(),
        pcmoIsArray: Array.isArray(action.PCMO()),
      });

      // Make the call (use as any for type mismatch: TS defs say string, runtime needs number)
      const response = await piopiy.voice.call(
        toNumber as any,
        fromNumber as any,
        action.PCMO(),
        {
          duration: 300, // 5 minutes max
          timeout: 40,
          loop: 1,
          record: true,
        }
      );

      console.log(`[TelecmiService] API Response:`, JSON.stringify(response, null, 2));

      // Piopiy API returns cmi_code instead of code
      const statusCode = (response as any).cmi_code || response.code;
      
      if (statusCode === 200) {
        return {
          success: true,
          requestId: response.request_id || response.data?.request_id,
          message: "Call initiated successfully",
        };
      }

      console.error(`[TelecmiService] Call failed with response:`, {
        code: statusCode,
        message: response.data?.message,
        fullResponse: response,
      });

      return {
        success: false,
        error: response.data?.message || `Call initiation failed (code: ${statusCode})`,
      };
    } catch (error: any) {
      console.error("[TelecmiService] Simple call error:", error);
      return {
        success: false,
        error: error.message || "Failed to initiate call",
      };
    }
  }

  /**
   * Make an AI-powered call with streaming
   */
  async makeAICall(
    tenantId: string,
    options: MakeCallOptions,
    streamUrl: string
  ): Promise<CallResponse> {
    try {
      const config = await this.getConfig(tenantId);
      if (!config) {
        return {
          success: false,
          error: "Telecmi is not configured or inactive for this tenant",
        };
      }

      // Initialize Piopiy client
      console.log(`[TelecmiService] Initializing Piopiy client:`, {
        appIdType: typeof config.appId,
        appIdValue: config.appId,
        appSecretType: typeof config.appSecret,
        appSecretLength: config.appSecret?.length || 0,
      });
      // Note: Piopiy TS definitions say string but runtime checks for number
      // Piopiy SDK expects appId as NUMBER, appSecret as STRING
      const appId = parseInt((config.appId || "").toString());
      const piopiy = new Piopiy(appId, config.appSecret);
      const action = new PiopiyAction();

      // Initial greeting
      let greeting = "Hello! How can I assist you today?";
      if (options.language === "hindi") {
        greeting = "Namaste! Main aapki kaise madad kar sakta hoon?";
      } else if (options.language === "hinglish") {
        greeting = "Hello! Main aapki help karne ke liye yahaan hoon.";
      }

      // Configure AI streaming
      action.speak(greeting);
      action.stream(streamUrl, {
        listen_mode: "both", // Listen to both caller and callee
        voice_quality: "8000",
        stream_on_answer: true,
      });
      action.record(); // Enable recording

      // Normalize phone numbers with +91 prefix for proper Nation Capacity routing
      const normalizedTo = this.normalizePhoneNumber(options.to);
      const normalizedFrom = this.normalizePhoneNumber(config.fromNumber);

      // Convert phone numbers to NUMBER type (PIOPIY SDK requirement)
      const toNumber = Number(normalizedTo.replace(/\+/g, ''));
      const fromNumber = Number(normalizedFrom.replace(/\+/g, ''));

      console.log(`[TelecmiService] AI Call - Phone numbers normalized:`, {
        toOriginal: options.to,
        toNormalized: normalizedTo,
        fromOriginal: config.fromNumber,
        fromNormalized: normalizedFrom,
      });

      // Make the call with AI streaming (use as any for type mismatch)
      const response = await piopiy.voice.call(
        toNumber as any,
        fromNumber as any,
        action.PCMO(),
        {
          duration: 600, // 10 minutes max for AI calls
          timeout: 40,
          loop: 1,
          record: true,
        }
      );

      console.log(`[TelecmiService] AI Call API Response:`, JSON.stringify(response, null, 2));

      // Piopiy API returns cmi_code instead of code
      const statusCode = (response as any).cmi_code || response.code;

      if (statusCode === 200) {
        return {
          success: true,
          requestId: response.request_id || response.data?.request_id,
          message: "AI call initiated successfully",
        };
      }

      console.error(`[TelecmiService] AI Call failed with response:`, {
        code: statusCode,
        message: response.data?.message,
        fullResponse: response,
      });

      return {
        success: false,
        error: response.data?.message || `AI call initiation failed (code: ${statusCode})`,
      };
    } catch (error: any) {
      console.error("[TelecmiService] AI call error:", error);
      return {
        success: false,
        error: error.message || "Failed to initiate AI call",
      };
    }
  }

  /**
   * Test Telecmi connection by validating credentials
   * Validates credentials format and initialization (note: full API verification happens during actual calls)
   */
  async testConnection(tenantId: string): Promise<{
    connected: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const config = await this.getConfig(tenantId);
      if (!config) {
        return {
          connected: false,
          message: "Telecmi is not configured for this tenant. Please add your API credentials first.",
        };
      }

      // Trim and validate credentials
      const appIdStr = (config.appId || "").toString().trim();
      const appSecret = (config.appSecret || "").trim();
      
      // Piopiy SDK expects appId as NUMBER, appSecret as STRING
      const appId = parseInt(appIdStr);
      
      console.log(`[TelecmiService] Testing connection for tenant ${tenantId}`);
      console.log(`[TelecmiService] App ID: ${appId} (type: ${typeof appId}, isNumber: ${!isNaN(appId)})`);
      console.log(`[TelecmiService] App Secret length: ${appSecret.length}, first char code: ${appSecret.charCodeAt(0)}`);
      
      // Check for empty or whitespace-only credentials
      if (!appIdStr || !appSecret) {
        return {
          connected: false,
          message: "App ID and App Secret cannot be empty. Please check your configuration.",
        };
      }
      
      // Check if appId is a valid number
      if (isNaN(appId)) {
        return {
          connected: false,
          message: "App ID must be a valid number. Please check your configuration.",
        };
      }
      
      // Check for hidden whitespace characters in secret
      if (appSecret !== appSecret.trim()) {
        return {
          connected: false,
          message: "Your App Secret contains hidden whitespace characters. Please re-save your configuration to fix this.",
          details: {
            hint: "Try copying the secret again from Telecmi portal and paste it fresh"
          }
        };
      }
      
      try {
        // Initialize Piopiy client with correct types: NUMBER for appId, STRING for secret
        const piopiy = new Piopiy(appId, appSecret);
        
        // If we successfully initialize Piopiy without errors, credentials are valid
        console.log(`[TelecmiService] ✅ Piopiy client initialized successfully for tenant ${tenantId}`);
        
        // Test generating a PCMO action to verify the SDK is working
        try {
          const action = new PiopiyAction();
          action.speak("Connection test");
          const pcmo = action.PCMO();
          console.log(`[TelecmiService] ✅ PCMO generation successful, SDK is functional`);
        } catch (pcmoError: any) {
          console.warn(`[TelecmiService] PCMO generation warning (non-critical):`, pcmoError.message);
        }
        
        return {
          connected: true,
          message: "Connection successful! Your Telecmi credentials are properly configured.",
          details: {
            appId: appId,
            fromNumber: config.fromNumber,
            status: "Connected"
          }
        };
      } catch (initError: any) {
        console.error(`[TelecmiService] ❌ Piopiy initialization failed:`, initError);
        
        // Provide helpful error messages
        let errorMessage = "Failed to initialize Telecmi client. ";
        if (initError.message?.includes("required") || initError.message?.includes("undefined")) {
          errorMessage += "App ID or App Secret is missing or invalid format.";
        } else if (initError.message?.includes("auth") || initError.message?.includes("401")) {
          errorMessage += "Authentication failed. Please verify your credentials in Telecmi portal.";
        } else {
          errorMessage += "Please check your App ID and App Secret are correct.";
        }
        
        return {
          connected: false,
          message: errorMessage,
          details: {
            error: initError.message || "Invalid credentials",
            appId: appId,
            hint: "Verify credentials match exactly in Telecmi portal: https://telecmi.com"
          }
        };
      }
    } catch (error: any) {
      console.error("[TelecmiService] Connection test error:", error);
      return {
        connected: false,
        message: "Connection test failed. Please verify your configuration.",
        details: {
          error: error.message || "Unknown error"
        }
      };
    }
  }

  /**
   * Validate webhook request signature
   */
  private validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("[TelecmiService] Signature validation error:", error);
      return false;
    }
  }

  /**
   * Handle Telecmi webhook for call events
   */
  async handleWebhook(
    tenantId: string,
    eventType: "answered" | "missed" | "cdr",
    rawBody: string,
    payload: any,
    signature?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get tenant config for webhook validation
      const config = await this.getConfig(tenantId);
      if (!config) {
        return {
          success: false,
          error: "Telecmi not configured for this tenant",
        };
      }

      // Validate webhook signature (MANDATORY for security)
      if (!signature) {
        console.warn(`[TelecmiService] Missing webhook signature for tenant ${tenantId}`);
        return {
          success: false,
          error: "Missing webhook signature",
        };
      }

      if (!config.webhookSecret) {
        console.warn(`[TelecmiService] Missing webhook secret for tenant ${tenantId}`);
        return {
          success: false,
          error: "Webhook secret not configured",
        };
      }

      const isValid = this.validateWebhookSignature(
        rawBody,
        signature,
        config.webhookSecret
      );

      if (!isValid) {
        console.warn(`[TelecmiService] Invalid webhook signature for tenant ${tenantId}`);
        return {
          success: false,
          error: "Invalid webhook signature",
        };
      }

      console.log(`[TelecmiService] Webhook ${eventType} for tenant ${tenantId}:`, payload);

      // Extract call details from payload
      const {
        request_id,
        conversation_uuid,
        status,
        from,
        to,
        duration,
        recording_url,
      } = payload;

      if (!request_id) {
        return {
          success: false,
          error: "Missing request_id in webhook payload",
        };
      }

      // Find the call log by request_id (must belong to this tenant)
      const callLog = await this.storage.getCallLogByTelecmiRequestId(request_id);
      
      if (!callLog) {
        console.warn(`[TelecmiService] Call log not found for request_id: ${request_id}`);
        return {
          success: false,
          error: "Call log not found",
        };
      }

      // Verify tenant ownership
      if (callLog.tenantId !== tenantId) {
        console.warn(`[TelecmiService] Tenant mismatch for call log ${callLog.id}`);
        return {
          success: false,
          error: "Unauthorized: Tenant mismatch",
        };
      }

      // Update call log based on event type
      const updates: any = {
        telecmiConversationUuid: conversation_uuid,
        updatedAt: new Date(),
      };

      switch (eventType) {
        case "answered":
          updates.status = "answered";
          break;
        case "missed":
          updates.status = "no_answer";
          break;
        case "cdr":
          updates.status = "completed";
          updates.duration = duration;
          updates.recordingUrl = recording_url;
          break;
      }

      await this.storage.updateCallLog(callLog.tenantId, callLog.id, updates);

      return { success: true };
    } catch (error: any) {
      console.error(`[TelecmiService] Webhook ${eventType} error:`, error);
      return {
        success: false,
        error: error.message || "Webhook processing failed",
      };
    }
  }
}
