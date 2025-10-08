import { type WhatsappConfig } from "@shared/schema";
import fetch from "node-fetch";

export function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    rendered = rendered.replace(regex, String(value || ""));
  }
  
  return rendered;
}

interface WhatsAppMessagePayload {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    switch (config.provider) {
      case "twilio":
        return await sendViaTwilio(config, to, message);
      case "wati":
        return await sendViaWati(config, to, message);
      case "meta":
        return await sendViaMeta(config, to, message);
      case "interakt":
        return await sendViaInterakt(config, to, message);
      case "aisensy":
        return await sendViaAisensy(config, to, message);
      case "other":
        return await sendViaCustomAPI(config, to, message);
      default:
        throw new Error(`Unsupported WhatsApp provider: ${config.provider}`);
    }
  } catch (error: any) {
    console.error("WhatsApp send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp message"
    };
  }
}

async function sendViaTwilio(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config.accountSid || !config.apiKey) {
    throw new Error("Twilio configuration incomplete. Need Account SID and Auth Token.");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.apiKey}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${config.fromNumber}`,
      To: `whatsapp:${to}`,
      Body: message,
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Twilio API error");
  }

  return {
    success: true,
    messageId: data.sid,
  };
}

async function sendViaWati(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = config.apiUrl || "https://live-server.wati.io/api/v1/sendSessionMessage";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      whatsappNumber: to.replace(/[^0-9]/g, ""),
      message: message,
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "WATI API error");
  }

  return {
    success: true,
    messageId: data.messageId || data.id,
  };
}

async function sendViaMeta(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config.phoneNumberId) {
    throw new Error("Meta WhatsApp configuration incomplete. Need Phone Number ID.");
  }

  const url = `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^0-9]/g, ""),
      type: "text",
      text: {
        body: message,
      },
    }),
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Meta WhatsApp API error");
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
  };
}

async function sendViaInterakt(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = config.apiUrl || "https://api.interakt.ai/v1/public/message/";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      countryCode: "+91",
      phoneNumber: to.replace(/[^0-9]/g, ""),
      type: "Text",
      data: {
        message: message,
      },
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Interakt API error");
  }

  return {
    success: true,
    messageId: data.result?.messageId,
  };
}

async function sendViaAisensy(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = config.apiUrl || "https://backend.aisensy.com/campaign/t1/api";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: config.apiKey,
      campaignName: "text_message",
      destination: to.replace(/[^0-9]/g, ""),
      userName: "User",
      media: {},
      templateParams: [],
      source: "api",
      message: message,
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "AiSensy API error");
  }

  return {
    success: true,
    messageId: data.messageId,
  };
}

async function sendViaCustomAPI(
  config: WhatsappConfig,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config.apiUrl) {
    throw new Error("Custom API URL is required for 'other' provider");
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: to,
      message: message,
      from: config.fromNumber,
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Custom API error");
  }

  return {
    success: true,
    messageId: data.messageId || data.id,
  };
}

export async function testWhatsAppConnection(
  config: WhatsappConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.provider) {
      case "twilio":
        if (!config.accountSid || !config.apiKey) {
          return { success: false, error: "Twilio configuration incomplete" };
        }
        return { success: true };
      
      case "wati":
      case "meta":
      case "interakt":
      case "aisensy":
      case "other":
        if (!config.apiKey) {
          return { success: false, error: "API Key is required" };
        }
        return { success: true };
      
      default:
        return { success: false, error: "Unsupported provider" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
