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

// Natural language query parser with Hindi/English/Hinglish support
function parseQuery(text: string): ParsedQuery {
  const lowerText = text.toLowerCase();
  
  // Invoice count patterns - supports singular/plural
  if (
    /\b(kitne|kitna|how many|total|count)\b.*\b(invoices?|bills?|challans?)\b/i.test(lowerText) ||
    /\b(invoices?|bills?)\b.*\b(kitne|kitna|how many|count)\b/i.test(lowerText)
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
  
  // Revenue patterns - flexible word order
  if (
    /\b(total|kitna|kya hai|show)\b.*\b(revenue|earning|kamai|income)\b/i.test(lowerText) ||
    /\b(revenue|earning|kamai)\b.*\b(total|kitna|kya)\b/i.test(lowerText) ||
    /\b(revenue|earning|kamai)\b/i.test(lowerText)
  ) {
    return { intent: 'revenue_total', confidence: 'high' };
  }
  
  // Customer count patterns - supports singular/plural
  if (
    /\b(kitne|kitna|how many|total)\b.*\b(customers?|clients?|party|parties)\b/i.test(lowerText) ||
    /\b(customers?|clients?|party)\b.*\b(kitne|kitna|how many|count)\b/i.test(lowerText)
  ) {
    return { intent: 'customer_count', confidence: 'high' };
  }
  
  // Debtor list patterns - supports singular/plural
  if (
    /\b(debtors?|baaki|bakaya|outstanding)\b.*\b(list|dikhao|show)\b/i.test(lowerText) ||
    /\b(list|dikhao|show)\b.*\b(debtors?|baaki|bakaya)\b/i.test(lowerText) ||
    /\b(top|bade|biggest)\b.*\b(debtors?|baaki)\b/i.test(lowerText)
  ) {
    return { intent: 'debtor_list', confidence: 'high' };
  }
  
  // Debtor count patterns
  if (
    /\b(kitne|how many)\b.*\b(debtors?|outstanding|baaki)\b/i.test(lowerText)
  ) {
    return { intent: 'debtor_count', confidence: 'high' };
  }
  
  // Outstanding balance patterns - added 'balance' keyword and more flexible matching
  if (
    /\b(outstanding|baaki|bakaya)\b.*\b(balance|amount|paisa|kitna)\b/i.test(lowerText) ||
    /\b(total|show)\b.*\b(outstanding|baaki|bakaya)\b/i.test(lowerText) ||
    /\b(balance)\b.*\b(outstanding|pending|baaki)\b/i.test(lowerText) ||
    (/\b(outstanding|bakaya|baaki)\b/i.test(lowerText) && /\b(balance)\b/i.test(lowerText))
  ) {
    return { intent: 'outstanding_balance', confidence: 'high' };
  }
  
  // Payment stats patterns
  if (
    /\b(payments?|receipts?)\b.*\b(stats|data|kitna)\b/i.test(lowerText)
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

async function queryOutstandingBalance(tenantId: string): Promise<{ balance: number }> {
  // Match Portal's calculation logic from getDebtorsList()
  // Calculate per-customer balance and sum only positive balances
  
  const customers = await db.select().from(masterCustomers).where(eq(masterCustomers.tenantId, tenantId));
  const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
  const allReceipts = await db.select().from(receipts).where(eq(receipts.tenantId, tenantId));
  
  let totalOutstanding = 0;
  
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
    }
  }
  
  return { balance: totalOutstanding };
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

// Format response with emojis and proper Hindi/English text
function formatResponse(intent: QueryIntent, data: any): string {
  switch (intent) {
    case 'invoice_count':
      return `📊 **Invoice Count**\n\n` +
        `Total Invoices: **${data.count}**\n\n` +
        `कुल इनवॉइस: **${data.count}**`;
    
    case 'invoice_stats':
      return `📊 **Invoice Statistics**\n\n` +
        `Total Invoices: ${data.count}\n` +
        `Total Amount: ₹${data.totalAmount.toLocaleString('en-IN')}\n` +
        `Paid Amount: ₹${data.paidAmount.toLocaleString('en-IN')}\n` +
        `Pending Amount: ₹${data.pendingAmount.toLocaleString('en-IN')}\n\n` +
        `───────────────\n` +
        `कुल इनवॉइस: ${data.count}\n` +
        `कुल राशि: ₹${data.totalAmount.toLocaleString('en-IN')}\n` +
        `भुगतान: ₹${data.paidAmount.toLocaleString('en-IN')}\n` +
        `बकाया: ₹${data.pendingAmount.toLocaleString('en-IN')}`;
    
    case 'revenue_total':
      return `💰 **Total Revenue**\n\n` +
        `₹${data.revenue.toLocaleString('en-IN')}\n\n` +
        `कुल राजस्व: ₹${data.revenue.toLocaleString('en-IN')}`;
    
    case 'customer_count':
      return `👥 **Customer Count**\n\n` +
        `Total Customers: **${data.count}**\n\n` +
        `कुल ग्राहक: **${data.count}**`;
    
    case 'debtor_list':
      if (data.length === 0) {
        return `✅ **No Outstanding Debtors!**\n\nAll customers have cleared their dues.\n\nसभी ग्राहकों ने अपना भुगतान कर दिया है।`;
      }
      
      let response = `💸 **Top Debtors / बड़े देनदार**\n\n`;
      data.forEach((debtor: any, index: number) => {
        response += `${index + 1}. ${debtor.customerName}\n`;
        response += `   Outstanding: ₹${debtor.outstanding.toLocaleString('en-IN')}\n\n`;
      });
      return response;
    
    case 'debtor_count':
      return `📊 **Debtor Count**\n\n` +
        `Total Debtors: **${data.count}**\n\n` +
        `कुल देनदार: **${data.count}**`;
    
    case 'outstanding_balance':
      return `💸 **Total Outstanding Balance**\n\n` +
        `₹${data.balance.toLocaleString('en-IN')}\n\n` +
        `कुल बकाया राशि: ₹${data.balance.toLocaleString('en-IN')}`;
    
    case 'payment_stats':
      return `💳 **Payment Statistics**\n\n` +
        `Total Payments Received: ${data.count}\n` +
        `Total Amount Received: ₹${data.totalReceived.toLocaleString('en-IN')}\n\n` +
        `───────────────\n` +
        `कुल भुगतान: ${data.count}\n` +
        `कुल राशि प्राप्त: ₹${data.totalReceived.toLocaleString('en-IN')}`;
    
    default:
      return `❓ I couldn't understand your query.\n\n` +
        `Please try asking:\n` +
        `• "How many invoices?" / "कितने इनवॉइस?"\n` +
        `• "Total revenue?" / "कुल revenue?"\n` +
        `• "List top debtors" / "Top debtors की list"\n` +
        `• "Outstanding balance?" / "कुल बकाया?"\n\n` +
        `Or type /help for more examples.`;
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
            responseText = formatResponse(intent, queryData);
            break;

          case 'invoice_stats':
            queryData = await queryInvoiceStats(userMapping.tenantId);
            responseText = formatResponse(intent, queryData);
            break;

          case 'revenue_total':
            queryData = await queryRevenue(userMapping.tenantId);
            responseText = formatResponse(intent, queryData);
            break;

          case 'customer_count':
            queryData = await queryCustomerCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData);
            break;

          case 'debtor_list':
            queryData = await queryDebtorList(userMapping.tenantId, 5);
            responseText = formatResponse(intent, queryData);
            break;

          case 'debtor_count':
            queryData = await queryDebtorCount(userMapping.tenantId);
            responseText = formatResponse(intent, queryData);
            break;

          case 'outstanding_balance':
            queryData = await queryOutstandingBalance(userMapping.tenantId);
            responseText = formatResponse(intent, queryData);
            break;

          case 'payment_stats':
            queryData = await queryPaymentStats(userMapping.tenantId);
            responseText = formatResponse(intent, queryData);
            break;

          default:
            responseText = formatResponse('unknown', null);
            break;
        }

        // Send formatted response
        await ctx.reply(responseText);

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

      // For now, just acknowledge text messages
      await ctx.reply(
        `📝 Text query received: "${text}"\n\n` +
        `🎤 For better results, please send a voice message with your query.\n\n` +
        `Text-based query processing will be available in a future update.`
      );

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
