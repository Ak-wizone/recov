export interface ParsedCommand {
  type: 
    | "create_lead" 
    | "create_quotation" 
    | "create_customer" 
    | "create_invoice" 
    | "top_debtors"
    | "top_customers_month"
    | "top_payments_month"
    | "today_collection"
    | "weekly_revenue"
    | "monthly_revenue"
    | "pending_invoices"
    | "overdue_invoices"
    | "total_outstanding"
    | "recent_leads"
    | "conversion_rate"
    | "unknown";
  confidence: number; // 0-100
  entities: {
    name?: string;
    phone?: string;
    email?: string;
    amount?: number;
    date?: string;
    description?: string;
    limit?: number;
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
  
  // Top Debtors Report
  else if (
    text.includes("top debtor") ||
    text.includes("top debt") ||
    text.includes("highest debt") ||
    text.includes("biggest debt") ||
    text.includes("sabse jyada debt") ||
    text.includes("sabse bada debtor")
  ) {
    result.type = "top_debtors";
    result.confidence = 80;
  }
  
  // Top Customers of Month
  else if (
    text.includes("top customer") ||
    text.includes("best customer") ||
    text.includes("highest customer") ||
    text.includes("sabse acha customer") ||
    text.includes("top clients") ||
    text.includes("month ke top customer")
  ) {
    result.type = "top_customers_month";
    result.confidence = 80;
  }
  
  // Top Payments of Month
  else if (
    text.includes("top payment") ||
    text.includes("highest payment") ||
    text.includes("biggest payment") ||
    text.includes("largest payment") ||
    text.includes("sabse bada payment") ||
    text.includes("month ke top payment")
  ) {
    result.type = "top_payments_month";
    result.confidence = 80;
  }
  
  // Today's Collection
  else if (
    text.includes("today collection") ||
    text.includes("aaj ka collection") ||
    text.includes("aaj ki payment") ||
    text.includes("today payment") ||
    text.includes("today's collection")
  ) {
    result.type = "today_collection";
    result.confidence = 85;
  }
  
  // Weekly Revenue
  else if (
    text.includes("week") && (text.includes("revenue") || text.includes("collection") || text.includes("sales")) ||
    text.includes("is hafte") ||
    text.includes("this week") ||
    text.includes("weekly report")
  ) {
    result.type = "weekly_revenue";
    result.confidence = 80;
  }
  
  // Monthly Revenue
  else if (
    text.includes("month") && (text.includes("revenue") || text.includes("collection") || text.includes("sales")) ||
    text.includes("is mahine") ||
    text.includes("this month") ||
    text.includes("monthly report") ||
    text.includes("month ka revenue")
  ) {
    result.type = "monthly_revenue";
    result.confidence = 80;
  }
  
  // Pending Invoices
  else if (
    text.includes("pending invoice") ||
    text.includes("unpaid invoice") ||
    text.includes("baaki invoice") ||
    text.includes("pending bill") ||
    text.includes("outstanding invoice")
  ) {
    result.type = "pending_invoices";
    result.confidence = 85;
  }
  
  // Overdue Invoices
  else if (
    text.includes("overdue") ||
    text.includes("late payment") ||
    text.includes("due invoice") ||
    text.includes("delayed payment") ||
    text.includes("time pass ho gaye")
  ) {
    result.type = "overdue_invoices";
    result.confidence = 85;
  }
  
  // Total Outstanding
  else if (
    text.includes("total outstanding") ||
    text.includes("total debt") ||
    text.includes("total baaki") ||
    text.includes("kitna baaki hai") ||
    text.includes("how much pending")
  ) {
    result.type = "total_outstanding";
    result.confidence = 85;
  }
  
  // Recent Leads
  else if (
    text.includes("recent lead") ||
    text.includes("new lead") ||
    text.includes("latest lead") ||
    text.includes("haal ke lead")
  ) {
    result.type = "recent_leads";
    result.confidence = 80;
  }
  
  // Conversion Rate
  else if (
    text.includes("conversion") ||
    text.includes("lead to customer") ||
    text.includes("success rate") ||
    text.includes("kitne convert hue")
  ) {
    result.type = "conversion_rate";
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

  // Extract limit for top reports (top 5, top 10, etc.)
  const limitMatch = text.match(/top\s+(\d+)|(\d+)\s+top/i);
  if (limitMatch) {
    entities.limit = parseInt(limitMatch[1] || limitMatch[2]);
  } else {
    // Default to 5 for top reports
    entities.limit = 5;
  }

  return entities;
}
