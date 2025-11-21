import { db } from "./db";
import { communicationSchedules, invoices } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./email-service";
import { sendWhatsAppMessage } from "./whatsapp-service";
import { getEnrichedEmailVariables } from "./email-utils";

const SCHEDULER_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface SchedulerConfig {
  storage: any;
}

export class CommunicationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private storage: any;
  private isRunning = false;

  constructor(config: SchedulerConfig) {
    this.storage = config.storage;
  }

  start() {
    if (this.intervalId) {
      console.log("[Scheduler] Already running");
      return;
    }

    console.log("[Scheduler] Starting communication scheduler...");
    console.log(`[Scheduler] Will check for pending schedules every ${SCHEDULER_INTERVAL / 1000} seconds`);

    this.intervalId = setInterval(() => {
      this.checkAndExecuteSchedules().catch((error) => {
        console.error("[Scheduler] Error in scheduler execution:", error);
      });
    }, SCHEDULER_INTERVAL);

    this.checkAndExecuteSchedules().catch((error) => {
      console.error("[Scheduler] Error in initial scheduler run:", error);
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[Scheduler] Stopped communication scheduler");
    }
  }

  private async checkAndExecuteSchedules() {
    if (this.isRunning) {
      console.log("[Scheduler] Previous execution still running, skipping this cycle");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log("[Scheduler] Checking for pending schedules...");

      const now = new Date();
      
      // Fetch all active schedules (both specific_datetime and due-date based)
      const allActiveSchedules = await db
        .select()
        .from(communicationSchedules)
        .where(eq(communicationSchedules.isActive, "Active"));

      const pendingSchedules = [];

      for (const schedule of allActiveSchedules) {
        if (schedule.triggerType === "specific_datetime") {
          // For specific datetime, check if it's time to execute
          if (schedule.scheduledDateTime && schedule.scheduledDateTime <= now) {
            // Check if not already executed
            if (!schedule.lastRunAt || schedule.scheduledDateTime > schedule.lastRunAt) {
              pendingSchedules.push(schedule);
            }
          }
        } else {
          // For due-date based triggers, always check (they run daily)
          // We'll filter recipients in getRecipients based on their due dates
          if (!schedule.lastRunAt || this.shouldRunDueDateSchedule(schedule.lastRunAt)) {
            pendingSchedules.push(schedule);
          }
        }
      }

      if (pendingSchedules.length === 0) {
        console.log("[Scheduler] No pending schedules found");
      } else {
        console.log(`[Scheduler] Found ${pendingSchedules.length} pending schedule(s)`);

        for (const schedule of pendingSchedules) {
          try {
            await this.executeSchedule(schedule);
          } catch (error) {
            console.error(`[Scheduler] Error executing schedule ${schedule.id}:`, error);
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Scheduler] Cycle completed in ${duration}ms`);
    } catch (error) {
      console.error("[Scheduler] Error in checkAndExecuteSchedules:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private shouldRunDueDateSchedule(lastRunAt: Date | null): boolean {
    if (!lastRunAt) return true;
    
    // Run due-date schedules once per day
    const hoursSinceLastRun = (Date.now() - lastRunAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= 24;
  }

  private async executeSchedule(schedule: any) {
    console.log(`[Scheduler] Executing schedule: ${schedule.scheduleName} (${schedule.id})`);

    try {
      const recipients = await this.getRecipients(schedule);

      if (recipients.length === 0) {
        console.log(`[Scheduler] No recipients found for schedule ${schedule.scheduleName}`);
        await this.updateScheduleRuntime(schedule.id);
        return;
      }

      console.log(`[Scheduler] Found ${recipients.length} recipient(s) for ${schedule.scheduleName}`);

      let successCount = 0;
      let failureCount = 0;

      for (const recipient of recipients) {
        try {
          if (schedule.communicationType === "email") {
            await this.sendScheduledEmail(schedule, recipient);
            successCount++;
          } else if (schedule.communicationType === "whatsapp") {
            await this.sendScheduledWhatsApp(schedule, recipient);
            successCount++;
          } else if (schedule.communicationType === "call") {
            await this.makeScheduledCall(schedule, recipient);
            successCount++;
          }
        } catch (error) {
          console.error(`[Scheduler] Error sending to ${recipient.customerName}:`, error);
          failureCount++;
        }
      }

      console.log(`[Scheduler] Schedule ${schedule.scheduleName} completed: ${successCount} success, ${failureCount} failed`);

      await this.updateScheduleRuntime(schedule.id);
    } catch (error) {
      console.error(`[Scheduler] Error executing schedule ${schedule.id}:`, error);
      throw error;
    }
  }

  private async getRecipients(schedule: any) {
    const recipients: any[] = [];

    try {
      if (schedule.module === "invoices" || schedule.module === "debtors") {
        const invoiceList = await db
          .select({
            invoiceId: invoices.id,
            customerName: invoices.customerName,
            email: invoices.primaryEmail,
            phoneNumber: invoices.primaryMobile,
            category: invoices.category,
            invoiceNumber: invoices.invoiceNumber,
            invoiceDate: invoices.invoiceDate,
            paymentTerms: invoices.paymentTerms,
            grandTotal: invoices.invoiceAmount,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.tenantId, schedule.tenantId),
              eq(invoices.status, "Pending")
            )
          );

        for (const inv of invoiceList) {
          // Calculate dueDate from invoiceDate + paymentTerms (in days)
          let dueDate = null;
          if (inv.invoiceDate && inv.paymentTerms) {
            const invoiceDate = new Date(inv.invoiceDate);
            dueDate = new Date(invoiceDate.getTime() + inv.paymentTerms * 24 * 60 * 60 * 1000);
          }
          
          // Add calculated dueDate to invoice object
          const invoiceWithDueDate = { ...inv, dueDate };
          
          // First check filter conditions
          if (!this.matchesFilter(invoiceWithDueDate, schedule.filterCondition)) {
            continue;
          }

          // For due-date based triggers, check if invoice matches the target date
          if (schedule.triggerType === "days_before_due" || schedule.triggerType === "days_after_due") {
            if (!this.matchesDueDateCriteria(invoiceWithDueDate, schedule)) {
              continue;
            }
          }

          recipients.push(invoiceWithDueDate);
        }
      }
    } catch (error) {
      console.error(`[Scheduler] Error getting recipients:`, error);
    }

    return recipients;
  }

  private matchesDueDateCriteria(invoice: any, schedule: any): boolean {
    if (!invoice.dueDate || schedule.daysOffset === null || schedule.daysOffset === undefined) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (schedule.triggerType === "days_before_due") {
      // E.g., if daysOffset = 3, trigger when invoice due date is 3 days in future
      // if daysOffset = 0, trigger on the due date itself
      return daysDiff === schedule.daysOffset;
    } else if (schedule.triggerType === "days_after_due") {
      // E.g., if daysOffset = 3, trigger when invoice due date is 3 days in past
      // if daysOffset = 0, trigger on the due date itself
      return daysDiff === -schedule.daysOffset;
    }

    return false;
  }

  private matchesFilter(record: any, filterCondition: string | null): boolean {
    if (!filterCondition) return true;

    try {
      const content = filterCondition.match(/\((.*?)\)/);
      if (!content || !content[1]) return true;

      const innerContent = content[1];

      // New pipe-delimited format: (Alpha|Beta|Gamma)
      if (innerContent.includes('|')) {
        const allowedCategories = innerContent.split('|');
        return record.category && allowedCategories.includes(record.category);
      }

      // Legacy SQL-style format: (category='alpha' OR category='beta')
      if (innerContent.includes('category=')) {
        // Extract category values using regex: category='value'
        const categoryMatches = innerContent.matchAll(/category='(\w+)'/g);
        const allowedCategories = Array.from(categoryMatches).map(m => 
          m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
        );
        return record.category && allowedCategories.includes(record.category);
      }

      // If no recognizable filter format, allow all
      return true;
    } catch (error) {
      console.error("[Scheduler] Error parsing filter condition:", error);
      return true;
    }
  }

  private async sendScheduledEmail(schedule: any, recipient: any) {
    if (!recipient.email) {
      console.log(`[Scheduler] No email address for ${recipient.customerName}`);
      return;
    }

    const emailConfig = await this.storage.getEmailConfig(schedule.tenantId);
    if (!emailConfig) {
      console.error(`[Scheduler] No email config for tenant ${schedule.tenantId}`);
      return;
    }

    const template = await this.storage.getEmailTemplate(schedule.tenantId, schedule.emailTemplateId);
    if (!template) {
      console.error(`[Scheduler] Email template not found: ${schedule.emailTemplateId}`);
      return;
    }

    const enrichedVars = await getEnrichedEmailVariables(
      schedule.tenantId,
      template.module,
      recipient.invoiceId || recipient.customerId,
      this.storage
    );

    let emailBody = template.templateContent;
    for (const [key, value] of Object.entries(enrichedVars)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      emailBody = emailBody.replace(regex, String(value));
    }

    await sendEmail(
      emailConfig,
      recipient.email,
      template.subject,
      emailBody
    );

    console.log(`[Scheduler] Email sent to ${recipient.customerName} (${recipient.email})`);
  }

  private async sendScheduledWhatsApp(schedule: any, recipient: any) {
    if (!recipient.phoneNumber) {
      console.log(`[Scheduler] No phone number for ${recipient.customerName}`);
      return;
    }

    const whatsappConfig = await this.storage.getWhatsappConfig(schedule.tenantId);
    if (!whatsappConfig) {
      console.error(`[Scheduler] No WhatsApp config for tenant ${schedule.tenantId}`);
      return;
    }

    let message = schedule.message || "";
    message = message.replace(/\{customerName\}/g, recipient.customerName);
    message = message.replace(/\{amount\}/g, recipient.grandTotal?.toString() || "0");
    message = message.replace(/\{invoiceNumber\}/g, recipient.invoiceNumber || "");

    await sendWhatsAppMessage(
      whatsappConfig,
      recipient.phoneNumber,
      message
    );

    console.log(`[Scheduler] WhatsApp sent to ${recipient.customerName} (${recipient.phoneNumber})`);
  }

  private async makeScheduledCall(schedule: any, recipient: any) {
    if (!recipient.phoneNumber) {
      console.log(`[Scheduler] No phone number for ${recipient.customerName}`);
      return;
    }

    console.log(`[Scheduler] Call scheduling for ${recipient.customerName} - Integration pending`);
  }

  private async updateScheduleRuntime(scheduleId: string) {
    try {
      await db
        .update(communicationSchedules)
        .set({
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(communicationSchedules.id, scheduleId));

      console.log(`[Scheduler] Updated runtime for schedule ${scheduleId}`);
    } catch (error) {
      console.error(`[Scheduler] Error updating schedule runtime:`, error);
    }
  }
}

export function createScheduler(storage: any): CommunicationScheduler {
  return new CommunicationScheduler({ storage });
}
