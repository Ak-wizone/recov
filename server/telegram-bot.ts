import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import type { Update } from 'telegraf/types';
import { db } from './db';
import { telegramBotConfig, telegramUserMappings, telegramLinkingCodes, telegramQueryLogs, invoices, customers, receipts, masterCustomers } from '@shared/schema';
import { eq, and, gte, sql, sum, count } from 'drizzle-orm';
import fetch from 'node-fetch';
import OpenAI from 'openai';

let bot: Telegraf | null = null;
let currentBotToken: string | null = null;
let openai: OpenAI | null = null;

// Initialize OpenAI client (will be set when bot starts)
function initializeOpenAI(apiKey: string) {
  openai = new OpenAI({ apiKey });
}

// Query intent types
type QueryIntent = 
  | 'invoice_count' 
  | 'invoice_stats' 
  | 'revenue_total' 
  | 'customer_count' 
  | 'debtor_list' 
  | 'debtor_count'
  | 'outstanding_balance' 
  | 'payment_stats' 
  | 'unknown';

interface ParsedQuery {
  intent: QueryIntent;
  confidence: 'high' | 'medium' | 'low';
}

// Detect language from transcribed text
function detectLanguage(text: string): 'hindi' | 'english' {
  const hindiKeywords = /\b(kitne|kitna|kitni|kya|hai|hain|ka|ke|ki|batao|dikhao|bataiye)\b/i;
  const hindiChars = /[\u0900-\u097F]/; // Devanagari Unicode range
  
  if (hindiChars.test(text) || hindiKeywords.test(text)) {
    return 'hindi';
  }
  return 'english';
}

// Natural language query parser with Hindi/English/Hinglish support
function parseQuery(text: string): ParsedQuery {
  const lowerText = text.toLowerCase();
  
  // Invoice count patterns - English + Hindi
  if (
    /\b(kitne|kitna|kitni|how many|total|count)\b.*\b(invoices?|bills?|challans?)\b/i.test(lowerText) ||
    /\b(invoices?|bills?|invoice|bill)\b.*\b(kitne|kitna|kitni|how many|count|hai|hain)\b/i.test(lowerText)
  ) {
    return { intent: 'invoice_count', confidence: 'high' };
  }
  
  // Invoice stats patterns
  if (
    /\b(invoices?|bills?)\b.*\b(stats|statistics|details|data)\b/i.test(lowerText) ||
    /\b(show|dikhao|batao)\b.*\b(invoices?|bills?)\b/i.test(lowerText)
  ) {
    return { intent: 'invoice_stats', confidence: 'high' };
  }
  
  // Revenue patterns - English + Hindi
  if (
    /\b(total|kitna|kitni|kya hai|show)\b.*\b(revenue|earning|kamai|income)\b/i.test(lowerText) ||
    /\b(revenue|earning|kamai)\b.*\b(total|kitna|kitni|kya|hai)\b/i.test(lowerText) ||
    (/\b(revenue|earning|kamai)\b/i.test(lowerText) && lowerText.length < 30)
  ) {
    return { intent: 'revenue_total', confidence: 'high' };
  }
  
  // Customer count patterns - English + Hindi
  if (
    /\b(kitne|kitna|kitni|how many|total)\b.*\b(customers?|clients?|party|parties)\b/i.test(lowerText) ||
    /\b(customers?|clients?|party|parties|customer|client)\b.*\b(kitne|kitna|kitni|how many|count|hai|hain)\b/i.test(lowerText)
  ) {
    return { intent: 'customer_count', confidence: 'high' };
  }
  
  // Debtor list patterns - English + Hindi
  if (
    /\b(debtors?|baaki|bakaya|baki|outstanding)\b.*\b(list|dikhao|show|batao)\b/i.test(lowerText) ||
    /\b(list|dikhao|show|batao)\b.*\b(debtors?|baaki|bakaya|baki)\b/i.test(lowerText) ||
    /\b(top|bade|biggest)\b.*\b(debtors?|baaki|baki)\b/i.test(lowerText)
  ) {
    return { intent: 'debtor_list', confidence: 'high' };
  }
  
  // Debtor count patterns - English + Hindi
  if (
    /\b(kitne|kitna|how many)\b.*\b(debtors?|outstanding|baaki|bakaya|baki)\b/i.test(lowerText)
  ) {
    return { intent: 'debtor_count', confidence: 'high' };
  }
  
  // Outstanding balance patterns - English + Hindi + Hinglish (30+ variations)
  if (
    // Hindi patterns
    /\b(meri|mera|mujhe|saari|total|kul)\b.*\b(outstanding|bakaya|baaki|baki)\b.*\b(report|bhejo|send|batao|dikhao|chahiye)\b/i.test(lowerText) ||
    /\b(outstanding|bakaya|baaki|baki)\b.*\b(report|summary|list|soochi|vivaran)\b.*\b(bhejo|send|do|chahiye|dikhaye)\b/i.test(lowerText) ||
    /\b(total|kul)\b.*\b(outstanding|bakaya|baaki|baki|due)\b.*\b(kitna|kitni|hai|amount|rashi)\b/i.test(lowerText) ||
    /\b(pending|bacha|baki|bakaya)\b.*\b(payment|bhugtan|paisa)\b.*\b(batao|kitna|list|bhejo)\b/i.test(lowerText) ||
    /\b(kitna|kitni)\b.*\b(paisa|payment|rashi|amount)\b.*\b(market|bahar|phasa|stuck|pending|baki)\b/i.test(lowerText) ||
    /\b(payment|bhugtan)\b.*\b(pending|baki|bakaya)\b.*\b(ka|ki)\b.*\b(list|soochi|batao|report)\b/i.test(lowerText) ||
    /\b(recovery|vasuli|collection)\b.*\b(report|send|bhejo|batao)\b/i.test(lowerText) ||
    /\b(client|customer|party|grahak)\b.*\b(wise|ka|ki|ke)\b.*\b(outstanding|bakaya|baki)\b/i.test(lowerText) ||
    /\b(kaun|kon|who)\b.*\b(payment|bhugtan)\b.*\b(nahi|nahin|not|diya|paid)\b/i.test(lowerText) ||
    /\b(daily|roj|rojana)\b.*\b(outstanding|bakaya|recovery)\b.*\b(report|send|bhejo)\b/i.test(lowerText) ||
    /\b(kitni|kitna)\b.*\b(rashi|amount|paisa)\b.*\b(abhi|tak|prapt|received|nahi|hui)\b/i.test(lowerText) ||
    /\b(baki|bacha|pending)\b.*\b(rashi|bhugtan|payment)\b.*\b(ka|ki)\b.*\b(vivaran|report|details)\b/i.test(lowerText) ||
    /\b(mera|meri)\b.*\b(udhar|loan|bakaya|outstanding)\b.*\b(kitna|batao|hai)\b/i.test(lowerText) ||
    /\b(kripya|please)\b.*\b(outstanding|bakaya)\b.*\b(report|ki|bhejen|send)\b/i.test(lowerText) ||
    
    // English patterns
    /\b(send|share|show)\b.*\b(outstanding|pending|due)\b.*\b(report|summary|details)\b/i.test(lowerText) ||
    /\b(what|how much)\b.*\b(total|my)\b.*\b(outstanding|pending|due)\b/i.test(lowerText) ||
    /\b(outstanding|pending|due)\b.*\b(summary|report|details)\b.*\b(please|send|show)\b/i.test(lowerText) ||
    /\b(payment|payments)\b.*\b(due|pending|outstanding|stuck)\b/i.test(lowerText) ||
    /\b(client|customer)\b.*\b(wise|based)\b.*\b(outstanding|pending|due)\b/i.test(lowerText) ||
    /\b(total|show|my)\b.*\b(due|pending|outstanding)\b.*\b(amount|balance|payment)\b/i.test(lowerText) ||
    /\b(pending|outstanding)\b.*\b(collection|recovery|payment)\b.*\b(details|report)\b/i.test(lowerText) ||
    
    // Generic outstanding patterns
    /\b(outstanding|baaki|bakaya|baki)\b.*\b(balance|amount|paisa|kitna|kitni|hai)\b/i.test(lowerText) ||
    /\b(total|show|batao)\b.*\b(outstanding|baaki|bakaya|baki)\b/i.test(lowerText) ||
    /\b(balance)\b.*\b(outstanding|pending|baaki|baki)\b/i.test(lowerText) ||
    (/\b(outstanding|bakaya|baaki|baki)\b/i.test(lowerText) && /\b(balance|kitna|kitni|report)\b/i.test(lowerText))
  ) {
    return { intent: 'outstanding_balance', confidence: 'high' };
  }
  
  // Payment stats patterns - English + Hindi
  if (
    /\b(payments?|receipts?|payment|receipt)\b.*\b(stats|data|kitna|kitni)\b/i.test(lowerText)
  ) {
    return { intent: 'payment_stats', confidence: 'high' };
  }
  
  return { intent: 'unknown', confidence: 'low' };
}

// Business data query handlers
async function queryInvoiceCount(tenantId: string): Promise<{ count: number }> {
  const result = await db
    .select({ count: count() })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));
  
  return { count: result[0]?.count || 0 };
}

async function queryInvoiceStats(tenantId: string): Promise<{
  count: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}> {
  // Fetch invoices total
  const invoiceResult = await db
    .select({
      count: count(),
      totalAmount: sum(invoices.invoiceAmount),
    })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));
  
  // Fetch receipts/payments total
  const paymentResult = await db
    .select({
      paidAmount: sum(receipts.amount),
    })
    .from(receipts)
    .where(eq(receipts.tenantId, tenantId));
  
  const totalAmount = Number(invoiceResult[0]?.totalAmount || 0);
  const paidAmount = Number(paymentResult[0]?.paidAmount || 0);
  
  return {
    count: invoiceResult[0]?.count || 0,
    totalAmount,
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
  };
}

async function queryRevenue(tenantId: string): Promise<{ revenue: number }> {
  const result = await db
    .select({ revenue: sum(invoices.invoiceAmount) })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));
  
  return { revenue: Number(result[0]?.revenue || 0) };
}

async function queryCustomerCount(tenantId: string): Promise<{ count: number }> {
  const result = await db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.tenantId, tenantId));
  
  return { count: result[0]?.count || 0 };
}

async function queryDebtorList(tenantId: string, limit: number = 5): Promise<Array<{
  customerName: string;
  outstanding: number;
}>> {
  // Fetch all invoices and payments for the tenant
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));
  
  const allReceipts = await db
    .select()
    .from(receipts)
    .where(eq(receipts.tenantId, tenantId));
  
  // Calculate outstanding per customer
  const debtorMap: Record<string, number> = {};
  
  allInvoices.forEach(invoice => {
    const name = invoice.customerName;
    if (!debtorMap[name]) debtorMap[name] = 0;
    debtorMap[name] += Number(invoice.invoiceAmount);
  });
  
  allReceipts.forEach(receipt => {
    const name = receipt.customerName;
    if (!debtorMap[name]) debtorMap[name] = 0;
    debtorMap[name] -= Number(receipt.amount);
  });
  
  // Convert to array, filter positive balances, sort, and limit
  return Object.entries(debtorMap)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([customerName, outstanding]) => ({
      customerName,
      outstanding: Math.round(outstanding * 100) / 100,
    }));
}

async function queryDebtorCount(tenantId: string): Promise<{ count: number }> {
  // Use the debtor list function and count
  const debtors = await queryDebtorList(tenantId, 1000); // Get all debtors
  return { count: debtors.length };
}

async function queryOutstandingBalance(tenantId: string): Promise<{
  balance: number;
  categoryBreakdown: {
    Alpha: { amount: number; count: number };
    Beta: { amount: number; count: number };
    Gamma: { amount: number; count: number };
    Delta: { amount: number; count: number };
  };
  agingBreakdown: {
    dueToday: { amount: number; count: number };
    overdue: { amount: number; count: number };
    overdue30to60: { amount: number; count: number };
    overdue60to90: { amount: number; count: number };
    overdue90to120: { amount: number; count: number };
    overdue120plus: { amount: number; count: number };
  };
}> {
  // Match Portal's calculation logic from getDebtorsList()
  // Calculate per-customer balance and sum only positive balances
  
  const customers = await db.select().from(masterCustomers).where(eq(masterCustomers.tenantId, tenantId));
  const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
  const allReceipts = await db.select().from(receipts).where(eq(receipts.tenantId, tenantId));
  
  let totalOutstanding = 0;
  
  // Category-wise tracking
  const categoryData = {
    Alpha: { amount: 0, count: 0 },
    Beta: { amount: 0, count: 0 },
    Gamma: { amount: 0, count: 0 },
    Delta: { amount: 0, count: 0 },
  };
  
  // Aging tracking (based on invoice-level aging)
  const agingData = {
    dueToday: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
    overdue30to60: { amount: 0, count: 0 },
    overdue60to90: { amount: 0, count: 0 },
    overdue90to120: { amount: 0, count: 0 },
    overdue120plus: { amount: 0, count: 0 },
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const customer of customers) {
    const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
    const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
    
    const openingBalance = customer.openingBalance ? parseFloat(customer.openingBalance.toString()) : 0;
    const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
    const totalReceiptsAmount = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
    const balance = openingBalance + totalInvoices - totalReceiptsAmount;
    
    // Only include customers with positive balance (matching Portal's logic)
    if (balance > 0) {
      totalOutstanding += balance;
      
      // Track category-wise
      const category = customer.category as 'Alpha' | 'Beta' | 'Gamma' | 'Delta';
      if (category && categoryData[category]) {
        categoryData[category].amount += balance;
        categoryData[category].count += 1;
      }
      
      // Calculate per-invoice outstanding using FIFO receipt allocation
      // Sort invoices by date for FIFO
      const sortedInvoices = [...customerInvoices].sort((a, b) => 
        new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
      );
      
      // Calculate total receipts to allocate
      let remainingReceipts = totalReceiptsAmount;
      
      // Allocate receipts to invoices using FIFO
      for (const invoice of sortedInvoices) {
        const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
        
        // Calculate outstanding for this invoice
        let invoiceOutstanding = invoiceAmount;
        if (remainingReceipts > 0) {
          const allocatedToThisInvoice = Math.min(remainingReceipts, invoiceAmount);
          invoiceOutstanding = invoiceAmount - allocatedToThisInvoice;
          remainingReceipts -= allocatedToThisInvoice;
        }
        
        // Only track aging for invoices with outstanding balance
        if (invoiceOutstanding > 0) {
          const invoiceDate = new Date(invoice.invoiceDate);
          const paymentTerms = invoice.paymentTerms || 0;
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 0) {
            // Due today
            agingData.dueToday.amount += invoiceOutstanding;
            agingData.dueToday.count += 1;
          } else if (daysDiff > 0) {
            // Overdue
            agingData.overdue.amount += invoiceOutstanding;
            agingData.overdue.count += 1;
            
            // Specific aging buckets
            if (daysDiff >= 30 && daysDiff < 60) {
              agingData.overdue30to60.amount += invoiceOutstanding;
              agingData.overdue30to60.count += 1;
            } else if (daysDiff >= 60 && daysDiff < 90) {
              agingData.overdue60to90.amount += invoiceOutstanding;
              agingData.overdue60to90.count += 1;
            } else if (daysDiff >= 90 && daysDiff < 120) {
              agingData.overdue90to120.amount += invoiceOutstanding;
              agingData.overdue90to120.count += 1;
            } else if (daysDiff >= 120) {
              agingData.overdue120plus.amount += invoiceOutstanding;
              agingData.overdue120plus.count += 1;
            }
          }
        }
      }
    }
  }
  
  return {
    balance: totalOutstanding,
    categoryBreakdown: categoryData,
    agingBreakdown: agingData,
  };
}

async function queryPaymentStats(tenantId: string): Promise<{
  count: number;
  totalReceived: number;
}> {
  const result = await db
    .select({
      count: count(),
      totalReceived: sum(receipts.amount),
    })
    .from(receipts)
    .where(eq(receipts.tenantId, tenantId));
  
  return {
    count: result[0]?.count || 0,
    totalReceived: Number(result[0]?.totalReceived || 0),
  };
}

// Hindi number to words converter for Indian numbering system (lakh/crore)
function numberToHindiWords(num: number): { devanagari: string; phonetic: string } {
  if (num === 0) {
    return { devanagari: 'शून्य', phonetic: 'shunya' };
  }

  const ones = [
    '', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ'
  ];
  const onesPhonetic = [
    '', 'ek', 'do', 'teen', 'char', 'paanch', 'chhah', 'saat', 'aath', 'no'
  ];

  const teens = [
    'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस'
  ];
  const teensPhonetic = [
    'das', 'gyarah', 'barah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'atharah', 'unnis'
  ];

  const tens = [
    '', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठ', 'सत्तर', 'अस्सी', 'नब्बे'
  ];
  const tensPhonetic = [
    '', '', 'bees', 'tees', 'chalis', 'pachas', 'saath', 'sattar', 'assi', 'nabbe'
  ];

  const compound = [
    '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '',
    'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
    'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
    'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
    'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
    'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
    'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्यासी',
    'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
    'नब्बे', 'इक्यानबे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'
  ];

  const compoundPhonetic = [
    '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '',
    'bees', 'ikkis', 'bais', 'teis', 'chaubis', 'pachchis', 'chhabbis', 'sattais', 'aththais', 'untis',
    'tees', 'iktis', 'battis', 'taintis', 'chauntis', 'paintis', 'chhattis', 'saintis', 'adtis', 'untaliss',
    'chalis', 'iktaliss', 'bayaliss', 'taintaliss', 'chavaliss', 'paintaliss', 'chhiyaliss', 'saintaliss', 'adtaliss', 'unchas',
    'pachas', 'ikyavan', 'bavan', 'tirpan', 'chauvan', 'pachpan', 'chhappan', 'sattavan', 'aththavan', 'unsath',
    'saath', 'iksath', 'basath', 'tirsath', 'chaunsath', 'painsath', 'chhiyasath', 'sadsath', 'adsath', 'unhatter',
    'sattar', 'ikhatter', 'bahatter', 'tihatter', 'chauhatter', 'pachhatter', 'chhihatter', 'satahatter', 'athhatter', 'unyassi',
    'assi', 'ikyassi', 'bayassi', 'tirassi', 'chaurassi', 'pachassi', 'chhiyassi', 'sattassi', 'aththassi', 'navassi',
    'nabbe', 'ikyanabe', 'banabe', 'tiranabe', 'chauranabe', 'pachanabe', 'chhiyanabe', 'sattanabe', 'aththanabe', 'ninyanabe'
  ];

  function convertTwoDigit(n: number): { devanagari: string; phonetic: string } {
    if (n < 10) {
      return { devanagari: ones[n], phonetic: onesPhonetic[n] };
    } else if (n < 20) {
      return { devanagari: teens[n - 10], phonetic: teensPhonetic[n - 10] };
    } else if (n < 100) {
      return { devanagari: compound[n], phonetic: compoundPhonetic[n] };
    }
    return { devanagari: '', phonetic: '' };
  }

  let devanagari = '';
  let phonetic = '';
  let remaining = Math.floor(num);

  // Crores (10,000,000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    const croreWords = convertTwoDigit(crores);
    devanagari += croreWords.devanagari + ' करोड़ ';
    phonetic += croreWords.phonetic + ' crore ';
    remaining = remaining % 10000000;
  }

  // Lakhs (100,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    const lakhWords = convertTwoDigit(lakhs);
    devanagari += lakhWords.devanagari + ' लाख ';
    phonetic += lakhWords.phonetic + ' lakh ';
    remaining = remaining % 100000;
  }

  // Thousands (1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    const thousandWords = convertTwoDigit(thousands);
    devanagari += thousandWords.devanagari + ' हजार ';
    phonetic += thousandWords.phonetic + ' hazaar ';
    remaining = remaining % 1000;
  }

  // Hundreds (100)
  if (remaining >= 100) {
    const hundreds = Math.floor(remaining / 100);
    devanagari += ones[hundreds] + ' सौ ';
    phonetic += onesPhonetic[hundreds] + ' sau ';
    remaining = remaining % 100;
  }

  // Remaining two digits
  if (remaining > 0) {
    const lastTwo = convertTwoDigit(remaining);
    devanagari += lastTwo.devanagari;
    phonetic += lastTwo.phonetic;
  }

  return {
    devanagari: devanagari.trim(),
    phonetic: phonetic.trim()
  };
}

// Format response in Hindi with number words
function formatHindiResponse(intent: QueryIntent, data: any): string {
  switch (intent) {
    case 'invoice_count':
      const countWords = numberToHindiWords(data.count);
      return `📊 **इनवॉइस की संख्या**\n\nकुल इनवॉइस: **${data.count}** (${countWords.devanagari})`;
    
    case 'invoice_stats':
      const totalAmountWords = numberToHindiWords(data.totalAmount);
      const paidAmountWords = numberToHindiWords(data.paidAmount);
      const pendingAmountWords = numberToHindiWords(data.pendingAmount);
      const statsCountWords = numberToHindiWords(data.count);
      
      return `📊 **इनवॉइस आंकड़े**\n\n` +
        `कुल इनवॉइस: ${data.count} (${statsCountWords.devanagari})\n` +
        `कुल राशि: ₹${data.totalAmount.toLocaleString('en-IN')} (${totalAmountWords.devanagari} रुपये)\n` +
        `भुगतान: ₹${data.paidAmount.toLocaleString('en-IN')} (${paidAmountWords.devanagari} रुपये)\n` +
        `बकाया: ₹${data.pendingAmount.toLocaleString('en-IN')} (${pendingAmountWords.devanagari} रुपये)`;
    
    case 'revenue_total':
      const revenueWords = numberToHindiWords(data.revenue);
      return `💰 **कुल राजस्व**\n\n₹${data.revenue.toLocaleString('en-IN')}\n(${revenueWords.devanagari} रुपये)`;
    
    case 'customer_count':
      const customerWords = numberToHindiWords(data.count);
      return `👥 **ग्राहक संख्या**\n\nकुल ग्राहक: **${data.count}** (${customerWords.devanagari})`;
    
    case 'debtor_list':
      if (data.length === 0) {
        return `✅ **कोई बकायादार नहीं!**\n\nसभी ग्राहकों ने अपना भुगतान कर दिया है।`;
      }
      
      let response = `💸 **बड़े देनदार**\n\n`;
      data.forEach((debtor: any, index: number) => {
        const debtorWords = numberToHindiWords(debtor.outstanding);
        response += `${index + 1}. ${debtor.customerName}\n`;
        response += `   बकाया: ₹${debtor.outstanding.toLocaleString('en-IN')} (${debtorWords.devanagari} रुपये)\n\n`;
      });
      return response;
    
    case 'debtor_count':
      const debtorCountWords = numberToHindiWords(data.count);
      return `📊 **देनदार संख्या**\n\nकुल देनदार: **${data.count}** (${debtorCountWords.devanagari})`;
    
    case 'outstanding_balance':
      const balanceWords = numberToHindiWords(data.balance);
      let hindiOutstandingResponse = `💸 **बकाया रिपोर्ट**\n\n`;
      hindiOutstandingResponse += `📊 **कुल बकाया:** ₹${data.balance.toLocaleString('en-IN')}\n`;
      hindiOutstandingResponse += `(${balanceWords.devanagari} रुपये)\n\n`;
      
      // Category breakdown
      hindiOutstandingResponse += `📂 **श्रेणी विवरण:**\n`;
      const categories = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;
      categories.forEach(cat => {
        const catData = data.categoryBreakdown[cat];
        if (catData.count > 0) {
          hindiOutstandingResponse += `${cat}: ₹${catData.amount.toLocaleString('en-IN')} (${catData.count} ग्राहक)\n`;
        }
      });
      
      // Aging breakdown
      hindiOutstandingResponse += `\n⏰ **देय जानकारी:**\n`;
      if (data.agingBreakdown.dueToday.count > 0) {
        hindiOutstandingResponse += `आज देय: ₹${data.agingBreakdown.dueToday.amount.toLocaleString('en-IN')} (${data.agingBreakdown.dueToday.count} ग्राहक)\n`;
      }
      if (data.agingBreakdown.overdue.count > 0) {
        hindiOutstandingResponse += `अतिदेय: ₹${data.agingBreakdown.overdue.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue.count} ग्राहक)\n`;
      }
      if (data.agingBreakdown.overdue30to60.count > 0) {
        hindiOutstandingResponse += `30-60 दिन: ₹${data.agingBreakdown.overdue30to60.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue30to60.count} ग्राहक)\n`;
      }
      if (data.agingBreakdown.overdue60to90.count > 0) {
        hindiOutstandingResponse += `60-90 दिन: ₹${data.agingBreakdown.overdue60to90.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue60to90.count} ग्राहक)\n`;
      }
      if (data.agingBreakdown.overdue90to120.count > 0) {
        hindiOutstandingResponse += `90-120 दिन: ₹${data.agingBreakdown.overdue90to120.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue90to120.count} ग्राहक)\n`;
      }
      if (data.agingBreakdown.overdue120plus.count > 0) {
        hindiOutstandingResponse += `120+ दिन: ₹${data.agingBreakdown.overdue120plus.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue120plus.count} ग्राहक)\n`;
      }
      
      return hindiOutstandingResponse;
    
    case 'payment_stats':
      const paymentCountWords = numberToHindiWords(data.count);
      const receivedWords = numberToHindiWords(data.totalReceived);
      
      return `💳 **भुगतान आंकड़े**\n\n` +
        `कुल भुगतान: ${data.count} (${paymentCountWords.devanagari})\n` +
        `कुल राशि प्राप्त: ₹${data.totalReceived.toLocaleString('en-IN')} (${receivedWords.devanagari} रुपये)`;
    
    default:
      return `❓ मैं आपका सवाल समझ नहीं पाया।\n\n` +
        `कृपया ये पूछें:\n` +
        `• "कितने इनवॉइस हैं?"\n` +
        `• "कुल revenue कितनी है?"\n` +
        `• "बड़े देनदार कौन हैं?"\n` +
        `• "कुल बकाया कितना है?"\n\n` +
        `या /help टाइप करें।`;
  }
}

// Format response in English
function formatEnglishResponse(intent: QueryIntent, data: any): string {
  switch (intent) {
    case 'invoice_count':
      return `📊 **Invoice Count**\n\nTotal Invoices: **${data.count}**`;
    
    case 'invoice_stats':
      return `📊 **Invoice Statistics**\n\n` +
        `Total Invoices: ${data.count}\n` +
        `Total Amount: ₹${data.totalAmount.toLocaleString('en-IN')}\n` +
        `Paid Amount: ₹${data.paidAmount.toLocaleString('en-IN')}\n` +
        `Pending Amount: ₹${data.pendingAmount.toLocaleString('en-IN')}`;
    
    case 'revenue_total':
      return `💰 **Total Revenue**\n\n₹${data.revenue.toLocaleString('en-IN')}`;
    
    case 'customer_count':
      return `👥 **Customer Count**\n\nTotal Customers: **${data.count}**`;
    
    case 'debtor_list':
      if (data.length === 0) {
        return `✅ **No Outstanding Debtors!**\n\nAll customers have cleared their dues.`;
      }
      
      let response = `💸 **Top Debtors**\n\n`;
      data.forEach((debtor: any, index: number) => {
        response += `${index + 1}. ${debtor.customerName}\n`;
        response += `   Outstanding: ₹${debtor.outstanding.toLocaleString('en-IN')}\n\n`;
      });
      return response;
    
    case 'debtor_count':
      return `📊 **Debtor Count**\n\nTotal Debtors: **${data.count}**`;
    
    case 'outstanding_balance':
      let engOutstandingResponse = `💸 **Outstanding Report**\n\n`;
      engOutstandingResponse += `📊 **Total Outstanding:** ₹${data.balance.toLocaleString('en-IN')}\n\n`;
      
      // Category breakdown
      engOutstandingResponse += `📂 **Category Breakdown:**\n`;
      const engCategories = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;
      engCategories.forEach(cat => {
        const catData = data.categoryBreakdown[cat];
        if (catData.count > 0) {
          engOutstandingResponse += `${cat}: ₹${catData.amount.toLocaleString('en-IN')} (${catData.count} customers)\n`;
        }
      });
      
      // Aging breakdown
      engOutstandingResponse += `\n⏰ **Due Information:**\n`;
      if (data.agingBreakdown.dueToday.count > 0) {
        engOutstandingResponse += `Due Today: ₹${data.agingBreakdown.dueToday.amount.toLocaleString('en-IN')} (${data.agingBreakdown.dueToday.count} customers)\n`;
      }
      if (data.agingBreakdown.overdue.count > 0) {
        engOutstandingResponse += `Overdue: ₹${data.agingBreakdown.overdue.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue.count} customers)\n`;
      }
      if (data.agingBreakdown.overdue30to60.count > 0) {
        engOutstandingResponse += `30-60 days: ₹${data.agingBreakdown.overdue30to60.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue30to60.count} customers)\n`;
      }
      if (data.agingBreakdown.overdue60to90.count > 0) {
        engOutstandingResponse += `60-90 days: ₹${data.agingBreakdown.overdue60to90.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue60to90.count} customers)\n`;
      }
      if (data.agingBreakdown.overdue90to120.count > 0) {
        engOutstandingResponse += `90-120 days: ₹${data.agingBreakdown.overdue90to120.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue90to120.count} customers)\n`;
      }
      if (data.agingBreakdown.overdue120plus.count > 0) {
        engOutstandingResponse += `120+ days: ₹${data.agingBreakdown.overdue120plus.amount.toLocaleString('en-IN')} (${data.agingBreakdown.overdue120plus.count} customers)\n`;
      }
      
      return engOutstandingResponse;
    
    case 'payment_stats':
      return `💳 **Payment Statistics**\n\n` +
        `Total Payments Received: ${data.count}\n` +
        `Total Amount Received: ₹${data.totalReceived.toLocaleString('en-IN')}`;
    
    default:
      return `❓ I couldn't understand your query.\n\n` +
        `Please try asking:\n` +
        `• "How many invoices?"\n` +
        `• "Total revenue?"\n` +
        `• "List top debtors"\n` +
        `• "Outstanding balance?"\n\n` +
        `Or type /help for more examples.`;
  }
}

// Format response based on detected language
function formatResponse(intent: QueryIntent, data: any, language: 'hindi' | 'english'): string {
  if (language === 'hindi') {
    return formatHindiResponse(intent, data);
  }
  return formatEnglishResponse(intent, data);
}

// Generate voice audio from text using OpenAI TTS
async function generateVoiceFromText(text: string, voiceType: string = 'alloy', language: 'hindi' | 'english' = 'english'): Promise<Buffer | null> {
  if (!openai) {
    console.error('[Telegram Bot] OpenAI client not initialized');
    return null;
  }
  
  try {
    // Remove markdown formatting for better TTS
    let cleanText = text
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '') // Remove italic markers
      .replace(/───────────────/g, '') // Remove separators
      .replace(/📊|💰|👥|💸|💳|✅|❓/g, ''); // Remove emojis for cleaner audio
    
    // For Hindi responses, replace number patterns with phonetic words
    if (language === 'hindi') {
      // Replace patterns like "₹9,77,764 (नौ लाख सत्तर हजार सात सौ चौंसठ रुपये)"
      // Extract the Devanagari words and replace the entire pattern
      cleanText = cleanText.replace(/₹[\d,]+\s*\(([^)]+)\)/g, (match, devanagariWords) => {
        // Convert Devanagari to phonetic for TTS
        const words = devanagariWords.trim();
        // Extract just the number words, removing "रुपये" for processing
        const numberPart = words.replace(/\s*रुपये\s*$/, '');
        
        // Convert Devanagari number words to phonetic
        // This is a simple mapping - expand as needed
        const phoneticMapping: Record<string, string> = {
          'शून्य': 'shunya',
          'एक': 'ek', 'दो': 'do', 'तीन': 'teen', 'चार': 'char', 'पांच': 'paanch',
          'छह': 'chhah', 'सात': 'saat', 'आठ': 'aath', 'नौ': 'no',
          'दस': 'das', 'ग्यारह': 'gyarah', 'बारह': 'barah', 'तेरह': 'terah',
          'चौदह': 'chaudah', 'पंद्रह': 'pandrah', 'सोलह': 'solah', 'सत्रह': 'satrah',
          'अठारह': 'atharah', 'उन्नीस': 'unnis', 'बीस': 'bees',
          'सौ': 'sau', 'हजार': 'hazaar', 'लाख': 'lakh', 'करोड़': 'crore',
          'रुपये': 'rupaye'
        };
        
        // For now, parse the number from the digit pattern and convert
        const digitMatch = match.match(/₹([\d,]+)/);
        if (digitMatch) {
          const numericValue = parseInt(digitMatch[1].replace(/,/g, ''));
          const phoneticWords = numberToHindiWords(numericValue).phonetic;
          return phoneticWords + ' rupaye';
        }
        return match;
      });
      
      // Also replace standalone number patterns like "42 (बयालीस)"
      cleanText = cleanText.replace(/(\d+)\s*\(([^)]+)\)/g, (match, digits, devanagariWords) => {
        const numericValue = parseInt(digits);
        return numberToHindiWords(numericValue).phonetic;
      });
    }
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voiceType as any,
      input: cleanText,
      response_format: 'opus', // Telegram requires OGG/Opus format for voice messages
    });
    
    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[Telegram Bot] Error generating voice:', error);
    return null;
  }
}

// Get or create Telegram bot instance
export async function getTelegramBot(): Promise<Telegraf | null> {
  try {
    // Fetch bot configuration from database
    const config = await db.query.telegramBotConfig.findFirst({
      where: eq(telegramBotConfig.isActive, true),
    });

    if (!config || !config.botToken) {
      console.log('[Telegram Bot] No active bot configuration found');
      return null;
    }

    // Initialize bot if not already initialized or token changed
    if (!bot || currentBotToken !== config.botToken) {
      console.log('[Telegram Bot] Initializing bot with new token');
      bot = new Telegraf(config.botToken);
      currentBotToken = config.botToken;
      
      // Initialize OpenAI with API key from database (Whisper settings)
      try {
        const { storage } = await import('./storage');
        const whisperConfig = await storage.getWhisperConfigSecure();
        
        if (whisperConfig && whisperConfig.decryptedApiKey) {
          console.log('[Telegram Bot] OpenAI API key loaded from database');
          initializeOpenAI(whisperConfig.decryptedApiKey);
        } else {
          console.log('[Telegram Bot] No OpenAI API key configured in Whisper settings');
        }
      } catch (error) {
        console.error('[Telegram Bot] Failed to load OpenAI API key from database:', error);
      }

      // Register command handlers
      setupCommandHandlers(bot);
      setupMessageHandlers(bot);
    }

    return bot;
  } catch (error) {
    console.error('[Telegram Bot] Error initializing bot:', error);
    return null;
  }
}

// Setup command handlers
function setupCommandHandlers(bot: Telegraf) {
  // /start command
  bot.command('start', async (ctx) => {
    try {
      const userId = ctx.from?.id.toString();
      const firstName = ctx.from?.first_name || 'User';
      
      // Check if user is already linked
      const existingMapping = await db.query.telegramUserMappings.findFirst({
        where: and(
          eq(telegramUserMappings.telegramUserId, userId!),
          eq(telegramUserMappings.isActive, true)
        ),
      });

      if (existingMapping) {
        await ctx.reply(
          `✅ Welcome back, ${firstName}!\n\n` +
          `You're already linked to your organization.\n\n` +
          `📊 Send me a voice message to query business data!\n\n` +
          `Examples:\n` +
          `🎤 "Show me total invoices"\n` +
          `🎤 "How many customers do I have?"\n` +
          `🎤 "What's my total revenue?"\n` +
          `🎤 "List top debtors"\n\n` +
          `Or type /help for more information.`
        );
      } else {
        await ctx.reply(
          `👋 Welcome to RECOV Business Intelligence Bot!\n\n` +
          `I can help you query your business data using voice commands.\n\n` +
          `🔗 To get started:\n` +
          `1. Log in to your RECOV account\n` +
          `2. Go to Telegram Bot section\n` +
          `3. Generate a linking code\n` +
          `4. Send me: /link YOUR_CODE\n\n` +
          `Example: /link ABC123XYZ`
        );
      }
    } catch (error) {
      console.error('[Telegram Bot] Error in /start command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // /link command
  bot.command('link', async (ctx) => {
    try {
      const userId = ctx.from?.id.toString();
      const username = ctx.from?.username;
      const firstName = ctx.from?.first_name;
      const lastName = ctx.from?.last_name;
      
      // Extract linking code from command
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply(
          `❌ Invalid command format.\n\n` +
          `Usage: /link YOUR_CODE\n` +
          `Example: /link ABC123XYZ`
        );
        return;
      }

      let code = args[1].toUpperCase();
      
      // Support both formats: "FMCZWMR4" and "LINK-FMCZWMR4"
      // If code doesn't start with "LINK-", add the prefix
      if (!code.startsWith('LINK-')) {
        code = `LINK-${code}`;
      }

      // Check if user is already linked
      const existingMapping = await db.query.telegramUserMappings.findFirst({
        where: and(
          eq(telegramUserMappings.telegramUserId, userId!),
          eq(telegramUserMappings.isActive, true)
        ),
      });

      if (existingMapping) {
        await ctx.reply(
          `⚠️ You're already linked to an organization.\n\n` +
          `If you want to link to a different organization, please contact your administrator.`
        );
        return;
      }

      // Validate linking code
      const linkingCode = await db.query.telegramLinkingCodes.findFirst({
        where: and(
          eq(telegramLinkingCodes.code, code),
          eq(telegramLinkingCodes.isUsed, false),
          gte(telegramLinkingCodes.expiresAt, new Date())
        ),
      });

      if (!linkingCode) {
        await ctx.reply(
          `❌ Invalid or expired linking code.\n\n` +
          `Please generate a new code from your RECOV account and try again.`
        );
        return;
      }

      // Create user mapping
      await db.insert(telegramUserMappings).values({
        telegramUserId: userId!,
        tenantId: linkingCode.tenantId,
        userId: linkingCode.generatedByUserId || null,
        telegramUsername: username || null,
        telegramFirstName: firstName || null,
        telegramLastName: lastName || null,
        isActive: true,
        linkedAt: new Date(),
        lastActivityAt: new Date(),
      });

      // Mark linking code as used
      await db.update(telegramLinkingCodes)
        .set({ isUsed: true })
        .where(eq(telegramLinkingCodes.id, linkingCode.id));

      await ctx.reply(
        `✅ Successfully linked!\n\n` +
        `You can now query your business data using voice messages.\n\n` +
        `📊 Examples:\n` +
        `🎤 "Show me total invoices"\n` +
        `🎤 "How many customers do I have?"\n` +
        `🎤 "What's my total revenue?"\n` +
        `🎤 "List top debtors"\n\n` +
        `Just send me a voice message with your query!`
      );
    } catch (error) {
      console.error('[Telegram Bot] Error in /link command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 RECOV Business Intelligence Bot Help\n\n` +
      `🎤 Voice Queries:\n` +
      `Send voice messages to query your business data in Hindi, English, or Hinglish.\n\n` +
      `📊 Example Queries:\n` +
      `• "Show me total invoices" / "कुल इनवॉइस दिखाओ"\n` +
      `• "How many customers?" / "कितने कस्टमर हैं?"\n` +
      `• "What's my revenue?" / "मेरी revenue क्या है?"\n` +
      `• "List top debtors" / "Top debtors की list"\n` +
      `• "Outstanding payments" / "बकाया payments"\n\n` +
      `🔗 Commands:\n` +
      `/start - Start the bot\n` +
      `/link CODE - Link your account\n` +
      `/help - Show this help message\n\n` +
      `Need assistance? Contact your administrator.`
    );
  });
}

// Setup message handlers
function setupMessageHandlers(bot: Telegraf) {
  // Voice message handler
  bot.on(message('voice'), async (ctx) => {
    try {
      const userId = ctx.from?.id.toString();
      
      // Check if user is linked
      const userMapping = await db.query.telegramUserMappings.findFirst({
        where: and(
          eq(telegramUserMappings.telegramUserId, userId!),
          eq(telegramUserMappings.isActive, true)
        ),
      });

      if (!userMapping) {
        await ctx.reply(
          `❌ You're not linked to any organization.\n\n` +
          `Please use /start to begin the linking process.`
        );
        return;
      }

      // Update last activity
      await db.update(telegramUserMappings)
        .set({ lastActivityAt: new Date() })
        .where(eq(telegramUserMappings.id, userMapping.id));

      // Notify user that we're processing
      await ctx.reply('🎤 Processing your voice message...');

      // Download voice file
      const fileId = ctx.message.voice.file_id;
      const file = await ctx.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${currentBotToken}/${file.file_path}`;
      
      const response = await fetch(fileUrl);
      const buffer = await response.buffer();

      // Check if OpenAI is initialized
      if (!openai) {
        await ctx.reply(
          `❌ Voice transcription is not available.\n\n` +
          `Please contact your administrator to configure the OpenAI API key.`
        );
        return;
      }

      // Transcribe using OpenAI Whisper
      // Use OpenAI's toFile helper to create a proper file object from buffer
      const { toFile } = await import('openai/uploads');
      const audioFile = await toFile(buffer, 'voice.oga', { type: 'audio/ogg' });
      
      // Rich business context prompt for better Hindi/Hinglish/English recognition
      // Whisper uses prompts as textual biasing - provide natural sentences with domain vocabulary
      const businessPrompt = `You are transcribing Indian business finance conversations in Hindi, English, or Hinglish. ` +
        `Common terms include: invoice (इनवॉइस, इन्वॉइस), revenue (रेवेन्यू), customer (ग्राहक, कस्टमर), ` +
        `debtor (देनदार, डेबटर), outstanding (आउटस्टैंडिंग, बकाया), payment (पेमेंट, भुगतान), ` +
        `total (टोटल, कुल), collection (कलेक्शन, वसूली), dues (देय, ड्यूज), ` +
        `follow-up (फॉलो-अप), sales (सेल्स, बिक्री), ledger (लेजर, खाता), ` +
        `recovery (रिकवरी, वसूली), reminder (रिमाइंडर, अनुस्मारक), receipt (रसीद), ` +
        `balance (बैलेंस, शेष), amount (अमाउंट, राशि), date (डेट, तारीख), ` +
        `kitne (कितने), kitna (कितना), how many, how much, list (लिस्ट, सूची).`;
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // English mode works better for Indian accent and Hinglish
        prompt: businessPrompt, // Rich business context for better accuracy
        temperature: 0, // Reduce hallucinations, more deterministic output
      });

      const transcribedText = transcription.text;

      // Send transcription back to user
      await ctx.reply(`📝 Transcribed: "${transcribedText}"`);

      // Detect language from transcription
      const detectedLanguage = detectLanguage(transcribedText);

      // Parse query to detect intent
      const parsedQuery = parseQuery(transcribedText);
      const { intent } = parsedQuery;

      let responseText = '';
      let queryData: any = null;

      try {
        // Execute query based on intent
        switch (intent) {
          case 'invoice_count':
            queryData = await queryInvoiceCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'invoice_stats':
            queryData = await queryInvoiceStats(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'revenue_total':
            queryData = await queryRevenue(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'customer_count':
            queryData = await queryCustomerCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'debtor_list':
            queryData = await queryDebtorList(userMapping.tenantId, 5);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'debtor_count':
            queryData = await queryDebtorCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'outstanding_balance':
            queryData = await queryOutstandingBalance(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'payment_stats':
            queryData = await queryPaymentStats(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          default:
            responseText = formatResponse('unknown', null, detectedLanguage);
            break;
        }

        // Get bot configuration to check if voice responses are enabled
        const botConfig = await db.query.telegramBotConfig.findFirst({
          where: eq(telegramBotConfig.isActive, true),
        });
        
        // Send voice or text response based on configuration
        if (botConfig?.enableVoiceResponse && openai) {
          // Generate voice from text with detected language for proper pronunciation
          const voiceBuffer = await generateVoiceFromText(responseText, botConfig.voiceType, detectedLanguage);
          
          if (voiceBuffer) {
            // Send as voice message
            await ctx.replyWithVoice({ source: voiceBuffer });
          } else {
            // Fallback to text if voice generation fails
            await ctx.reply(responseText);
          }
        } else {
          // Send text response (default behavior)
          await ctx.reply(responseText);
        }

        // Log the query with intent and response
        await db.insert(telegramQueryLogs).values({
          telegramUserId: userId!,
          tenantId: userMapping.tenantId,
          queryText: transcribedText,
          queryType: intent,
          responseText: responseText.substring(0, 500), // Truncate if too long
          voiceFileId: fileId,
        });

      } catch (queryError) {
        console.error('[Telegram Bot] Error executing query:', queryError);
        await ctx.reply(
          `❌ Sorry, I encountered an error while processing your query.\n\n` +
          `Please try again or contact your administrator.`
        );

        // Log error
        await db.insert(telegramQueryLogs).values({
          telegramUserId: userId!,
          tenantId: userMapping.tenantId,
          queryText: transcribedText,
          queryType: intent,
          responseText: `Error: ${(queryError as Error).message}`,
          voiceFileId: fileId,
        });
      }

    } catch (error) {
      console.error('[Telegram Bot] Error processing voice message:', error);
      await ctx.reply(
        `❌ Sorry, I couldn't process your voice message.\n\n` +
        `Please try again or contact your administrator.`
      );
    }
  });

  // Text message handler (for direct text queries)
  bot.on(message('text'), async (ctx) => {
    try {
      const userId = ctx.from?.id.toString();
      const text = ctx.message.text;

      // Skip if it's a command
      if (text.startsWith('/')) {
        return;
      }

      // Check if user is linked
      const userMapping = await db.query.telegramUserMappings.findFirst({
        where: and(
          eq(telegramUserMappings.telegramUserId, userId!),
          eq(telegramUserMappings.isActive, true)
        ),
      });

      if (!userMapping) {
        await ctx.reply(
          `❌ You're not linked to any organization.\n\n` +
          `Please use /start to begin the linking process.`
        );
        return;
      }

      // Update last activity
      await db.update(telegramUserMappings)
        .set({ lastActivityAt: new Date() })
        .where(eq(telegramUserMappings.id, userMapping.id));

      // Notify user that we're processing
      await ctx.reply('⏳ Processing your query...');

      // Detect language from text
      const detectedLanguage = detectLanguage(text);

      // Parse query to detect intent
      const parsedQuery = parseQuery(text);
      const { intent } = parsedQuery;

      let responseText = '';
      let queryData: any = null;

      try {
        // Execute query based on intent
        switch (intent) {
          case 'invoice_count':
            queryData = await queryInvoiceCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'invoice_stats':
            queryData = await queryInvoiceStats(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'revenue_total':
            queryData = await queryRevenue(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'customer_count':
            queryData = await queryCustomerCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'debtor_list':
            queryData = await queryDebtorList(userMapping.tenantId, 5);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'debtor_count':
            queryData = await queryDebtorCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'outstanding_balance':
            queryData = await queryOutstandingBalance(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          case 'payment_stats':
            queryData = await queryPaymentStats(userMapping.tenantId);
            responseText = formatResponse(intent, queryData, detectedLanguage);
            break;

          default:
            responseText = formatResponse('unknown', null, detectedLanguage);
            break;
        }

        // Get bot configuration to check if voice responses are enabled
        const botConfig = await db.query.telegramBotConfig.findFirst({
          where: eq(telegramBotConfig.isActive, true),
        });
        
        // Send voice or text response based on configuration
        if (botConfig?.enableVoiceResponse && openai) {
          // Generate voice from text with detected language for proper pronunciation
          const voiceBuffer = await generateVoiceFromText(responseText, botConfig.voiceType, detectedLanguage);
          
          if (voiceBuffer) {
            // Send as voice message
            await ctx.replyWithVoice({ source: voiceBuffer });
          } else {
            // Fallback to text if voice generation fails
            await ctx.reply(responseText);
          }
        } else {
          // Send text response (default behavior)
          await ctx.reply(responseText);
        }

        // Log the query with intent and response
        await db.insert(telegramQueryLogs).values({
          telegramUserId: userId!,
          tenantId: userMapping.tenantId,
          queryText: text,
          queryType: intent,
          responseText: responseText.substring(0, 500), // Truncate if too long
          voiceFileId: null, // No voice file for text queries
        });

      } catch (queryError) {
        console.error('[Telegram Bot] Error executing text query:', queryError);
        await ctx.reply(
          `❌ Sorry, I encountered an error while processing your query.\n\n` +
          `Please try again or contact your administrator.`
        );

        // Log error
        await db.insert(telegramQueryLogs).values({
          telegramUserId: userId!,
          tenantId: userMapping.tenantId,
          queryText: text,
          queryType: intent,
          responseText: `Error: ${(queryError as Error).message}`,
          voiceFileId: null,
        });
      }

    } catch (error) {
      console.error('[Telegram Bot] Error processing text message:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });
}

// Initialize and launch the bot
export async function initializeAndLaunchBot() {
  try {
    console.log('[Telegram Bot] Starting bot initialization...');
    const botInstance = await getTelegramBot();
    
    if (!botInstance) {
      console.log('[Telegram Bot] No bot configuration found, skipping initialization');
      return;
    }

    console.log('[Telegram Bot] Launching bot with polling...');
    
    // Launch bot in background (don't await) to prevent blocking server startup
    botInstance.launch()
      .then(() => {
        console.log('[Telegram Bot] ✅ Bot is now running and listening for messages');
      })
      .catch((error) => {
        console.error('[Telegram Bot] Failed to launch bot:', error);
      });

    // Enable graceful stop
    process.once('SIGINT', () => botInstance.stop('SIGINT'));
    process.once('SIGTERM', () => botInstance.stop('SIGTERM'));
    
    console.log('[Telegram Bot] Bot launch initiated (running in background)');
  } catch (error) {
    console.error('[Telegram Bot] Failed to initialize bot:', error);
  }
}

// Process webhook update
export async function processWebhookUpdate(update: Update) {
  try {
    const bot = await getTelegramBot();
    
    if (!bot) {
      console.error('[Telegram Bot] Bot not initialized');
      return;
    }

    await bot.handleUpdate(update);
  } catch (error) {
    console.error('[Telegram Bot] Error processing webhook update:', error);
    throw error;
  }
}
