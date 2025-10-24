import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import QRCode from "qrcode";
import { EventEmitter } from "events";

interface WhatsAppWebClient {
  client: Client;
  qrCode: string | null;
  status: "disconnected" | "qr" | "connected" | "ready";
  eventEmitter: EventEmitter;
}

class WhatsAppWebService {
  private clients: Map<string, WhatsAppWebClient> = new Map();

  async initializeClient(tenantId: string): Promise<void> {
    if (this.clients.has(tenantId)) {
      const existing = this.clients.get(tenantId)!;
      if (existing.status === "ready") {
        return; // Already connected
      }
      // Destroy existing client if not ready
      await existing.client.destroy();
      this.clients.delete(tenantId);
    }

    const eventEmitter = new EventEmitter();
    const clientData: WhatsAppWebClient = {
      client: null as any,
      qrCode: null,
      status: "disconnected",
      eventEmitter,
    };

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `tenant-${tenantId}`,
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      },
    });

    clientData.client = client;
    this.clients.set(tenantId, clientData);

    client.on("qr", async (qr) => {
      console.log(`[WhatsApp Web] QR Code generated for tenant ${tenantId}`);
      const qrCodeDataUrl = await QRCode.toDataURL(qr);
      clientData.qrCode = qrCodeDataUrl;
      clientData.status = "qr";
      eventEmitter.emit("qr", qrCodeDataUrl);
    });

    client.on("ready", () => {
      console.log(`[WhatsApp Web] Client is ready for tenant ${tenantId}`);
      clientData.status = "ready";
      clientData.qrCode = null;
      eventEmitter.emit("ready");
    });

    client.on("authenticated", () => {
      console.log(`[WhatsApp Web] Authenticated for tenant ${tenantId}`);
      clientData.status = "connected";
      eventEmitter.emit("authenticated");
    });

    client.on("auth_failure", (msg) => {
      console.error(`[WhatsApp Web] Authentication failure for tenant ${tenantId}:`, msg);
      clientData.status = "disconnected";
      eventEmitter.emit("auth_failure", msg);
    });

    client.on("disconnected", (reason) => {
      console.log(`[WhatsApp Web] Disconnected for tenant ${tenantId}:`, reason);
      clientData.status = "disconnected";
      clientData.qrCode = null;
      eventEmitter.emit("disconnected", reason);
    });

    await client.initialize();
  }

  async sendMessage(tenantId: string, phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    const clientData = this.clients.get(tenantId);

    if (!clientData) {
      return {
        success: false,
        error: "WhatsApp Web not initialized. Please scan the QR code first.",
      };
    }

    if (clientData.status !== "ready") {
      return {
        success: false,
        error: `WhatsApp Web is ${clientData.status}. ${clientData.status === "qr" ? "Please scan the QR code." : "Please wait for connection."}`,
      };
    }

    try {
      // Format phone number: remove non-digits, add country code if missing
      let formattedNumber = phoneNumber.replace(/\D/g, "");
      
      // If number doesn't start with country code, assume India (+91)
      if (!formattedNumber.startsWith("91") && formattedNumber.length === 10) {
        formattedNumber = "91" + formattedNumber;
      }

      const chatId = `${formattedNumber}@c.us`;
      await clientData.client.sendMessage(chatId, message);

      return { success: true };
    } catch (error: any) {
      console.error(`[WhatsApp Web] Error sending message for tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error.message || "Failed to send message",
      };
    }
  }

  getStatus(tenantId: string): { status: string; qrCode: string | null } {
    const clientData = this.clients.get(tenantId);
    
    if (!clientData) {
      return {
        status: "not_initialized",
        qrCode: null,
      };
    }

    return {
      status: clientData.status,
      qrCode: clientData.qrCode,
    };
  }

  async disconnect(tenantId: string): Promise<void> {
    const clientData = this.clients.get(tenantId);
    
    if (clientData) {
      await clientData.client.destroy();
      this.clients.delete(tenantId);
      console.log(`[WhatsApp Web] Disconnected and removed client for tenant ${tenantId}`);
    }
  }

  getEventEmitter(tenantId: string): EventEmitter | null {
    return this.clients.get(tenantId)?.eventEmitter || null;
  }
}

export const whatsappWebService = new WhatsAppWebService();
