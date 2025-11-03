import { storage } from "./storage";

// Helper function to convert numbers to words (Indian format)
export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num >= 10 && num < 20) return teens[num - 10];
  if (num >= 20 && num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  if (num >= 100 && num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
  if (num >= 1000 && num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  if (num >= 100000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
  return '';
}

// Get company profile variables
export async function getCompanyVariables(tenantId: string): Promise<Record<string, string>> {
  const profile = await storage.getCompanyProfile(tenantId);
  
  if (!profile) {
    return {
      companyName: '',
      companyLogo: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      companyWebsite: '',
      companyGST: '',
    };
  }

  const fullAddress = [
    profile.regAddressLine1,
    profile.regAddressLine2,
    profile.regCity,
    profile.regState,
    profile.regPincode
  ].filter(Boolean).join(', ');

  return {
    companyName: profile.legalName || profile.brandName || '',
    companyLogo: profile.logo || '',
    companyAddress: fullAddress,
    companyPhone: profile.primaryContactMobile || '',
    companyEmail: profile.primaryContactEmail || '',
    companyWebsite: profile.website || '',
    companyGST: profile.gstin || '',
  };
}

// Template rendering function with variable substitution
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

// Format date to Indian format
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Format currency to Indian format
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Get enriched variables for sending emails with comprehensive substitution
export async function getEnrichedEmailVariables(
  tenantId: string,
  module: string,
  baseUrl?: string,
  dataId?: string,
  customData?: Record<string, string>
): Promise<Record<string, string>> {
  // Always start with company variables
  const variables = await getCompanyVariables(tenantId);

  // Module-specific data enrichment (before customData to allow overrides)
  if (dataId) {
    switch (module) {
      case 'leads':
        await enrichLeadsVariables(tenantId, dataId, variables);
        break;
      case 'quotations':
        await enrichQuotationsVariables(tenantId, dataId, variables, baseUrl);
        break;
      case 'proforma_invoices':
        await enrichProformaInvoicesVariables(tenantId, dataId, variables);
        break;
      case 'invoices':
        await enrichInvoicesVariables(tenantId, dataId, variables, baseUrl);
        break;
      case 'receipts':
        await enrichReceiptsVariables(tenantId, dataId, variables);
        break;
      case 'debtors':
        await enrichDebtorsVariables(tenantId, dataId, variables);
        break;
      case 'credit_management':
        await enrichCreditManagementVariables(tenantId, dataId, variables);
        break;
      case 'followup_automation':
        await enrichFollowupAutomationVariables(tenantId, dataId, variables);
        break;
    }
  }

  // Apply customData AFTER module enrichment to preserve caller overrides
  if (customData) {
    Object.assign(variables, customData);
  }

  return variables;
}

// Enrich variables for Leads module
async function enrichLeadsVariables(
  tenantId: string,
  leadId: string,
  variables: Record<string, string>
): Promise<void> {
  const lead = await storage.getLead(tenantId, leadId);
  if (!lead) return;

  variables.leadName = lead.leadName || '';
  variables.leadSource = lead.source || '';
  variables.leadStatus = lead.status || '';
  variables.contactPerson = lead.contactPerson || '';
  variables.leadDate = formatDate(lead.createdAt);
}

// Enrich variables for Quotations module
async function enrichQuotationsVariables(
  tenantId: string,
  quotationId: string,
  variables: Record<string, string>,
  baseUrl?: string
): Promise<void> {
  const quotation = await storage.getQuotation(tenantId, quotationId);
  if (!quotation) return;

  const items = await storage.getQuotationItems(tenantId, quotationId);
  const settings = await storage.getQuotationSettings(tenantId);

  variables.customerName = quotation.leadName || '';
  variables.customerEmail = quotation.leadEmail || '';
  variables.customerPhone = quotation.leadMobile || '';
  variables.quotationNumber = quotation.quotationNumber || '';
  variables.quotationDate = formatDate(quotation.quotationDate);
  variables.validityDays = Math.ceil((new Date(quotation.validUntil).getTime() - new Date(quotation.quotationDate).getTime()) / (1000 * 60 * 60 * 24)).toString();
  variables.totalAmount = formatCurrency(quotation.grandTotal);
  variables.itemsTable = formatItemsTable(items);
  variables.quotationLink = baseUrl ? `${baseUrl}/quotations/${quotationId}` : '#';
}

// Enrich variables for Proforma Invoices module
async function enrichProformaInvoicesVariables(
  tenantId: string,
  piId: string,
  variables: Record<string, string>
): Promise<void> {
  const pi = await storage.getProformaInvoice(tenantId, piId);
  if (!pi) return;

  const customer = pi.customerId ? await storage.getCustomer(tenantId, pi.customerId) : null;
  const items = await storage.getProformaInvoiceItems(tenantId, piId);

  variables.customerName = customer?.customerName || '';
  variables.customerEmail = customer?.email || '';
  variables.customerPhone = customer?.mobile || '';
  variables.customerAddress = customer?.address || '';
  variables.customerGST = customer?.gstin || '';
  variables.piNumber = pi.piNumber || '';
  variables.piDate = formatDate(pi.piDate);
  variables.totalAmount = formatCurrency(pi.grandTotal);
  variables.itemsTable = formatItemsTable(items);
  variables.paymentTerms = pi.paymentTerms || 'As per agreement';
}

// Enrich variables for Invoices module
async function enrichInvoicesVariables(
  tenantId: string,
  invoiceId: string,
  variables: Record<string, string>,
  baseUrl?: string
): Promise<void> {
  const invoice = await storage.getInvoice(tenantId, invoiceId);
  if (!invoice) return;

  const customer = invoice.customerId ? await storage.getCustomer(tenantId, invoice.customerId) : null;
  const items = await storage.getInvoiceItems(tenantId, invoiceId);

  const daysOverdue = new Date(invoice.dueDate) < new Date() 
    ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  variables.customerName = customer?.customerName || '';
  variables.customerEmail = customer?.email || '';
  variables.customerPhone = customer?.mobile || '';
  variables.customerAddress = customer?.address || '';
  variables.customerGST = customer?.gstin || '';
  variables.invoiceNumber = invoice.invoiceNumber || '';
  variables.invoiceDate = formatDate(invoice.invoiceDate);
  variables.dueDate = formatDate(invoice.dueDate);
  variables.totalAmount = formatCurrency(invoice.grandTotal);
  variables.taxAmount = formatCurrency(invoice.totalTax);
  variables.itemsTable = formatItemsTable(items);
  variables.amountInWords = 'INR ' + numberToWords(Math.floor(parseFloat(invoice.grandTotal))) + ' Only';
  variables.paymentLink = baseUrl ? `${baseUrl}/invoices/${invoiceId}/pay` : '#';
  variables.daysOverdue = daysOverdue.toString();
}

// Enrich variables for Receipts module
async function enrichReceiptsVariables(
  tenantId: string,
  receiptId: string,
  variables: Record<string, string>
): Promise<void> {
  const receipt = await storage.getReceipt(tenantId, receiptId);
  if (!receipt) return;

  const customer = receipt.customerId ? await storage.getCustomer(tenantId, receipt.customerId) : null;

  variables.customerName = customer?.customerName || receipt.customerName || '';
  variables.customerEmail = customer?.email || '';
  variables.customerPhone = customer?.mobile || '';
  variables.receiptNumber = receipt.receiptNumber || '';
  variables.receiptDate = formatDate(receipt.date);
  variables.paymentDate = formatDate(receipt.date);
  variables.paidAmount = formatCurrency(receipt.amount);
  variables.paymentMode = receipt.paymentMode || '';
  variables.transactionId = receipt.transactionRef || '';
  variables.invoiceNumber = receipt.invoiceNumber || '';
  variables.balanceAmount = receipt.balanceAmount ? formatCurrency(receipt.balanceAmount) : '₹0.00';
}

// Enrich variables for Debtors module
async function enrichDebtorsVariables(
  tenantId: string,
  customerId: string,
  variables: Record<string, string>
): Promise<void> {
  const customer = await storage.getCustomer(tenantId, customerId);
  if (!customer) return;

  // Get debtor statistics
  const invoices = await storage.getInvoices(tenantId);
  const receipts = await storage.getReceipts(tenantId);

  const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
  const customerReceipts = receipts.filter(rec => rec.customerId === customerId);

  const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);
  const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
  const outstanding = totalInvoices - totalReceipts;
  
  const overdueInvoices = customerInvoices.filter(inv => new Date(inv.dueDate) < new Date());
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);

  const oldestInvoice = customerInvoices.sort((a, b) => 
    new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
  )[0];

  const daysOverdue = oldestInvoice && new Date(oldestInvoice.dueDate) < new Date()
    ? Math.floor((new Date().getTime() - new Date(oldestInvoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  variables.customerName = customer.customerName || '';
  variables.customerEmail = customer.email || '';
  variables.customerPhone = customer.mobile || '';
  variables.customerAddress = customer.address || '';
  variables.outstandingAmount = formatCurrency(outstanding);
  variables.overdueAmount = formatCurrency(overdueAmount);
  variables.totalInvoices = customerInvoices.length.toString();
  variables.oldestInvoiceDate = oldestInvoice ? formatDate(oldestInvoice.invoiceDate) : 'N/A';
  variables.daysOverdue = daysOverdue.toString();
  variables.paymentHistory = customerReceipts.length > 0 
    ? `Last paid: ${formatDate(customerReceipts[customerReceipts.length - 1].date)}`
    : 'No payments yet';
  variables.customerCategory = customer.category || 'Not categorized';
}

// Enrich variables for Credit Management module
async function enrichCreditManagementVariables(
  tenantId: string,
  customerId: string,
  variables: Record<string, string>
): Promise<void> {
  const customer = await storage.getCustomer(tenantId, customerId);
  if (!customer) return;

  const creditLimit = parseFloat(customer.creditLimit || '0');
  const creditUsed = parseFloat(customer.creditUsed || '0');
  const creditAvailable = creditLimit - creditUsed;
  const creditPercentage = creditLimit > 0 ? ((creditUsed / creditLimit) * 100).toFixed(1) : '0';
  const creditStatus = creditUsed > creditLimit ? 'Over Limit' : 'Within Limit';

  variables.customerName = customer.customerName || '';
  variables.customerEmail = customer.email || '';
  variables.customerPhone = customer.mobile || '';
  variables.creditLimit = formatCurrency(creditLimit);
  variables.creditUsed = formatCurrency(creditUsed);
  variables.creditAvailable = formatCurrency(creditAvailable);
  variables.creditPercentage = creditPercentage + '%';
  variables.creditStatus = creditStatus;
  variables.reviewDate = 'To be scheduled'; // Can be enhanced based on actual review logic
}

// Enrich variables for Follow-up Automation module
async function enrichFollowupAutomationVariables(
  tenantId: string,
  customerId: string,
  variables: Record<string, string>
): Promise<void> {
  const customer = await storage.getCustomer(tenantId, customerId);
  if (!customer) return;

  // Get overdue invoice statistics
  const invoices = await storage.getInvoices(tenantId);
  const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
  const overdueInvoices = customerInvoices.filter(inv => new Date(inv.dueDate) < new Date());

  const totalDue = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);

  const oldestOverdue = overdueInvoices.sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )[0];

  const daysOverdue = oldestOverdue
    ? Math.floor((new Date().getTime() - new Date(oldestOverdue.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const pendingInvoiceNumbers = overdueInvoices.map(inv => inv.invoiceNumber).join(', ');

  variables.customerName = customer.customerName || '';
  variables.customerEmail = customer.email || '';
  variables.customerPhone = customer.mobile || '';
  variables.totalDue = formatCurrency(totalDue);
  variables.overdueAmount = formatCurrency(overdueAmount);
  variables.daysOverdue = daysOverdue.toString();
  variables.followupCount = '1'; // Can be enhanced with actual follow-up tracking
  variables.lastPaymentDate = 'To be tracked'; // Can be enhanced with actual payment history
  variables.nextFollowupDate = 'To be scheduled'; // Can be enhanced with automation rules
  variables.customerCategory = customer.category || 'Not categorized';
  variables.pendingInvoices = pendingInvoiceNumbers || 'None';
}

// Format items table HTML
function formatItemsTable(items: any[]): string {
  if (!items || items.length === 0) {
    return '<p>No items</p>';
  }

  const rows = items.map((item, index) => {
    const rate = parseFloat(item.rate || '0');
    const quantity = parseFloat(item.quantity || '0');
    const taxableAmount = rate * quantity;
    const taxPercent = parseFloat(item.taxPercent || '0');
    const amount = parseFloat(item.amount || '0');

    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.itemName || item.description || ''}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity} ${item.unit || ''}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${rate.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${taxableAmount.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${taxPercent}%</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${amount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">#</th>
          <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Item</th>
          <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Quantity</th>
          <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Rate</th>
          <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Taxable</th>
          <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Tax %</th>
          <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}
