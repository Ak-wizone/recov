export interface ParsedCommand {
  type: "create_lead" | "create_quotation" | "create_customer" | "create_invoice" | "unknown";
  confidence: number; // 0-100
  entities: {
    name?: string;
    phone?: string;
    email?: string;
    amount?: number;
    date?: string;
    description?: string;
  };
  rawText: string;
}

export function parseVoiceCommand(transcript: string): ParsedCommand {
  const text = transcript.toLowerCase().trim();
  
  const result: ParsedCommand = {
    type: "unknown",
    confidence: 0,
    entities: {},
    rawText: transcript,
  };

  // Lead creation patterns
  if (
    text.includes("create lead") ||
    text.includes("add lead") ||
    text.includes("new lead") ||
    text.includes("lead for")
  ) {
    result.type = "create_lead";
    result.confidence = 75;
  }
  
  // Quotation creation patterns
  else if (
    text.includes("create quotation") ||
    text.includes("add quotation") ||
    text.includes("new quotation") ||
    text.includes("quote for")
  ) {
    result.type = "create_quotation";
    result.confidence = 75;
  }
  
  // Customer creation patterns
  else if (
    text.includes("create customer") ||
    text.includes("add customer") ||
    text.includes("new customer") ||
    text.includes("customer named")
  ) {
    result.type = "create_customer";
    result.confidence = 75;
  }
  
  // Invoice creation patterns
  else if (
    text.includes("create invoice") ||
    text.includes("add invoice") ||
    text.includes("new invoice") ||
    text.includes("invoice for")
  ) {
    result.type = "create_invoice";
    result.confidence = 75;
  }

  // Extract entities
  result.entities = extractEntities(transcript);

  return result;
}

function extractEntities(text: string): ParsedCommand["entities"] {
  const entities: ParsedCommand["entities"] = {};

  // Extract phone number (Indian format: 10 digits)
  const phoneMatch = text.match(/\b\d{10}\b/);
  if (phoneMatch) {
    entities.phone = phoneMatch[0];
  }

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    entities.email = emailMatch[0];
  }

  // Extract amount (₹, rupees, rs, etc.)
  const amountMatch = text.match(/(?:₹|rupees?|rs\.?)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  }

  // Extract name (simple heuristic: capitalized words before phone/email/keywords)
  const nameMatch = text.match(/(?:named?|called?|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (nameMatch) {
    entities.name = nameMatch[1];
  }

  return entities;
}
