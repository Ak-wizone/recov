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
      case 'ledger':
        await enrichLedgerVariables(tenantId, dataId, variables);
        break;
      case 'interest_calculator':
        await enrichInterestCalculatorVariables(tenantId, dataId, variables);
        break;
      case 'customer_reports':
        await enrichCustomerReportsVariables(tenantId, dataId, variables);
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

  // Try to get customer by name to enrich additional fields
  const customers = await storage.getMasterCustomers(tenantId);
  const customer = customers.find(c => c.customerName === invoice.customerName);

  // Calculate due date from invoice date + payment terms
  const invoiceDate = new Date(invoice.invoiceDate);
  const paymentTermsDays = invoice.paymentTerms || 30; // Default to 30 days if not set
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTermsDays);

  const daysOverdue = dueDate < new Date() 
    ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  variables.customerName = invoice.customerName || '';
  variables.customerEmail = customer?.email || invoice.primaryEmail || '';
  variables.customerPhone = customer?.mobile || invoice.primaryMobile || '';
  variables.customerAddress = customer?.address || '';
  variables.customerGST = customer?.gstin || '';
  variables.invoiceNumber = invoice.invoiceNumber || '';
  variables.invoiceDate = formatDate(invoice.invoiceDate);
  variables.dueDate = formatDate(dueDate);
  variables.totalAmount = formatCurrency(invoice.invoiceAmount);
  variables.amountInWords = 'INR ' + numberToWords(Math.floor(parseFloat(invoice.invoiceAmount))) + ' Only';
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
  variables.receiptNumber = receipt.voucherNumber || '';
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

// Enrich variables for Ledger module
async function enrichLedgerVariables(
  tenantId: string,
  customerId: string,
  variables: Record<string, string>
): Promise<void> {
  const customer = await storage.getCustomer(tenantId, customerId);
  if (!customer) return;

  // Get all invoices and receipts for this customer
  const allInvoices = await storage.getInvoices(tenantId);
  const allReceipts = await storage.getReceipts(tenantId);

  const customerInvoices = allInvoices.filter(inv => inv.customerId === customerId);
  const customerReceipts = allReceipts.filter(rec => rec.customerId === customerId);

  // Calculate ledger balances
  const openingBalance = parseFloat(customer.openingBalance || '0');
  const totalDebits = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);
  const totalCredits = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
  const closingBalance = openingBalance + totalDebits - totalCredits;

  // Calculate transaction count
  const transactionCount = customerInvoices.length + customerReceipts.length;

  // Calculate ledger period
  const sortedInvoices = customerInvoices.sort((a, b) => 
    new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
  );
  const sortedReceipts = customerReceipts.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const earliestDate = sortedInvoices.length > 0 && sortedReceipts.length > 0
    ? new Date(Math.min(
        new Date(sortedInvoices[0].invoiceDate).getTime(),
        new Date(sortedReceipts[0].date).getTime()
      ))
    : sortedInvoices.length > 0
    ? new Date(sortedInvoices[0].invoiceDate)
    : sortedReceipts.length > 0
    ? new Date(sortedReceipts[0].date)
    : new Date();

  const latestDate = sortedInvoices.length > 0 && sortedReceipts.length > 0
    ? new Date(Math.max(
        new Date(sortedInvoices[sortedInvoices.length - 1].invoiceDate).getTime(),
        new Date(sortedReceipts[sortedReceipts.length - 1].date).getTime()
      ))
    : sortedInvoices.length > 0
    ? new Date(sortedInvoices[sortedInvoices.length - 1].invoiceDate)
    : sortedReceipts.length > 0
    ? new Date(sortedReceipts[sortedReceipts.length - 1].date)
    : new Date();

  const ledgerPeriod = `${formatDate(earliestDate)} to ${formatDate(latestDate)}`;

  variables.customerName = customer.customerName || '';
  variables.customerEmail = customer.email || '';
  variables.customerPhone = customer.mobile || '';
  variables.ledgerPeriod = ledgerPeriod;
  variables.openingBalance = formatCurrency(openingBalance);
  variables.totalDebits = formatCurrency(totalDebits);
  variables.totalCredits = formatCurrency(totalCredits);
  variables.closingBalance = formatCurrency(closingBalance);
  variables.transactionCount = transactionCount.toString();
}

// Enrich variables for Interest Calculator module
async function enrichInterestCalculatorVariables(
  tenantId: string,
  invoiceId: string,
  variables: Record<string, string>
): Promise<void> {
  const invoice = await storage.getInvoice(tenantId, invoiceId);
  if (!invoice) return;

  const customer = invoice.customerId ? await storage.getCustomer(tenantId, invoice.customerId) : null;

  // Calculate days overdue
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  const daysOverdue = dueDate < today 
    ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get interest rate from invoice or use default
  const interestRate = invoice.interestRate ? parseFloat(invoice.interestRate.toString()) : 0;
  
  // Calculate interest amount (simple interest: Principal × Rate × Time / 100)
  // For monthly rate, convert days to months
  const invoiceAmount = parseFloat(invoice.grandTotal);
  const monthsOverdue = daysOverdue / 30;
  const interestAmount = daysOverdue > 0 && interestRate > 0
    ? (invoiceAmount * interestRate * monthsOverdue) / 100
    : 0;

  const totalWithInterest = invoiceAmount + interestAmount;

  // Determine interest calculation method
  const interestMethod = interestRate > 0 
    ? `Simple Interest - ${interestRate}% per month on overdue amount`
    : 'No interest applied';

  variables.customerName = customer?.customerName || '';
  variables.customerEmail = customer?.email || '';
  variables.customerPhone = customer?.mobile || '';
  variables.invoiceNumber = invoice.invoiceNumber || '';
  variables.invoiceAmount = formatCurrency(invoiceAmount);
  variables.invoiceDate = formatDate(invoice.invoiceDate);
  variables.dueDate = formatDate(invoice.dueDate);
  variables.interestRate = interestRate.toFixed(2);
  variables.daysOverdue = daysOverdue.toString();
  variables.interestAmount = formatCurrency(interestAmount);
  variables.totalWithInterest = formatCurrency(totalWithInterest);
  variables.interestMethod = interestMethod;
}

// Enrich variables for Customer Reports module
async function enrichCustomerReportsVariables(
  tenantId: string,
  customerId: string,
  variables: Record<string, string>
): Promise<void> {
  const customer = await storage.getCustomer(tenantId, customerId);
  if (!customer) return;

  // Get all invoices and receipts for this customer
  const allInvoices = await storage.getInvoices(tenantId);
  const allReceipts = await storage.getReceipts(tenantId);

  const customerInvoices = allInvoices.filter(inv => inv.customerId === customerId);
  const customerReceipts = allReceipts.filter(rec => rec.customerId === customerId);

  // Calculate totals
  const totalInvoicesAmount = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);
  const totalPaymentsAmount = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
  const outstandingBalance = totalInvoicesAmount - totalPaymentsAmount;

  // Calculate credit information
  const creditLimit = parseFloat(customer.creditLimit || '0');
  const availableCredit = creditLimit - outstandingBalance;

  // Calculate aging analysis
  const today = new Date();
  let aging0to30 = 0;
  let aging31to60 = 0;
  let aging61to90 = 0;
  let agingOver90 = 0;

  for (const invoice of customerInvoices) {
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = dueDate < today 
      ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const invoiceAmount = parseFloat(invoice.grandTotal);
    
    // Get payments allocated to this invoice
    const relatedReceipts = customerReceipts.filter(rec => 
      rec.invoiceNumber === invoice.invoiceNumber || rec.invoiceId === invoice.id
    );
    const paidAmount = relatedReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
    const remainingAmount = invoiceAmount - paidAmount;

    if (remainingAmount > 0) {
      if (daysOverdue <= 30) {
        aging0to30 += remainingAmount;
      } else if (daysOverdue <= 60) {
        aging31to60 += remainingAmount;
      } else if (daysOverdue <= 90) {
        aging61to90 += remainingAmount;
      } else {
        agingOver90 += remainingAmount;
      }
    }
  }

  // Get last payment and invoice dates
  const sortedReceipts = customerReceipts.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const sortedInvoices = customerInvoices.sort((a, b) => 
    new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  );

  const lastPaymentDate = sortedReceipts.length > 0 
    ? formatDate(sortedReceipts[0].date) 
    : 'No payments yet';
  const lastInvoiceDate = sortedInvoices.length > 0 
    ? formatDate(sortedInvoices[0].invoiceDate) 
    : 'No invoices yet';

  variables.customerName = customer.customerName || '';
  variables.customerEmail = customer.email || '';
  variables.customerPhone = customer.mobile || '';
  variables.customerCategory = customer.category || 'Not categorized';
  variables.creditLimit = formatCurrency(creditLimit);
  variables.outstandingBalance = formatCurrency(outstandingBalance);
  variables.availableCredit = formatCurrency(availableCredit);
  variables.aging0to30 = formatCurrency(aging0to30);
  variables.aging31to60 = formatCurrency(aging31to60);
  variables.aging61to90 = formatCurrency(aging61to90);
  variables.agingOver90 = formatCurrency(agingOver90);
  variables.totalInvoices = customerInvoices.length.toString();
  variables.totalPayments = formatCurrency(totalPaymentsAmount);
  variables.lastPaymentDate = lastPaymentDate;
  variables.lastInvoiceDate = lastInvoiceDate;
  variables.paymentTerms = customer.paymentTerms || 'As per agreement';
  variables.salesPerson = customer.salesPersonName || 'Not assigned';
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
