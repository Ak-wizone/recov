import { db } from "./db";
import { callTemplates } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CallTemplate {
  name: string;
  module: string;
  language: string;
  scriptText: string;
  
}

// Default call templates for payment reminders
const defaultTemplates: CallTemplate[] = [
  // Payment Due - Hindi
  {
    name: "Payment Due Reminder",
    module: "invoices",
    language: "hindi",
    scriptText: "Namaste {{customerName}} ji. Main {{companyName}} se bol raha hoon. Aapka payment {{invoiceNumber}} ke liye {{amount}} rupaye ka pending hai. Kripya jaldi payment karein. Dhanyavad.",
    // description: "Payment due reminder in Hindi for invoices"
  },
  // Payment Due - English
  {
    name: "Payment Due Reminder",
    module: "invoices",
    language: "english",
    scriptText: "Hello {{customerName}}. This is {{companyName}} calling. Your payment for invoice {{invoiceNumber}} of amount {{amount}} rupees is pending. Please make the payment at your earliest convenience. Thank you.",
    // description: "Payment due reminder in English for invoices"
  },
  // Payment Due - Hinglish
  {
    name: "Payment Due Reminder",
    module: "invoices",
    language: "hinglish",
    scriptText: "Hello {{customerName}} ji. Main {{companyName}} se call kar raha hoon. Aapka payment {{invoiceNumber}} ka {{amount}} rupees pending hai. Please jaldi payment kar dijiye. Thank you.",
    // description: "Payment due reminder in Hinglish for invoices"
  },
  // 7 Days Overdue - Hindi
  {
    name: "7 Days Overdue Notice",
    module: "debtors",
    language: "hindi",
    scriptText: "Namaste {{customerName}} ji. Yeh {{companyName}} se important call hai. Aapka payment {{amount}} rupaye ka 7 din se overdue hai. Kripya aaj hi payment complete karein nahi to late fees lag sakti hai. Dhanyavad.",
    // description: "7 days overdue notice in Hindi"
  },
  // 7 Days Overdue - English
  {
    name: "7 Days Overdue Notice",
    module: "debtors",
    language: "english",
    scriptText: "Hello {{customerName}}. This is an important call from {{companyName}}. Your payment of {{amount}} rupees is 7 days overdue. Please make the payment today to avoid late fees. Thank you.",
    // description: "7 days overdue notice in English"
  },
  // 7 Days Overdue - Hinglish
  {
    name: "7 Days Overdue Notice",
    module: "debtors",
    language: "hinglish",
    scriptText: "Hello {{customerName}} ji. Yeh {{companyName}} se important call hai. Aapka payment {{amount}} rupees ka 7 days overdue ho gaya hai. Please aaj hi payment kar dijiye to avoid late fees. Thank you.",
    // description: "7 days overdue notice in Hinglish"
  },
  // 15 Days Overdue - Hindi
  {
    name: "15 Days Overdue - Urgent",
    module: "debtors",
    language: "hindi",
    scriptText: "Namaste {{customerName}} ji. Yeh {{companyName}} se urgent call hai. Aapka payment {{amount}} rupaye ka 15 din se pending hai. Yeh bahut serious matter hai. Kripya turant payment karein warna legal action lena pad sakta hai. Dhanyavad.",
    // description: "15 days overdue urgent notice in Hindi"
  },
  // 15 Days Overdue - English
  {
    name: "15 Days Overdue - Urgent",
    module: "debtors",
    language: "english",
    scriptText: "Hello {{customerName}}. This is an urgent call from {{companyName}}. Your payment of {{amount}} rupees is 15 days overdue. This is a serious matter. Please make immediate payment to avoid legal action. Thank you.",
    // description: "15 days overdue urgent notice in English"
  },
  // 15 Days Overdue - Hinglish
  {
    name: "15 Days Overdue - Urgent",
    module: "debtors",
    language: "hinglish",
    scriptText: "Hello {{customerName}} ji. Yeh {{companyName}} se urgent call hai. Aapka payment {{amount}} rupees ka 15 days overdue hai. This is very serious. Please immediate payment kar dijiye to avoid legal action. Thank you.",
    // description: "15 days overdue urgent notice in Hinglish"
  },
  // 30 Days Overdue - Final Notice - Hindi
  {
    name: "30 Days Overdue - Final Notice",
    module: "debtors",
    language: "hindi",
    scriptText: "Namaste {{customerName}} ji. Yeh {{companyName}} se final notice hai. Aapka payment {{amount}} rupaye ka ek mahine se zyada overdue hai. Agar 24 ghante mein payment nahi hua to hum legal action lenge. Kripya turant payment karein. Dhanyavad.",
    // description: "30 days overdue final notice in Hindi"
  },
  // 30 Days Overdue - Final Notice - English
  {
    name: "30 Days Overdue - Final Notice",
    module: "debtors",
    language: "english",
    scriptText: "Hello {{customerName}}. This is the final notice from {{companyName}}. Your payment of {{amount}} rupees is over one month overdue. If payment is not received within 24 hours, we will proceed with legal action. Please make immediate payment. Thank you.",
    // description: "30 days overdue final notice in English"
  },
  // 30 Days Overdue - Final Notice - Hinglish
  {
    name: "30 Days Overdue - Final Notice",
    module: "debtors",
    language: "hinglish",
    scriptText: "Hello {{customerName}} ji. Yeh {{companyName}} se final notice hai. Aapka payment {{amount}} rupees ka ek month se zyada overdue hai. Agar 24 hours mein payment nahi hua to we will proceed with legal action. Please immediate payment kar dijiye. Thank you.",
    // description: "30 days overdue final notice in Hinglish"
  },
];

export async function seedCallTemplates(tenantId: string) {
  try {
    console.log(`[Seed Call Templates] Seeding templates for tenant: ${tenantId}`);
    
    for (const template of defaultTemplates) {
      // Check if template already exists
      const existing = await db
        .select()
        .from(callTemplates)
        .where(
          and(
            eq(callTemplates.tenantId, tenantId),
            eq(callTemplates.name, template.name),
            eq(callTemplates.language, template.language)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(callTemplates).values({
          tenantId,
          ...template,
        });
        console.log(`  ✓ Created: ${template.name} (${template.language})`);
      } else {
        console.log(`  ⊘ Skipped: ${template.name} (${template.language}) - already exists`);
      }
    }

    console.log(`[Seed Call Templates] Seeding complete for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`[Seed Call Templates] Error seeding templates:`, error);
    throw error;
  }
}

// Seed for all existing tenants
export async function seedCallTemplatesForAllTenants() {
  try {
    const { tenants } = await import("@shared/schema");
    const allTenants = await db.select().from(tenants);
    
    console.log(`\n🎙️  Seeding call templates for ${allTenants.length} tenants...`);
    
    for (const tenant of allTenants) {
      await seedCallTemplates(tenant.id);
    }
    
    console.log(`✅ Call templates seeding complete!\n`);
  } catch (error) {
    console.error(`❌ Call templates seeding failed:`, error);
  }
}
