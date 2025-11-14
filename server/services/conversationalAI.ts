import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { BusinessContextService, type TenantSnapshot } from "./businessContext";
import type { IStorage } from "../storage";

export interface ConversationTurn {
  speaker: "user" | "assistant";
  message: string;
  timestamp: Date;
}

export interface ConversationalResponse {
  text: string;
  confidence: number;
  requiresAction?: boolean;
  actionType?: string;
  actionPayload?: any;
}

/**
 * ConversationalAIService handles natural language conversations
 * using GPT-4o mini with business context
 */
export class ConversationalAIService {
  private openai: OpenAI | null = null;
  private businessContext: BusinessContextService;
  private callCount: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT = 20; // Max 20 calls per tenant per 5 minutes
  private readonly RATE_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(
    private storage: IStorage,
    private apiKey?: string
  ) {
    this.businessContext = new BusinessContextService(storage);
    
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Initialize or update API key
   */
  setApiKey(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.openai !== null;
  }

  /**
   * Build system prompt with business context
   */
  private buildSystemPrompt(snapshot: TenantSnapshot): string {
    const redacted = this.redactPII(snapshot);
    
    return `You are RECOV, an intelligent business assistant for a payment collection and business management platform. You have access to real-time business data and can help users understand their business performance, manage customers, track payments, and make informed decisions.

**Your Capabilities:**
- Answer questions about business metrics, revenue, customers, invoices, and payments
- Provide insights and analysis on outstanding payments and debtor management
- Help identify trends and patterns in business data
- Offer recommendations for improving cash flow and collections
- Explain business terminology in simple terms
- Support Hindi, English, and Hinglish conversations

**Current Business Snapshot:**
- Total Customers: ${redacted.totalCustomers}
- Total Invoices: ${redacted.totalInvoices}
- Total Revenue: ₹${redacted.totalRevenue.toLocaleString('en-IN')}
- Total Received: ₹${redacted.totalReceived.toLocaleString('en-IN')}
- Outstanding Amount: ₹${redacted.totalOutstanding.toLocaleString('en-IN')}
- Overdue Invoices: ${redacted.overdueInvoices} (₹${redacted.overdueAmount.toLocaleString('en-IN')})

**Top Debtors:**
${redacted.topDebtors.map((d, i) => `${i + 1}. ${d.name}: ₹${d.amount.toLocaleString('en-IN')}`).join('\n')}

**Recent Invoices:**
${redacted.recentInvoices.map(inv => `- Invoice ${inv.invoiceNumber} for ${inv.customerName}: ₹${inv.amount.toLocaleString('en-IN')} (${inv.date})`).join('\n')}

**Guidelines:**
1. Always use the provided business data to answer questions accurately
2. Format currency in Indian Rupees (₹) with proper comma separation
3. Be conversational and friendly, but professional
4. If you don't have specific data, say so clearly - never make up numbers
5. When suggesting actions, be specific and actionable
6. Support code-switching between Hindi and English naturally
7. Keep responses concise but informative (2-3 sentences for simple questions, longer for complex analysis)
8. Use emojis sparingly and only when it adds value

**Response Format:**
- For data queries: Provide clear, specific answers with numbers
- For insights: Explain the significance and potential actions
- For general questions: Be helpful and educational
- Always maintain context from previous messages in the conversation`;
  }

  private redactPII(snapshot: TenantSnapshot): TenantSnapshot {
    // Redact customer names to initials only
    return {
      ...snapshot,
      topDebtors: snapshot.topDebtors.map(d => ({
        ...d,
        name: this.toInitials(d.name)
      })),
      recentInvoices: snapshot.recentInvoices.map(inv => ({
        ...inv,
        customerName: this.toInitials(inv.customerName)
      }))
    };
  }

  private toInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }

  private checkRateLimit(tenantId: string): void {
    const now = Date.now();
    const usage = this.callCount.get(tenantId);
    
    if (!usage || now > usage.resetTime) {
      this.callCount.set(tenantId, { count: 1, resetTime: now + this.RATE_WINDOW });
      return;
    }
    
    if (usage.count >= this.RATE_LIMIT) {
      throw new Error("Rate limit exceeded. Please wait before making more AI requests.");
    }
    
    usage.count += 1;
  }

  /**
   * Process a conversational query with GPT-4
   */
  async processQuery(
    query: string,
    tenantId: string,
    conversationHistory: ConversationTurn[] = []
  ): Promise<ConversationalResponse> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please configure GPT integration in settings.");
    }

    this.checkRateLimit(tenantId);

    try {
      // Get business context
      const snapshot = await this.businessContext.getTenantSnapshot(tenantId);

      // Build conversation messages
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.buildSystemPrompt(snapshot),
        },
      ];

      // Add conversation history (last 10 turns for context)
      const recentHistory = conversationHistory.slice(-10);
      for (const turn of recentHistory) {
        messages.push({
          role: turn.speaker === "user" ? "user" : "assistant",
          content: turn.message,
        });
      }

      // Add current query
      messages.push({
        role: "user",
        content: query,
      });

      // Call GPT-4o mini
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const responseText = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(responseText, query);

      // Check if response requires action
      const { requiresAction, actionType, actionPayload } = this.parseActionIntent(responseText);

      return {
        text: responseText,
        confidence,
        requiresAction,
        actionType,
        actionPayload,
      };
    } catch (error: any) {
      console.error("[ConversationalAI] Error processing query:", error);
      
      // Handle specific errors
      if (error.code === "insufficient_quota") {
        throw new Error("OpenAI API quota exceeded. Please check your API key billing.");
      }
      
      if (error.code === "invalid_api_key") {
        throw new Error("Invalid OpenAI API key. Please update your configuration.");
      }

      throw new Error(`Failed to process conversation: ${error.message}`);
    }
  }

  /**
   * Calculate response confidence (simple heuristic)
   */
  private calculateConfidence(response: string, query: string): number {
    // Base confidence
    let confidence = 0.7;

    // Increase if response contains numbers (likely data-driven)
    if (/\d/.test(response)) {
      confidence += 0.1;
    }

    // Increase if response is reasonably long
    if (response.length > 50 && response.length < 1000) {
      confidence += 0.1;
    }

    // Decrease if response is too short or contains "I don't know"
    if (response.length < 30 || response.toLowerCase().includes("don't know")) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Parse if response suggests an action (e.g., "create invoice", "send reminder")
   */
  private parseActionIntent(response: string): {
    requiresAction: boolean;
    actionType?: string;
    actionPayload?: any;
  } {
    const lowerResponse = response.toLowerCase();

    // Check for action keywords
    const actionKeywords = {
      create_invoice: ["create invoice", "generate invoice", "new invoice"],
      create_lead: ["create lead", "add lead", "new lead"],
      send_reminder: ["send reminder", "follow up", "remind"],
      view_details: ["show details", "view details", "see more"],
    };

    for (const [actionType, keywords] of Object.entries(actionKeywords)) {
      if (keywords.some(keyword => lowerResponse.includes(keyword))) {
        return {
          requiresAction: true,
          actionType,
          actionPayload: null, // Will be populated by orchestrator
        };
      }
    }

    return { requiresAction: false };
  }

  /**
   * Get enhanced context for specific queries
   * This provides detailed data when needed beyond the snapshot
   * ALL customer names are redacted to protect privacy
   */
  async getEnhancedContext(
    tenantId: string,
    query: string
  ): Promise<{ additionalContext: string; data?: any }> {
    const lowerQuery = query.toLowerCase();

    // Customer-related queries
    if (lowerQuery.includes("customer") || lowerQuery.includes("client")) {
      const customers = await this.businessContext.getCustomerDetails(tenantId, 5);
      return {
        additionalContext: `Recent customers: ${customers.map(c => this.toInitials(c.clientName)).join(", ")}`,
        data: customers,
      };
    }

    // Invoice-related queries
    if (lowerQuery.includes("invoice") && lowerQuery.includes("overdue")) {
      const overdueInvoices = await this.businessContext.getInvoiceDetails(tenantId, {
        limit: 5,
        overdue: true,
      });
      return {
        additionalContext: `Overdue invoices: ${overdueInvoices.map(inv => `${inv.invoiceNumber} (${this.toInitials(inv.customerName)}): ₹${inv.invoiceAmount}`).join(", ")}`,
        data: overdueInvoices,
      };
    }

    // Debtor analysis queries
    if (lowerQuery.includes("debtor") || lowerQuery.includes("outstanding") || lowerQuery.includes("pending payment")) {
      const debtors = await this.businessContext.getDebtorAnalysis(tenantId, { limit: 5 });
      return {
        additionalContext: `Top debtors: ${debtors.map(d => `${this.toInitials(d.customerName)}: ₹${d.outstandingAmount}`).join(", ")}`,
        data: debtors,
      };
    }

    return { additionalContext: "", data: null };
  }
}
