// Email template variables for all modules

export interface VariableDefinition {
  name: string;
  variable: string;
  description: string;
  example: string;
}

export interface VariableCategory {
  category: string;
  variables: VariableDefinition[];
}

// Common company variables (fetched from company profile)
const companyVariables: VariableDefinition[] = [
  { name: "Company Name", variable: "{companyName}", description: "Your business name", example: "ACME Corp" },
  { name: "Company Logo", variable: "{companyLogo}", description: "Company logo URL", example: "https://example.com/logo.png" },
  { name: "Company Address", variable: "{companyAddress}", description: "Business address", example: "123 Business St, City, State" },
  { name: "Company Phone", variable: "{companyPhone}", description: "Contact phone number", example: "+91 1234567890" },
  { name: "Company Email", variable: "{companyEmail}", description: "Support email address", example: "support@company.com" },
  { name: "Company Website", variable: "{companyWebsite}", description: "Website URL", example: "www.company.com" },
  { name: "Company GST", variable: "{companyGST}", description: "GST number", example: "29ABCDE1234F1Z5" },
];

// Common customer variables
const customerVariables: VariableDefinition[] = [
  { name: "Customer Name", variable: "{customerName}", description: "Customer's full name", example: "John Doe" },
  { name: "Customer Email", variable: "{customerEmail}", description: "Customer's email", example: "john@example.com" },
  { name: "Customer Phone", variable: "{customerPhone}", description: "Customer's phone", example: "+91 9876543210" },
  { name: "Customer Address", variable: "{customerAddress}", description: "Customer's address", example: "456 Customer Lane" },
  { name: "Customer GST", variable: "{customerGST}", description: "Customer's GST number", example: "27ABCDE5678F1Z9" },
];

// Module-specific variables
const leadsVariables: VariableDefinition[] = [
  { name: "Lead Name", variable: "{leadName}", description: "Name of the lead", example: "Jane Smith" },
  { name: "Lead Source", variable: "{leadSource}", description: "How lead was acquired", example: "Website" },
  { name: "Lead Status", variable: "{leadStatus}", description: "Current status", example: "New" },
  { name: "Contact Person", variable: "{contactPerson}", description: "Primary contact", example: "Mr. Smith" },
  { name: "Lead Date", variable: "{leadDate}", description: "Date lead was created", example: "2025-01-15" },
];

const quotationsVariables: VariableDefinition[] = [
  { name: "Quotation Number", variable: "{quotationNumber}", description: "Unique quotation ID", example: "QT-2025-001" },
  { name: "Quotation Date", variable: "{quotationDate}", description: "Date of quotation", example: "15-Jan-2025" },
  { name: "Validity Days", variable: "{validityDays}", description: "Days quotation is valid", example: "30" },
  { name: "Total Amount", variable: "{totalAmount}", description: "Total quotation value", example: "₹50,000.00" },
  { name: "Items Table", variable: "{itemsTable}", description: "HTML table of quoted items", example: "<table>...</table>" },
  { name: "Quotation Link", variable: "{quotationLink}", description: "Link to view quotation", example: "https://..." },
];

const proformaInvoicesVariables: VariableDefinition[] = [
  { name: "PI Number", variable: "{piNumber}", description: "Proforma invoice number", example: "PI-2025-001" },
  { name: "PI Date", variable: "{piDate}", description: "Date of PI", example: "15-Jan-2025" },
  { name: "Total Amount", variable: "{totalAmount}", description: "Total PI value", example: "₹75,000.00" },
  { name: "Items Table", variable: "{itemsTable}", description: "HTML table of PI items", example: "<table>...</table>" },
  { name: "Payment Terms", variable: "{paymentTerms}", description: "Payment terms", example: "50% advance" },
];

const invoicesVariables: VariableDefinition[] = [
  { name: "Invoice Number", variable: "{invoiceNumber}", description: "Unique invoice ID", example: "INV-2025-001" },
  { name: "Invoice Date", variable: "{invoiceDate}", description: "Date of invoice", example: "15-Jan-2025" },
  { name: "Due Date", variable: "{dueDate}", description: "Payment due date", example: "30-Jan-2025" },
  { name: "Total Amount", variable: "{totalAmount}", description: "Total invoice amount", example: "₹1,00,000.00" },
  { name: "Tax Amount", variable: "{taxAmount}", description: "Total tax amount", example: "₹18,000.00" },
  { name: "Items Table", variable: "{itemsTable}", description: "HTML table of invoice items", example: "<table>...</table>" },
  { name: "Amount in Words", variable: "{amountInWords}", description: "Amount spelled out", example: "One Lakh Rupees Only" },
  { name: "Payment Link", variable: "{paymentLink}", description: "Link to pay online", example: "https://..." },
  { name: "Days Overdue", variable: "{daysOverdue}", description: "Number of days overdue", example: "5" },
];

const receiptsVariables: VariableDefinition[] = [
  { name: "Receipt Number", variable: "{receiptNumber}", description: "Unique receipt ID", example: "RCP-2025-001" },
  { name: "Receipt Date", variable: "{receiptDate}", description: "Date of receipt", example: "15-Jan-2025" },
  { name: "Payment Date", variable: "{paymentDate}", description: "When payment received", example: "15-Jan-2025" },
  { name: "Paid Amount", variable: "{paidAmount}", description: "Amount received", example: "₹50,000.00" },
  { name: "Payment Mode", variable: "{paymentMode}", description: "How payment was made", example: "Bank Transfer" },
  { name: "Transaction ID", variable: "{transactionId}", description: "Bank transaction reference", example: "TXN123456789" },
  { name: "Invoice Number", variable: "{invoiceNumber}", description: "Related invoice number", example: "INV-2025-001" },
  { name: "Balance Amount", variable: "{balanceAmount}", description: "Remaining balance", example: "₹50,000.00" },
];

const debtorsVariables: VariableDefinition[] = [
  { name: "Outstanding Amount", variable: "{outstandingAmount}", description: "Total outstanding balance", example: "₹2,50,000.00" },
  { name: "Overdue Amount", variable: "{overdueAmount}", description: "Amount overdue", example: "₹1,00,000.00" },
  { name: "Total Invoices", variable: "{totalInvoices}", description: "Number of pending invoices", example: "5" },
  { name: "Oldest Invoice Date", variable: "{oldestInvoiceDate}", description: "Date of oldest invoice", example: "01-Dec-2024" },
  { name: "Days Overdue", variable: "{daysOverdue}", description: "Oldest overdue days", example: "45" },
  { name: "Payment History", variable: "{paymentHistory}", description: "Recent payment activity", example: "Last paid: 01-Jan-2025" },
  { name: "Category", variable: "{customerCategory}", description: "Customer category", example: "Alpha/Beta/Gamma/Delta" },
];

const creditManagementVariables: VariableDefinition[] = [
  { name: "Credit Limit", variable: "{creditLimit}", description: "Assigned credit limit", example: "₹5,00,000.00" },
  { name: "Credit Used", variable: "{creditUsed}", description: "Credit currently used", example: "₹3,50,000.00" },
  { name: "Credit Available", variable: "{creditAvailable}", description: "Available credit", example: "₹1,50,000.00" },
  { name: "Credit Percentage", variable: "{creditPercentage}", description: "% of credit used", example: "70%" },
  { name: "Credit Status", variable: "{creditStatus}", description: "Current status", example: "Within Limit" },
  { name: "Review Date", variable: "{reviewDate}", description: "Next review date", example: "01-Feb-2025" },
];

const followupAutomationVariables: VariableDefinition[] = [
  { name: "Customer Name", variable: "{customerName}", description: "Customer's name", example: "ABC Industries" },
  { name: "Total Due", variable: "{totalDue}", description: "Total amount due", example: "₹2,00,000.00" },
  { name: "Overdue Amount", variable: "{overdueAmount}", description: "Overdue amount", example: "₹1,00,000.00" },
  { name: "Days Overdue", variable: "{daysOverdue}", description: "Number of days overdue", example: "15" },
  { name: "Follow-up Count", variable: "{followupCount}", description: "Number of follow-ups sent", example: "3" },
  { name: "Last Payment Date", variable: "{lastPaymentDate}", description: "Date of last payment", example: "15-Dec-2024" },
  { name: "Next Follow-up Date", variable: "{nextFollowupDate}", description: "Scheduled next follow-up", example: "20-Jan-2025" },
  { name: "Customer Category", variable: "{customerCategory}", description: "Risk category", example: "Beta" },
  { name: "Pending Invoices", variable: "{pendingInvoices}", description: "List of pending invoice numbers", example: "INV-001, INV-002" },
];

// Module-specific variable mapping
export const MODULE_VARIABLES: Record<string, VariableCategory[]> = {
  leads: [
    { category: "Company Details", variables: companyVariables },
    { category: "Lead Information", variables: leadsVariables },
  ],
  quotations: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Quotation Details", variables: quotationsVariables },
  ],
  proforma_invoices: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Proforma Invoice Details", variables: proformaInvoicesVariables },
  ],
  invoices: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Invoice Details", variables: invoicesVariables },
  ],
  receipts: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Receipt Details", variables: receiptsVariables },
  ],
  debtors: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Debtor Information", variables: debtorsVariables },
  ],
  credit_management: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Credit Information", variables: creditManagementVariables },
  ],
  followup_automation: [
    { category: "Company Details", variables: companyVariables },
    { category: "Customer Details", variables: customerVariables },
    { category: "Follow-up Details", variables: followupAutomationVariables },
  ],
};

// Get all variables for a specific module
export function getModuleVariables(module: string): VariableCategory[] {
  return MODULE_VARIABLES[module] || [];
}

// Extract all variable names from a module
export function getAllVariableNames(module: string): string[] {
  const categories = getModuleVariables(module);
  const allVars: string[] = [];
  categories.forEach(cat => {
    cat.variables.forEach(v => allVars.push(v.variable));
  });
  return allVars;
}
