import { Piopiy, PiopiyAction } from "piopiy";
import type { IStorage } from "../storage";
import { decryptApiKey, encryptApiKey } from "../encryption";
import crypto from "crypto";

interface TelecmiConfig {
  appId: string;
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
}

interface CallResponse {
  success: boolean;
  requestId?: string;
  message?: string;
  error?: string;
}

export class TelecmiService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
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
      // Decrypt both app secret and webhook secret
      const decryptedAppSecret = decryptApiKey(config.appSecret);
      const decryptedWebhookSecret = config.webhookSecret ? decryptApiKey(config.webhookSecret) : undefined;

      return {
        appId: config.appId,
        appSecret: decryptedAppSecret,
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
      const piopiy = new Piopiy(config.appId, config.appSecret);
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

      // Configure PCMO actions for simple call
      action.speak(scriptText);
      action.record(); // Enable recording

      // Make the call
      const response = await piopiy.voice.call(
        options.to,
        config.fromNumber,
        action.PCMO(),
        {
          duration: 300, // 5 minutes max
          timeout: 40,
          loop: 1,
          record: true,
        }
      );

      if (response.code === 200) {
        return {
          success: true,
          requestId: response.data?.request_id,
          message: "Call initiated successfully",
        };
      }

      return {
        success: false,
        error: response.data?.message || "Call initiation failed",
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
      const piopiy = new Piopiy(config.appId, config.appSecret);
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

      // Make the call with AI streaming
      const response = await piopiy.voice.call(
        options.to,
        config.fromNumber,
        action.PCMO(),
        {
          duration: 600, // 10 minutes max for AI calls
          timeout: 40,
          loop: 1,
          record: true,
        }
      );

      if (response.code === 200) {
        return {
          success: true,
          requestId: response.data?.request_id,
          message: "AI call initiated successfully",
        };
      }

      return {
        success: false,
        error: response.data?.message || "AI call initiation failed",
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
