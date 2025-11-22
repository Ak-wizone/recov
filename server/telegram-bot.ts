import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import type { Update } from 'telegraf/types';
import { db } from './db';
import { telegramBotConfig, telegramUserMappings, telegramLinkingCodes, telegramQueryLogs } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import fetch from 'node-fetch';
import FormData from 'form-data';
import OpenAI from 'openai';

let bot: Telegraf | null = null;
let currentBotToken: string | null = null;
let openai: OpenAI | null = null;

// Initialize OpenAI client (will be set when bot starts)
function initializeOpenAI(apiKey: string) {
  openai = new OpenAI({ apiKey });
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
      
      // Initialize OpenAI with API key from environment
      const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (openaiKey) {
        initializeOpenAI(openaiKey);
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

      const code = args[1].toUpperCase();

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

      // Create a temporary file-like object for OpenAI
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: 'voice.ogg',
        contentType: 'audio/ogg',
      });

      // Transcribe using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: await (async () => {
          // Create a stream from buffer
          const { Readable } = await import('stream');
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null);
          return stream as any;
        })(),
        model: 'whisper-1',
        language: 'hi', // Hindi/English/Hinglish detection
      });

      const transcribedText = transcription.text;

      // Send transcription back to user
      await ctx.reply(`📝 Transcribed: "${transcribedText}"`);

      // Process the query (will be implemented in next tasks)
      await ctx.reply(
        `🔄 Query processing coming soon!\n\n` +
        `I understood: "${transcribedText}"\n\n` +
        `Business data query handling will be implemented in the next update.`
      );

      // Log the query (will be properly implemented with NLP in next tasks)
      await db.insert(telegramQueryLogs).values({
        telegramUserId: userId!,
        tenantId: userMapping.tenantId,
        queryText: transcribedText,
        queryType: 'unknown', // Will be updated when NLP is implemented
        responseText: 'Query processing coming soon',
        voiceFileId: fileId,
      });

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
