import type { IStorage } from "../storage";
import { ConversationalAIService, type ConversationTurn } from "./conversationalAI";
import { parseVoiceCommand } from "./commandParser";

export interface OrchestratorRequest {
  message: string;
  tenantId: string;
  userId: string;
  conversationHistory?: ConversationTurn[];
  isVoice?: boolean;
  context?: string;
}

export interface OrchestratorResponse {
  text: string;
  type: "quick_command" | "conversation";
  confidence: number;
  command?: any; // Parsed command if quick action
  requiresAction?: boolean;
  actionType?: string;
  actionPayload?: any;
  data?: any; // Additional data for UI
}

/**
 * AssistantOrchestrator routes user queries between:
 * 1. Quick commands (create lead, invoice, etc.) - handled by existing parser
 * 2. Conversational AI (questions, analysis, insights) - handled by GPT
 */
export class AssistantOrchestrator {
  private conversationalAI: ConversationalAIService;
  private quickCommandThreshold = 0.7; // Confidence threshold for quick commands

  constructor(
    private storage: IStorage,
    private openaiApiKey?: string
  ) {
    this.conversationalAI = new ConversationalAIService(storage, openaiApiKey);
  }

  /**
   * Update OpenAI API key
   */
  setOpenAIKey(apiKey: string) {
    this.conversationalAI.setApiKey(apiKey);
  }

  /**
   * Process user message and route to appropriate handler
   */
  async process(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const { message, tenantId, conversationHistory = [] } = request;

    // Step 1: Try to parse as quick command first
    const quickCommand = parseVoiceCommand(message);
    
    // Step 2: Determine if it's a high-confidence quick command
    const isQuickCommand = this.isHighConfidenceCommand(quickCommand);

    if (isQuickCommand && quickCommand.type !== "unknown") {
      // Handle as quick command
      return {
        text: this.generateQuickCommandResponse(quickCommand),
        type: "quick_command",
        confidence: 0.9,
        command: quickCommand,
        requiresAction: true,
        actionType: quickCommand.type,
        actionPayload: quickCommand.entities,
      };
    }

    // Step 3: Route to conversational AI if not a quick command
    // OR if GPT is not configured, provide a fallback
    if (!this.conversationalAI.isConfigured()) {
      return this.handleWithoutGPT(message, quickCommand);
    }

    try {
      // Get enhanced context if needed
      const { additionalContext } = await this.conversationalAI.getEnhancedContext(
        tenantId,
        message
      );

      // Add enhanced context to conversation if available
      const enhancedHistory = [...conversationHistory];
      if (additionalContext) {
        enhancedHistory.push({
          speaker: "assistant",
          message: `[Context: ${additionalContext}]`,
          timestamp: new Date(),
        });
      }

      // Process with conversational AI
      const aiResponse = await this.conversationalAI.processQuery(
        message,
        tenantId,
        enhancedHistory
      );

      return {
        text: aiResponse.text,
        type: "conversation",
        confidence: aiResponse.confidence,
        requiresAction: aiResponse.requiresAction,
        actionType: aiResponse.actionType,
        actionPayload: aiResponse.actionPayload,
      };
    } catch (error: any) {
      console.error("[Orchestrator] Conversational AI error:", error);
      
      // Fallback to basic response if GPT fails
      return this.handleWithoutGPT(message, quickCommand);
    }
  }

  /**
   * Determine if parsed command has high confidence for quick action
   */
  private isHighConfidenceCommand(command: any): boolean {
    // Known action commands
    const actionCommands = [
      "create_lead",
      "create_quotation",
      "create_customer",
      "create_invoice",
    ];

    if (actionCommands.includes(command.type)) {
      // Must have required entities
      if (command.type === "create_lead" && command.entities.companyName) {
        return true;
      }
      if (command.type === "create_customer" && command.entities.companyName) {
        return true;
      }
      if (command.type === "create_quotation" && command.entities.customerName) {
        return true;
      }
      if (command.type === "create_invoice" && command.entities.customerName) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate response text for quick commands
   */
  private generateQuickCommandResponse(command: any): string {
    switch (command.type) {
      case "create_lead":
        return `Creating a new lead for ${command.entities.companyName}...`;
      case "create_customer":
        return `Adding ${command.entities.companyName} as a new customer...`;
      case "create_quotation":
        return `Preparing quotation for ${command.entities.customerName}...`;
      case "create_invoice":
        return `Generating invoice for ${command.entities.customerName}...`;
      default:
        return "Processing your request...";
    }
  }

  /**
   * Fallback handler when GPT is not configured
   */
  private handleWithoutGPT(message: string, parsedCommand: any): OrchestratorResponse {
    // If we have a parsed command but it's not high confidence
    if (parsedCommand.type !== "unknown") {
      return {
        text: `I understood you want to ${parsedCommand.type.replace(/_/g, " ")}, but I need more details. Please try again with more specific information, or use the form to create manually.`,
        type: "quick_command",
        confidence: 0.5,
        command: parsedCommand,
      };
    }

    // Generic fallback for questions/queries
    const lowerMessage = message.toLowerCase();
    
    // Simple pattern matching for common questions
    if (lowerMessage.includes("revenue") || lowerMessage.includes("sales")) {
      return {
        text: "I can help you check revenue! However, for detailed financial analysis, please configure the AI assistant in settings to enable conversational queries.",
        type: "conversation",
        confidence: 0.4,
      };
    }

    if (lowerMessage.includes("customer") || lowerMessage.includes("client")) {
      return {
        text: "I can help with customer information! For intelligent conversations about your business, please enable AI features in assistant settings.",
        type: "conversation",
        confidence: 0.4,
      };
    }

    if (lowerMessage.includes("invoice") || lowerMessage.includes("payment")) {
      return {
        text: "I can assist with invoices and payments! For natural conversations, configure the AI assistant in settings.",
        type: "conversation",
        confidence: 0.4,
      };
    }

    // Default fallback
    return {
      text: "I can help you with:\n- Creating leads, customers, quotations, and invoices (just tell me what you need)\n- For detailed business questions and insights, please configure AI assistant in settings",
      type: "conversation",
      confidence: 0.3,
    };
  }

  /**
   * Check if service is fully configured
   */
  isFullyConfigured(): boolean {
    return this.conversationalAI.isConfigured();
  }
}
