import { type Customer, type InsertCustomer, type Payment, type InsertPayment, type FollowUp, type InsertFollowUp, type MasterCustomer, type InsertMasterCustomer, type MasterItem, type InsertMasterItem, type Invoice, type InsertInvoice, type Receipt, type InsertReceipt, type Lead, type InsertLead, type LeadFollowUp, type InsertLeadFollowUp, type CompanyProfile, type InsertCompanyProfile, type Quotation, type InsertQuotation, type QuotationItem, type InsertQuotationItem, type QuotationSettings, type InsertQuotationSettings, type ProformaInvoice, type InsertProformaInvoice, type ProformaInvoiceItem, type InsertProformaInvoiceItem, type DebtorsFollowUp, type InsertDebtorsFollowUp, type Role, type InsertRole, type User, type InsertUser, type EmailConfig, type InsertEmailConfig, type EmailTemplate, type InsertEmailTemplate, type WhatsappConfig, type InsertWhatsappConfig, type WhatsappTemplate, type InsertWhatsappTemplate, type RinggConfig, type InsertRinggConfig, type CallScriptMapping, type InsertCallScriptMapping, type CallLog, type InsertCallLog, type CommunicationSchedule, type InsertCommunicationSchedule, customers, payments, followUps, masterCustomers, masterItems, invoices, receipts, leads, leadFollowUps, companyProfile, quotations, quotationItems, quotationSettings, proformaInvoices, proformaInvoiceItems, debtorsFollowUps, roles, users, emailConfigs, emailTemplates, whatsappConfigs, whatsappTemplates, ringgConfigs, callScriptMappings, callLogs, communicationSchedules } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Customer operations
  getCustomers(tenantId: string): Promise<Customer[]>;
  getCustomer(tenantId: string, id: string): Promise<Customer | undefined>;
  createCustomer(tenantId: string, customer: InsertCustomer): Promise<Customer>;
  updateCustomer(tenantId: string, id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(tenantId: string, id: string): Promise<boolean>;
  
  // Payment operations
  getPaymentsByCustomer(tenantId: string, customerId: string): Promise<Payment[]>;
  getPayment(tenantId: string, id: string): Promise<Payment | undefined>;
  createPayment(tenantId: string, payment: InsertPayment): Promise<Payment>;
  updatePayment(tenantId: string, id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(tenantId: string, id: string): Promise<boolean>;
  
  // Follow-up operations
  getFollowUpsByCustomer(tenantId: string, customerId: string): Promise<FollowUp[]>;
  getFollowUp(tenantId: string, id: string): Promise<FollowUp | undefined>;
  createFollowUp(tenantId: string, followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(tenantId: string, id: string, followUp: Partial<InsertFollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(tenantId: string, id: string): Promise<boolean>;
  
  // Bulk operations
  createCustomers(tenantId: string, customers: InsertCustomer[]): Promise<Customer[]>;
  deleteCustomers(tenantId: string, ids: string[]): Promise<number>;
  
  // Master Customer operations
  getMasterCustomers(tenantId: string): Promise<MasterCustomer[]>;
  getMasterCustomer(tenantId: string, id: string): Promise<MasterCustomer | undefined>;
  createMasterCustomer(tenantId: string, customer: InsertMasterCustomer): Promise<MasterCustomer>;
  updateMasterCustomer(tenantId: string, id: string, customer: Partial<InsertMasterCustomer>): Promise<MasterCustomer | undefined>;
  deleteMasterCustomer(tenantId: string, id: string): Promise<boolean>;
  deleteMasterCustomers(tenantId: string, ids: string[]): Promise<number>;
  
  // Master Items operations
  getMasterItems(tenantId: string): Promise<MasterItem[]>;
  getMasterItem(tenantId: string, id: string): Promise<MasterItem | undefined>;
  createMasterItem(tenantId: string, item: InsertMasterItem): Promise<MasterItem>;
  updateMasterItem(tenantId: string, id: string, item: Partial<InsertMasterItem>): Promise<MasterItem | undefined>;
  deleteMasterItem(tenantId: string, id: string): Promise<boolean>;
  deleteMasterItems(tenantId: string, ids: string[]): Promise<number>;
  
  // Invoice operations
  getInvoices(tenantId: string): Promise<Invoice[]>;
  getInvoice(tenantId: string, id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(tenantId: string, invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoicesByCustomerName(tenantId: string, customerName: string): Promise<Invoice[]>;
  createInvoice(tenantId: string, invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(tenantId: string, id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(tenantId: string, id: string): Promise<boolean>;
  deleteInvoices(tenantId: string, ids: string[]): Promise<number>;
  
  // Receipt operations
  getReceipts(tenantId: string): Promise<Receipt[]>;
  getReceipt(tenantId: string, id: string): Promise<Receipt | undefined>;
  getReceiptByVoucherNumber(tenantId: string, voucherType: string, voucherNumber: string): Promise<Receipt | undefined>;
  getReceiptsByCustomerName(tenantId: string, customerName: string): Promise<Receipt[]>;
  createReceipt(tenantId: string, receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(tenantId: string, id: string, receipt: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  deleteReceipt(tenantId: string, id: string): Promise<boolean>;
  deleteReceipts(tenantId: string, ids: string[]): Promise<number>;
  
  // Lead operations
  getLeads(tenantId: string): Promise<Lead[]>;
  getLead(tenantId: string, id: string): Promise<Lead | undefined>;
  createLead(tenantId: string, lead: InsertLead): Promise<Lead>;
  updateLead(tenantId: string, id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(tenantId: string, id: string): Promise<boolean>;
  deleteLeads(tenantId: string, ids: string[]): Promise<number>;
  
  // Lead Follow-up operations
  getLeadFollowUpsByLead(tenantId: string, leadId: string): Promise<LeadFollowUp[]>;
  getLeadFollowUp(tenantId: string, id: string): Promise<LeadFollowUp | undefined>;
  createLeadFollowUp(tenantId: string, followUp: InsertLeadFollowUp): Promise<LeadFollowUp>;
  updateLeadFollowUp(tenantId: string, id: string, followUp: Partial<InsertLeadFollowUp>): Promise<LeadFollowUp | undefined>;
  deleteLeadFollowUp(tenantId: string, id: string): Promise<boolean>;
  
  // Company Profile operations
  getCompanyProfile(tenantId: string): Promise<CompanyProfile | undefined>;
  updateCompanyProfile(tenantId: string, profile: InsertCompanyProfile): Promise<CompanyProfile>;
  
  // Quotation operations
  getQuotations(tenantId: string): Promise<Quotation[]>;
  getQuotation(tenantId: string, id: string): Promise<Quotation | undefined>;
  createQuotation(tenantId: string, quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(tenantId: string, id: string, quotation: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  deleteQuotation(tenantId: string, id: string): Promise<boolean>;
  deleteQuotations(tenantId: string, ids: string[]): Promise<number>;
  getNextQuotationNumber(tenantId: string): Promise<string>;
  
  // Quotation Items operations
  getQuotationItems(tenantId: string, quotationId: string): Promise<QuotationItem[]>;
  createQuotationItem(tenantId: string, item: InsertQuotationItem): Promise<QuotationItem>;
  deleteQuotationItem(tenantId: string, id: string): Promise<boolean>;
  deleteQuotationItems(tenantId: string, quotationId: string): Promise<number>;
  
  // Quotation Settings operations
  getQuotationSettings(tenantId: string): Promise<QuotationSettings | undefined>;
  updateQuotationSettings(tenantId: string, termsAndConditions: string): Promise<QuotationSettings>;
  
  // Proforma Invoice operations
  getProformaInvoices(tenantId: string): Promise<ProformaInvoice[]>;
  getProformaInvoice(tenantId: string, id: string): Promise<ProformaInvoice | undefined>;
  getProformaInvoiceByQuotationId(tenantId: string, quotationId: string): Promise<ProformaInvoice | undefined>;
  createProformaInvoice(tenantId: string, invoice: InsertProformaInvoice): Promise<ProformaInvoice>;
  updateProformaInvoice(tenantId: string, id: string, invoice: Partial<InsertProformaInvoice>): Promise<ProformaInvoice | undefined>;
  deleteProformaInvoice(tenantId: string, id: string): Promise<boolean>;
  deleteProformaInvoices(tenantId: string, ids: string[]): Promise<number>;
  getNextProformaInvoiceNumber(tenantId: string): Promise<string>;
  
  // Proforma Invoice Items operations
  getProformaInvoiceItems(tenantId: string, invoiceId: string): Promise<ProformaInvoiceItem[]>;
  createProformaInvoiceItem(tenantId: string, item: InsertProformaInvoiceItem): Promise<ProformaInvoiceItem>;
  deleteProformaInvoiceItem(tenantId: string, id: string): Promise<boolean>;
  
  // Debtors operations
  getDebtorsList(tenantId: string): Promise<any>;
  getDebtorsFollowUpStats(tenantId: string): Promise<any>;
  
  // Debtors Follow-up operations
  getDebtorsFollowUpsByCustomer(tenantId: string, customerId: string): Promise<any[]>;
  createDebtorsFollowUp(tenantId: string, followUp: any): Promise<any>;
  getDebtorsFollowUpsByCategory(tenantId: string, category: string): Promise<any[]>;
  
  // Credit Management operations
  getCreditManagementData(tenantId: string): Promise<any>;
  
  // Role operations
  getRoles(tenantId: string): Promise<any[]>;
  getRole(tenantId: string, id: string): Promise<any | undefined>;
  createRole(tenantId: string, data: any): Promise<any>;
  updateRole(tenantId: string, id: string, data: any): Promise<any | undefined>;
  deleteRole(tenantId: string, id: string): Promise<boolean>;
  bulkDeleteRoles(tenantId: string, ids: string[]): Promise<number>;
  
  // User operations
  getUsers(tenantId: string): Promise<any[]>;
  getUser(tenantId: string | null, id: string): Promise<any | undefined>;
  getUserByEmail(email: string): Promise<any | undefined>;
  createUser(tenantId: string | null, data: any): Promise<any>;
  updateUser(tenantId: string | null, id: string, data: any): Promise<any | undefined>;
  deleteUser(tenantId: string, id: string): Promise<boolean>;
  bulkDeleteUsers(tenantId: string, ids: string[]): Promise<number>;
  
  // Email Configuration operations
  getEmailConfig(tenantId: string | null): Promise<EmailConfig | undefined>;
  createEmailConfig(tenantId: string | null, config: InsertEmailConfig): Promise<EmailConfig>;
  updateEmailConfig(tenantId: string | null, id: string, config: Partial<InsertEmailConfig>): Promise<EmailConfig | undefined>;
  
  // Email Template operations
  getEmailTemplates(tenantId: string): Promise<EmailTemplate[]>;
  getEmailTemplatesByModule(tenantId: string, module: string): Promise<EmailTemplate[]>;
  getEmailTemplate(tenantId: string, id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(tenantId: string, template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(tenantId: string, id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(tenantId: string, id: string): Promise<boolean>;
  
  // WhatsApp Configuration operations
  getWhatsappConfig(tenantId: string): Promise<WhatsappConfig | undefined>;
  saveWhatsappConfig(tenantId: string, config: InsertWhatsappConfig): Promise<WhatsappConfig>;
  updateWhatsappConfig(tenantId: string, id: string, config: Partial<InsertWhatsappConfig>): Promise<WhatsappConfig | undefined>;
  
  // WhatsApp Template operations
  getWhatsappTemplates(tenantId: string): Promise<WhatsappTemplate[]>;
  getWhatsappTemplatesByModule(tenantId: string, module: string): Promise<WhatsappTemplate[]>;
  getWhatsappTemplate(tenantId: string, id: string): Promise<WhatsappTemplate | undefined>;
  createWhatsappTemplate(tenantId: string, template: InsertWhatsappTemplate): Promise<WhatsappTemplate>;
  updateWhatsappTemplate(tenantId: string, id: string, template: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined>;
  deleteWhatsappTemplate(tenantId: string, id: string): Promise<boolean>;
  
  // Ringg.ai Configuration operations
  getRinggConfig(tenantId: string): Promise<RinggConfig | undefined>;
  createRinggConfig(tenantId: string, config: InsertRinggConfig): Promise<RinggConfig>;
  updateRinggConfig(tenantId: string, id: string, config: Partial<InsertRinggConfig>): Promise<RinggConfig | undefined>;
  deleteRinggConfig(tenantId: string, id: string): Promise<boolean>;
  
  // Call Script Mapping operations
  getCallScriptMappings(tenantId: string): Promise<CallScriptMapping[]>;
  getCallScriptMappingsByModule(tenantId: string, module: string): Promise<CallScriptMapping[]>;
  getCallScriptMapping(tenantId: string, id: string): Promise<CallScriptMapping | undefined>;
  createCallScriptMapping(tenantId: string, mapping: InsertCallScriptMapping): Promise<CallScriptMapping>;
  updateCallScriptMapping(tenantId: string, id: string, mapping: Partial<InsertCallScriptMapping>): Promise<CallScriptMapping | undefined>;
  deleteCallScriptMapping(tenantId: string, id: string): Promise<boolean>;
  
  // Call Log operations
  getCallLogs(tenantId: string): Promise<CallLog[]>;
  getCallLogsByModule(tenantId: string, module: string): Promise<CallLog[]>;
  getCallLogsByCustomer(tenantId: string, customerId: string): Promise<CallLog[]>;
  getCallLog(tenantId: string, id: string): Promise<CallLog | undefined>;
  createCallLog(tenantId: string, log: InsertCallLog): Promise<CallLog>;
  updateCallLog(tenantId: string, id: string, log: Partial<InsertCallLog>): Promise<CallLog | undefined>;
  updateCallLogByRinggId(tenantId: string, ringgCallId: string, log: Partial<InsertCallLog>): Promise<CallLog | undefined>;
  deleteCallLog(tenantId: string, id: string): Promise<boolean>;
  
  // Communication Schedule operations
  getCommunicationSchedules(tenantId: string): Promise<any[]>;
  getCommunicationSchedule(tenantId: string, id: string): Promise<any | undefined>;
  getCommunicationSchedulesByModule(tenantId: string, module: string): Promise<any[]>;
  createCommunicationSchedule(tenantId: string, schedule: any): Promise<any>;
  updateCommunicationSchedule(tenantId: string, id: string, schedule: any): Promise<any | undefined>;
  deleteCommunicationSchedule(tenantId: string, id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getCustomers(tenantId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.tenantId, tenantId));
  }

  async getCustomer(tenantId: string, id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)));
    return customer || undefined;
  }

  async createCustomer(tenantId: string, insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values({ ...insertCustomer, tenantId })
      .returning();
    return customer;
  }

  async updateCustomer(tenantId: string, id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updates)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(tenantId: string, id: string): Promise<boolean> {
    // Payments will be deleted automatically due to cascade delete in schema
    const result = await db
      .delete(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning();
    return result.length > 0;
  }

  async getPaymentsByCustomer(tenantId: string, customerId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.customerId, customerId)));
  }

  async getPayment(tenantId: string, id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(and(eq(payments.tenantId, tenantId), eq(payments.id, id)));
    return payment || undefined;
  }

  async createPayment(tenantId: string, insertPayment: InsertPayment): Promise<Payment> {
    // Create the payment
    const [payment] = await db
      .insert(payments)
      .values({
        ...insertPayment,
        tenantId,
        receiptNumber: insertPayment.receiptNumber || null,
        notes: insertPayment.notes || null,
      })
      .returning();

    // Update customer's amount owed
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, insertPayment.customerId)));

    if (customer) {
      const currentAmount = parseFloat(customer.amountOwed);
      const paymentAmount = parseFloat(insertPayment.amount);
      const newAmount = Math.max(0, currentAmount - paymentAmount);

      await db
        .update(customers)
        .set({ amountOwed: newAmount.toFixed(2) })
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, insertPayment.customerId)));
    }

    return payment;
  }

  async createCustomers(tenantId: string, customersData: InsertCustomer[]): Promise<Customer[]> {
    if (customersData.length === 0) return [];
    
    const result = await db
      .insert(customers)
      .values(customersData.map(c => ({ ...c, tenantId })))
      .returning();
    return result;
  }

  async updatePayment(tenantId: string, id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined> {
    // Get the old payment to calculate amount difference
    const oldPayment = await this.getPayment(tenantId, id);
    if (!oldPayment) return undefined;

    const [updatedPayment] = await db
      .update(payments)
      .set(updates)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.id, id)))
      .returning();

    // If amount changed, update customer's amount owed
    if (updates.amount && oldPayment.amount !== updates.amount) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, updatedPayment.customerId)));

      if (customer) {
        const oldAmount = parseFloat(oldPayment.amount);
        const newAmount = parseFloat(updates.amount);
        const difference = newAmount - oldAmount;
        
        const currentOwed = parseFloat(customer.amountOwed);
        const newOwed = Math.max(0, currentOwed - difference);

        await db
          .update(customers)
          .set({ amountOwed: newOwed.toFixed(2) })
          .where(and(eq(customers.tenantId, tenantId), eq(customers.id, updatedPayment.customerId)));
      }
    }

    return updatedPayment || undefined;
  }

  async deletePayment(tenantId: string, id: string): Promise<boolean> {
    // Get the payment first to restore the amount to customer
    const payment = await this.getPayment(tenantId, id);
    if (!payment) return false;

    // Restore the payment amount back to customer's debt
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, payment.customerId)));

    if (customer) {
      const currentOwed = parseFloat(customer.amountOwed);
      const paymentAmount = parseFloat(payment.amount);
      const newOwed = currentOwed + paymentAmount;

      await db
        .update(customers)
        .set({ amountOwed: newOwed.toFixed(2) })
        .where(and(eq(customers.tenantId, tenantId), eq(customers.id, payment.customerId)));
    }

    // Delete the payment
    const result = await db
      .delete(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.id, id)))
      .returning();

    return result.length > 0;
  }

  async getFollowUpsByCustomer(tenantId: string, customerId: string): Promise<FollowUp[]> {
    return await db
      .select()
      .from(followUps)
      .where(and(eq(followUps.tenantId, tenantId), eq(followUps.customerId, customerId)))
      .orderBy(desc(followUps.followUpDateTime));
  }

  async getFollowUp(tenantId: string, id: string): Promise<FollowUp | undefined> {
    const [followUp] = await db.select().from(followUps).where(and(eq(followUps.tenantId, tenantId), eq(followUps.id, id)));
    return followUp || undefined;
  }

  async createFollowUp(tenantId: string, insertFollowUp: InsertFollowUp): Promise<FollowUp> {
    const [followUp] = await db
      .insert(followUps)
      .values({
        ...insertFollowUp,
        tenantId,
        followUpDateTime: new Date(insertFollowUp.followUpDateTime),
      })
      .returning();
    return followUp;
  }

  async updateFollowUp(tenantId: string, id: string, updates: Partial<InsertFollowUp>): Promise<FollowUp | undefined> {
    const updateData: any = { ...updates };
    if (updateData.followUpDateTime) {
      updateData.followUpDateTime = new Date(updateData.followUpDateTime);
    }
    
    const [followUp] = await db
      .update(followUps)
      .set(updateData)
      .where(and(eq(followUps.tenantId, tenantId), eq(followUps.id, id)))
      .returning();
    return followUp || undefined;
  }

  async deleteFollowUp(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(followUps)
      .where(and(eq(followUps.tenantId, tenantId), eq(followUps.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteCustomers(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteCustomer(tenantId, id);
      if (deleted) count++;
    }
    return count;
  }

  async getMasterCustomers(tenantId: string): Promise<MasterCustomer[]> {
    return await db.select().from(masterCustomers).where(eq(masterCustomers.tenantId, tenantId));
  }

  async getMasterCustomer(tenantId: string, id: string): Promise<MasterCustomer | undefined> {
    const [customer] = await db.select().from(masterCustomers).where(and(eq(masterCustomers.tenantId, tenantId), eq(masterCustomers.id, id)));
    return customer || undefined;
  }

  async createMasterCustomer(tenantId: string, insertCustomer: InsertMasterCustomer): Promise<MasterCustomer> {
    const [customer] = await db
      .insert(masterCustomers)
      .values({ ...insertCustomer, tenantId })
      .returning();
    return customer;
  }

  async updateMasterCustomer(tenantId: string, id: string, updates: Partial<InsertMasterCustomer>): Promise<MasterCustomer | undefined> {
    const [customer] = await db
      .update(masterCustomers)
      .set(updates)
      .where(and(eq(masterCustomers.tenantId, tenantId), eq(masterCustomers.id, id)))
      .returning();
    return customer || undefined;
  }

  async deleteMasterCustomer(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(masterCustomers)
      .where(and(eq(masterCustomers.tenantId, tenantId), eq(masterCustomers.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteMasterCustomers(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteMasterCustomer(tenantId, id);
      if (deleted) count++;
    }
    return count;
  }

  async getMasterItems(tenantId: string): Promise<MasterItem[]> {
    return await db.select().from(masterItems).where(eq(masterItems.tenantId, tenantId));
  }

  async getMasterItem(tenantId: string, id: string): Promise<MasterItem | undefined> {
    const [item] = await db.select().from(masterItems).where(and(eq(masterItems.tenantId, tenantId), eq(masterItems.id, id)));
    return item || undefined;
  }

  async createMasterItem(tenantId: string, insertItem: InsertMasterItem): Promise<MasterItem> {
    const [item] = await db
      .insert(masterItems)
      .values({ ...insertItem, tenantId })
      .returning();
    return item;
  }

  async updateMasterItem(tenantId: string, id: string, updates: Partial<InsertMasterItem>): Promise<MasterItem | undefined> {
    const [item] = await db
      .update(masterItems)
      .set(updates)
      .where(and(eq(masterItems.tenantId, tenantId), eq(masterItems.id, id)))
      .returning();
    return item || undefined;
  }

  async deleteMasterItem(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(masterItems)
      .where(and(eq(masterItems.tenantId, tenantId), eq(masterItems.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteMasterItems(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteMasterItem(tenantId, id);
      if (deleted) count++;
    }
    return count;
  }

  async getInvoices(tenantId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(tenantId: string, id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)));
    return invoice || undefined;
  }

  async getInvoiceByNumber(tenantId: string, invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.invoiceNumber, invoiceNumber)));
    return invoice || undefined;
  }

  async getInvoicesByCustomerName(tenantId: string, customerName: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.customerName, customerName)))
      .orderBy(invoices.invoiceDate);
  }

  async createInvoice(tenantId: string, insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        tenantId,
        invoiceDate: new Date(insertInvoice.invoiceDate),
      })
      .returning();
    return invoice;
  }

  async updateInvoice(tenantId: string, id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const updateData: any = { ...updates };
    if (updates.invoiceDate) {
      updateData.invoiceDate = new Date(updates.invoiceDate);
    }
    
    const [invoice] = await db
      .update(invoices)
      .set(updateData)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteInvoices(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteInvoice(tenantId, id);
      if (deleted) count++;
    }
    return count;
  }

  async getReceipts(tenantId: string): Promise<Receipt[]> {
    return await db.select().from(receipts).where(eq(receipts.tenantId, tenantId)).orderBy(desc(receipts.createdAt));
  }

  async getReceipt(tenantId: string, id: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(and(eq(receipts.tenantId, tenantId), eq(receipts.id, id)));
    return receipt || undefined;
  }

  async getReceiptByVoucherNumber(tenantId: string, voucherType: string, voucherNumber: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(
      and(eq(receipts.tenantId, tenantId), eq(receipts.voucherType, voucherType), eq(receipts.voucherNumber, voucherNumber))
    );
    return receipt || undefined;
  }

  async getReceiptsByCustomerName(tenantId: string, customerName: string): Promise<Receipt[]> {
    return await db.select().from(receipts)
      .where(and(eq(receipts.tenantId, tenantId), eq(receipts.customerName, customerName)))
      .orderBy(receipts.date);
  }

  async createReceipt(tenantId: string, insertReceipt: InsertReceipt): Promise<Receipt> {
    const [receipt] = await db
      .insert(receipts)
      .values({
        ...insertReceipt,
        tenantId,
        date: new Date(insertReceipt.date),
      })
      .returning();
    return receipt;
  }

  async updateReceipt(tenantId: string, id: string, updates: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const updateData: any = { ...updates };
    if (updates.date) {
      updateData.date = new Date(updates.date);
    }
    
    const [receipt] = await db
      .update(receipts)
      .set(updateData)
      .where(and(eq(receipts.tenantId, tenantId), eq(receipts.id, id)))
      .returning();
    return receipt || undefined;
  }

  async deleteReceipt(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(receipts)
      .where(and(eq(receipts.tenantId, tenantId), eq(receipts.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteReceipts(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteReceipt(tenantId, id);
      if (deleted) count++;
    }
    return count;
  }

  async getLeads(tenantId: string): Promise<Lead[]> {
    const allLeads = await db.select().from(leads).where(eq(leads.tenantId, tenantId)).orderBy(desc(leads.createdAt));
    
    // Fetch latest follow-up for each lead
    const leadsWithFollowUps = await Promise.all(
      allLeads.map(async (lead) => {
        const followUps = await db
          .select()
          .from(leadFollowUps)
          .where(and(eq(leadFollowUps.tenantId, tenantId), eq(leadFollowUps.leadId, lead.id)))
          .orderBy(desc(leadFollowUps.followUpDateTime))
          .limit(1);
        
        const latestFollowUp = followUps[0];
        return {
          ...lead,
          lastFollowUpType: latestFollowUp?.type || null,
          lastFollowUpRemarks: latestFollowUp?.remarks || null,
        };
      })
    );
    
    return leadsWithFollowUps;
  }

  async getLead(tenantId: string, id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)));
    return lead || undefined;
  }

  async createLead(tenantId: string, insertLead: InsertLead): Promise<Lead> {
    const dataToInsert: any = { ...insertLead, tenantId };
    if (insertLead.dateCreated) {
      dataToInsert.dateCreated = new Date(insertLead.dateCreated);
    }
    if (insertLead.lastFollowUp) {
      dataToInsert.lastFollowUp = new Date(insertLead.lastFollowUp);
    }
    if (insertLead.nextFollowUp) {
      dataToInsert.nextFollowUp = new Date(insertLead.nextFollowUp);
    }
    
    const [lead] = await db
      .insert(leads)
      .values(dataToInsert)
      .returning();
    return lead;
  }

  async updateLead(tenantId: string, id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const updateData: any = { ...updates };
    if (updates.dateCreated) {
      updateData.dateCreated = new Date(updates.dateCreated);
    }
    if (updates.lastFollowUp) {
      updateData.lastFollowUp = new Date(updates.lastFollowUp);
    }
    if (updates.nextFollowUp) {
      updateData.nextFollowUp = new Date(updates.nextFollowUp);
    }
    
    const [lead] = await db
      .update(leads)
      .set(updateData)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)))
      .returning();
    return lead || undefined;
  }

  async deleteLead(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteLeads(tenantId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteLead(tenantId, id);
      if (deleted) count++;
    }
    return count;
  }

  async getLeadFollowUpsByLead(tenantId: string, leadId: string): Promise<LeadFollowUp[]> {
    return await db
      .select()
      .from(leadFollowUps)
      .where(and(eq(leadFollowUps.tenantId, tenantId), eq(leadFollowUps.leadId, leadId)))
      .orderBy(desc(leadFollowUps.followUpDateTime));
  }

  async getLeadFollowUp(tenantId: string, id: string): Promise<LeadFollowUp | undefined> {
    const [followUp] = await db.select().from(leadFollowUps).where(and(eq(leadFollowUps.tenantId, tenantId), eq(leadFollowUps.id, id)));
    return followUp || undefined;
  }

  async createLeadFollowUp(tenantId: string, insertFollowUp: InsertLeadFollowUp): Promise<LeadFollowUp> {
    const [followUp] = await db
      .insert(leadFollowUps)
      .values({
        ...insertFollowUp,
        tenantId,
        followUpDateTime: new Date(insertFollowUp.followUpDateTime)
      })
      .returning();
    
    await db
      .update(leads)
      .set({ 
        nextFollowUp: new Date(insertFollowUp.followUpDateTime),
        lastFollowUp: new Date()
      })
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, insertFollowUp.leadId)));
    
    return followUp;
  }

  async updateLeadFollowUp(tenantId: string, id: string, updates: Partial<InsertLeadFollowUp>): Promise<LeadFollowUp | undefined> {
    const updateData: any = { ...updates };
    if (updates.followUpDateTime) {
      updateData.followUpDateTime = new Date(updates.followUpDateTime);
    }
    const [followUp] = await db
      .update(leadFollowUps)
      .set(updateData)
      .where(and(eq(leadFollowUps.tenantId, tenantId), eq(leadFollowUps.id, id)))
      .returning();
    return followUp || undefined;
  }

  async deleteLeadFollowUp(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(leadFollowUps)
      .where(and(eq(leadFollowUps.tenantId, tenantId), eq(leadFollowUps.id, id)))
      .returning();
    return result.length > 0;
  }

  async getCompanyProfile(tenantId: string): Promise<CompanyProfile | undefined> {
    const [profile] = await db.select().from(companyProfile).where(eq(companyProfile.tenantId, tenantId)).limit(1);
    return profile || undefined;
  }

  async updateCompanyProfile(tenantId: string, insertProfile: InsertCompanyProfile): Promise<CompanyProfile> {
    const existing = await this.getCompanyProfile(tenantId);
    
    if (existing) {
      const [updated] = await db
        .update(companyProfile)
        .set({ ...insertProfile, updatedAt: new Date() })
        .where(and(eq(companyProfile.tenantId, tenantId), eq(companyProfile.id, existing.id)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(companyProfile)
        .values({ ...insertProfile, tenantId })
        .returning();
      return created;
    }
  }

  async getQuotations(tenantId: string): Promise<Quotation[]> {
    return await db.select().from(quotations).where(eq(quotations.tenantId, tenantId)).orderBy(desc(quotations.createdAt));
  }

  async getQuotation(tenantId: string, id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(and(eq(quotations.tenantId, tenantId), eq(quotations.id, id)));
    return quotation || undefined;
  }

  async createQuotation(tenantId: string, insertQuotation: InsertQuotation): Promise<Quotation> {
    const quotationData: any = { ...insertQuotation, tenantId };
    if (insertQuotation.quotationDate) {
      quotationData.quotationDate = new Date(insertQuotation.quotationDate);
    }
    if (insertQuotation.validUntil) {
      quotationData.validUntil = new Date(insertQuotation.validUntil);
    }
    const [quotation] = await db
      .insert(quotations)
      .values(quotationData)
      .returning();
    return quotation;
  }

  async updateQuotation(tenantId: string, id: string, updates: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const updateData: any = { ...updates };
    if (updates.quotationDate) {
      updateData.quotationDate = new Date(updates.quotationDate);
    }
    if (updates.validUntil) {
      updateData.validUntil = new Date(updates.validUntil);
    }
    const [quotation] = await db
      .update(quotations)
      .set(updateData)
      .where(and(eq(quotations.tenantId, tenantId), eq(quotations.id, id)))
      .returning();
    return quotation || undefined;
  }

  async deleteQuotation(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(quotations)
      .where(and(eq(quotations.tenantId, tenantId), eq(quotations.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteQuotations(tenantId: string, ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => 
      db.delete(quotations).where(and(eq(quotations.tenantId, tenantId), eq(quotations.id, id)))
    );
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  async getNextQuotationNumber(tenantId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const allQuotations = await db.select().from(quotations).where(eq(quotations.tenantId, tenantId));
    const thisYearQuotations = allQuotations.filter(q => 
      q.quotationNumber.startsWith(`QT-${currentYear}-`)
    );
    const nextNumber = thisYearQuotations.length + 1;
    return `QT-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  async getQuotationItems(tenantId: string, quotationId: string): Promise<QuotationItem[]> {
    return await db
      .select()
      .from(quotationItems)
      .where(and(eq(quotationItems.tenantId, tenantId), eq(quotationItems.quotationId, quotationId)))
      .orderBy(quotationItems.displayOrder);
  }

  async createQuotationItem(tenantId: string, insertItem: InsertQuotationItem): Promise<QuotationItem> {
    const [item] = await db
      .insert(quotationItems)
      .values({ ...(insertItem as any), tenantId })
      .returning();
    return item;
  }

  async deleteQuotationItem(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(quotationItems)
      .where(and(eq(quotationItems.tenantId, tenantId), eq(quotationItems.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteQuotationItems(tenantId: string, quotationId: string): Promise<number> {
    const result = await db
      .delete(quotationItems)
      .where(and(eq(quotationItems.tenantId, tenantId), eq(quotationItems.quotationId, quotationId)))
      .returning();
    return result.length;
  }

  async getQuotationSettings(tenantId: string): Promise<QuotationSettings | undefined> {
    const [settings] = await db.select().from(quotationSettings).where(eq(quotationSettings.tenantId, tenantId)).limit(1);
    return settings || undefined;
  }

  async updateQuotationSettings(tenantId: string, termsAndConditions: string): Promise<QuotationSettings> {
    const existing = await this.getQuotationSettings(tenantId);
    
    if (existing) {
      const [updated] = await db
        .update(quotationSettings)
        .set({ termsAndConditions, updatedAt: new Date() })
        .where(and(eq(quotationSettings.tenantId, tenantId), eq(quotationSettings.id, existing.id)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(quotationSettings)
        .values({ termsAndConditions, tenantId })
        .returning();
      return created;
    }
  }

  async getProformaInvoices(tenantId: string): Promise<ProformaInvoice[]> {
    return await db.select().from(proformaInvoices).where(eq(proformaInvoices.tenantId, tenantId)).orderBy(desc(proformaInvoices.createdAt));
  }

  async getProformaInvoice(tenantId: string, id: string): Promise<ProformaInvoice | undefined> {
    const [invoice] = await db.select().from(proformaInvoices).where(and(eq(proformaInvoices.tenantId, tenantId), eq(proformaInvoices.id, id)));
    return invoice || undefined;
  }

  async getProformaInvoiceByQuotationId(tenantId: string, quotationId: string): Promise<ProformaInvoice | undefined> {
    const [invoice] = await db.select().from(proformaInvoices).where(and(eq(proformaInvoices.tenantId, tenantId), eq(proformaInvoices.quotationId, quotationId)));
    return invoice || undefined;
  }

  async createProformaInvoice(tenantId: string, insertInvoice: InsertProformaInvoice): Promise<ProformaInvoice> {
    const invoiceData: any = { ...insertInvoice, tenantId };
    if (insertInvoice.invoiceDate) {
      invoiceData.invoiceDate = new Date(insertInvoice.invoiceDate);
    }
    if (insertInvoice.dueDate) {
      invoiceData.dueDate = new Date(insertInvoice.dueDate);
    }
    const [invoice] = await db
      .insert(proformaInvoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updateProformaInvoice(tenantId: string, id: string, updates: Partial<InsertProformaInvoice>): Promise<ProformaInvoice | undefined> {
    const updateData: any = { ...updates };
    if (updates.invoiceDate) {
      updateData.invoiceDate = new Date(updates.invoiceDate);
    }
    if (updates.dueDate) {
      updateData.dueDate = new Date(updates.dueDate);
    }
    const [invoice] = await db
      .update(proformaInvoices)
      .set(updateData)
      .where(and(eq(proformaInvoices.tenantId, tenantId), eq(proformaInvoices.id, id)))
      .returning();
    return invoice || undefined;
  }

  async deleteProformaInvoice(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(proformaInvoices)
      .where(and(eq(proformaInvoices.tenantId, tenantId), eq(proformaInvoices.id, id)))
      .returning();
    return result.length > 0;
  }

  async deleteProformaInvoices(tenantId: string, ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => 
      db.delete(proformaInvoices).where(and(eq(proformaInvoices.tenantId, tenantId), eq(proformaInvoices.id, id)))
    );
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  async getNextProformaInvoiceNumber(tenantId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const allInvoices = await db.select().from(proformaInvoices).where(eq(proformaInvoices.tenantId, tenantId));
    const thisYearInvoices = allInvoices.filter(inv => 
      inv.invoiceNumber.startsWith(`PI-${currentYear}-`)
    );
    const nextNumber = thisYearInvoices.length + 1;
    return `PI-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  async getProformaInvoiceItems(tenantId: string, invoiceId: string): Promise<ProformaInvoiceItem[]> {
    return await db
      .select()
      .from(proformaInvoiceItems)
      .where(and(eq(proformaInvoiceItems.tenantId, tenantId), eq(proformaInvoiceItems.invoiceId, invoiceId)))
      .orderBy(proformaInvoiceItems.displayOrder);
  }

  async createProformaInvoiceItem(tenantId: string, insertItem: InsertProformaInvoiceItem): Promise<ProformaInvoiceItem> {
    const [item] = await db
      .insert(proformaInvoiceItems)
      .values({ ...(insertItem as any), tenantId })
      .returning();
    return item;
  }

  async deleteProformaInvoiceItem(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(proformaInvoiceItems)
      .where(and(eq(proformaInvoiceItems.tenantId, tenantId), eq(proformaInvoiceItems.id, id)))
      .returning();
    return result.length > 0;
  }

  async getDebtorsList(tenantId: string): Promise<any> {
    const customers = await db.select().from(masterCustomers).where(eq(masterCustomers.tenantId, tenantId));
    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    const allReceipts = await db.select().from(receipts).where(eq(receipts.tenantId, tenantId));
    const allFollowUps = await db.select().from(debtorsFollowUps).where(eq(debtorsFollowUps.tenantId, tenantId));

    const debtorsByCategory = {
      Alpha: { count: 0, totalBalance: 0, debtors: [] as any[] },
      Beta: { count: 0, totalBalance: 0, debtors: [] as any[] },
      Gamma: { count: 0, totalBalance: 0, debtors: [] as any[] },
      Delta: { count: 0, totalBalance: 0, debtors: [] as any[] },
    };

    const allDebtors: any[] = [];

    for (const customer of customers) {
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);

      const openingBalance = customer.openingBalance ? parseFloat(customer.openingBalance.toString()) : 0;
      const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
      const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
      const balance = openingBalance + totalInvoices - totalReceipts;

      if (balance > 0) {
        const lastInvoice = customerInvoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())[0];
        const lastReceipt = customerReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const customerFollowUps = allFollowUps.filter(f => f.customerId === customer.id);
        
        const completedFollowUps = customerFollowUps
          .filter(f => f.status === "Completed")
          .sort((a, b) => new Date(b.followUpDateTime).getTime() - new Date(a.followUpDateTime).getTime());
        const lastFollowUp = completedFollowUps.length > 0 ? completedFollowUps[0].followUpDateTime : null;

        const pendingFollowUps = customerFollowUps
          .filter(f => f.status === "Pending")
          .sort((a, b) => new Date(a.followUpDateTime).getTime() - new Date(b.followUpDateTime).getTime());
        const nextFollowUp = pendingFollowUps.length > 0 ? pendingFollowUps[0].followUpDateTime : null;

        const debtor = {
          customerId: customer.id,
          name: customer.clientName,
          category: customer.category,
          salesPerson: customer.salesPerson,
          mobile: customer.primaryMobile,
          email: customer.primaryEmail,
          totalInvoices,
          totalReceipts,
          balance,
          invoiceCount: customerInvoices.length,
          receiptCount: customerReceipts.length,
          lastInvoiceDate: lastInvoice?.invoiceDate || null,
          lastPaymentDate: lastReceipt?.date || null,
          lastFollowUp,
          nextFollowUp,
        };

        allDebtors.push(debtor);

        if (customer.category in debtorsByCategory) {
          const categoryKey = customer.category as keyof typeof debtorsByCategory;
          debtorsByCategory[categoryKey].count++;
          debtorsByCategory[categoryKey].totalBalance += balance;
          debtorsByCategory[categoryKey].debtors.push(debtor);
        }
      }
    }

    return {
      categoryWise: debtorsByCategory,
      allDebtors,
    };
  }

  async getDebtorsFollowUpStats(tenantId: string): Promise<any> {
    const allFollowUps = await db
      .select()
      .from(debtorsFollowUps)
      .where(and(eq(debtorsFollowUps.tenantId, tenantId), eq(debtorsFollowUps.status, "Pending")));
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get only debtors (customers with outstanding balance)
    const customers = await db.select().from(masterCustomers).where(eq(masterCustomers.tenantId, tenantId));
    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    const allReceipts = await db.select().from(receipts).where(eq(receipts.tenantId, tenantId));
    
    const debtorIds = new Set<string>();
    for (const customer of customers) {
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
      const openingBalance = customer.openingBalance ? parseFloat(customer.openingBalance.toString()) : 0;
      const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
      const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
      const balance = openingBalance + totalInvoices - totalReceipts;
      
      if (balance > 0) {
        debtorIds.add(customer.id);
      }
    }

    const customersWithFollowUps = new Set(allFollowUps.map(f => f.customerId));
    const noFollowUp = Array.from(debtorIds).filter(id => !customersWithFollowUps.has(id)).length;

    let overdue = 0;
    let dueToday = 0;
    let dueTomorrow = 0;
    let dueThisWeek = 0;
    let dueThisMonth = 0;

    for (const followUp of allFollowUps) {
      const followUpDate = new Date(followUp.followUpDateTime);
      const followUpDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
      
      if (followUpDay < today) {
        overdue++;
      } else if (followUpDay.getTime() === today.getTime()) {
        dueToday++;
      } else if (followUpDay.getTime() === tomorrow.getTime()) {
        dueTomorrow++;
      } else if (followUpDay > today && followUpDay <= endOfWeek) {
        dueThisWeek++;
      } else if (followUpDay > endOfWeek && followUpDay <= endOfMonth) {
        dueThisMonth++;
      }
    }

    return {
      overdue,
      dueToday,
      dueTomorrow,
      dueThisWeek,
      dueThisMonth,
      noFollowUp,
    };
  }

  async getDebtorsFollowUpsByCustomer(tenantId: string, customerId: string): Promise<DebtorsFollowUp[]> {
    return await db
      .select()
      .from(debtorsFollowUps)
      .where(and(eq(debtorsFollowUps.tenantId, tenantId), eq(debtorsFollowUps.customerId, customerId)))
      .orderBy(desc(debtorsFollowUps.followUpDateTime));
  }

  async createDebtorsFollowUp(tenantId: string, insertFollowUp: InsertDebtorsFollowUp): Promise<DebtorsFollowUp> {
    const followUpData: any = { ...insertFollowUp, tenantId };
    if (insertFollowUp.followUpDateTime) {
      followUpData.followUpDateTime = new Date(insertFollowUp.followUpDateTime);
    }
    if (insertFollowUp.nextFollowUpDate) {
      followUpData.nextFollowUpDate = new Date(insertFollowUp.nextFollowUpDate);
    }
    const [followUp] = await db
      .insert(debtorsFollowUps)
      .values(followUpData)
      .returning();
    return followUp;
  }

  async getDebtorsFollowUpsByCategory(tenantId: string, category: string): Promise<any[]> {
    const customers = await db.select().from(masterCustomers).where(and(eq(masterCustomers.tenantId, tenantId), eq(masterCustomers.category, category)));
    const customerIds = customers.map(c => c.id);

    const allFollowUps = await db
      .select()
      .from(debtorsFollowUps)
      .orderBy(desc(debtorsFollowUps.followUpDateTime));

    return allFollowUps.filter(f => customerIds.includes(f.customerId));
  }

  async getCreditManagementData(tenantId: string): Promise<any> {
    const customers = await db.select().from(masterCustomers).where(eq(masterCustomers.tenantId, tenantId));
    const allInvoices = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    const allReceipts = await db.select().from(receipts).where(eq(receipts.tenantId, tenantId));

    const creditData: any[] = [];

    for (const customer of customers) {
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);

      const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
      const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
      const utilizedLimit = totalInvoices - totalReceipts;

      const creditLimit = parseFloat(customer.creditLimit || "0");
      const availableLimit = creditLimit - utilizedLimit;
      const utilizationPercentage = creditLimit > 0 ? (utilizedLimit / creditLimit) * 100 : 0;

      creditData.push({
        customerId: customer.id,
        customerName: customer.clientName,
        category: customer.category,
        creditLimit,
        utilizedLimit,
        availableLimit,
        utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      });
    }

    return creditData;
  }

  async getRoles(tenantId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.tenantId, tenantId)).orderBy(desc(roles.createdAt));
  }

  async getRole(tenantId: string, id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.id, id)));
    return role || undefined;
  }

  async createRole(tenantId: string, insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values({ ...(insertRole as any), tenantId }).returning();
    return role;
  }

  async updateRole(tenantId: string, id: string, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const [role] = await db.update(roles).set(updates as any).where(and(eq(roles.tenantId, tenantId), eq(roles.id, id))).returning();
    return role || undefined;
  }

  async deleteRole(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.id, id))).returning();
    return result.length > 0;
  }

  async bulkDeleteRoles(tenantId: string, ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => db.delete(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.id, id))));
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  async getUsers(tenantId: string): Promise<User[]> {
    const allUsers = await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(desc(users.createdAt));
    const allRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
    
    return allUsers.map(user => {
      const role = allRoles.find(r => r.id === user.roleId);
      return {
        ...user,
        roleName: role?.name || null,
      };
    });
  }

  async getUser(tenantId: string | null, id: string): Promise<User | undefined> {
    const conditions = tenantId 
      ? and(eq(users.tenantId, tenantId), eq(users.id, id))
      : eq(users.id, id);
    const [user] = await db.select().from(users).where(conditions);
    if (!user) return undefined;
    
    const [role] = user.roleId && tenantId ? await db.select().from(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.id, user.roleId))) : user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
    return {
      ...user,
      roleName: role?.name || null,
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    
    const [role] = user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
    return {
      ...user,
      roleName: role?.name || null,
    };
  }

  async createUser(tenantId: string | null, insertUser: InsertUser): Promise<User> {
    const userData = tenantId ? { ...insertUser, tenantId } : { ...insertUser };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const [user] = await db.insert(users).values(userData as any).returning();
    const [role] = user.roleId && tenantId ? await db.select().from(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.id, user.roleId))) : user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
    return {
      ...user,
      roleName: role?.name || null,
    };
  }

  async updateUser(tenantId: string | null, id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const userData = { ...updates };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const conditions = tenantId 
      ? and(eq(users.tenantId, tenantId), eq(users.id, id))
      : eq(users.id, id);
    const [user] = await db.update(users).set(userData as any).where(conditions).returning();
    if (!user) return undefined;
    
    const [role] = user.roleId && tenantId ? await db.select().from(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.id, user.roleId))) : user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
    return {
      ...user,
      roleName: role?.name || null,
    };
  }

  async deleteUser(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(users).where(and(eq(users.tenantId, tenantId), eq(users.id, id))).returning();
    return result.length > 0;
  }

  async bulkDeleteUsers(tenantId: string, ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => db.delete(users).where(and(eq(users.tenantId, tenantId), eq(users.id, id))));
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  // Email Configuration operations
  async getEmailConfig(tenantId: string | null): Promise<EmailConfig | undefined> {
    const conditions = tenantId ? eq(emailConfigs.tenantId, tenantId) : isNull(emailConfigs.tenantId);
    const [config] = await db.select().from(emailConfigs).where(conditions).limit(1);
    return config;
  }

  async createEmailConfig(tenantId: string | null, config: InsertEmailConfig): Promise<EmailConfig> {
    const configData = tenantId ? { ...config, tenantId } : { ...config };
    const [newConfig] = await db.insert(emailConfigs).values(configData).returning();
    return newConfig;
  }

  async updateEmailConfig(tenantId: string | null, id: string, config: Partial<InsertEmailConfig>): Promise<EmailConfig | undefined> {
    const conditions = tenantId 
      ? and(eq(emailConfigs.tenantId, tenantId), eq(emailConfigs.id, id))
      : eq(emailConfigs.id, id);
    const [updated] = await db.update(emailConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(conditions)
      .returning();
    return updated;
  }

  // Email Template operations
  async getEmailTemplates(tenantId: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).where(eq(emailTemplates.tenantId, tenantId)).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplatesByModule(tenantId: string, module: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates)
      .where(and(eq(emailTemplates.tenantId, tenantId), eq(emailTemplates.module, module)))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(tenantId: string, id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(and(eq(emailTemplates.tenantId, tenantId), eq(emailTemplates.id, id)));
    return template;
  }

  async createEmailTemplate(tenantId: string, template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values({ ...template, tenantId }).returning();
    return newTemplate;
  }

  async updateEmailTemplate(tenantId: string, id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(emailTemplates.tenantId, tenantId), eq(emailTemplates.id, id)))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(and(eq(emailTemplates.tenantId, tenantId), eq(emailTemplates.id, id))).returning();
    return result.length > 0;
  }

  // WhatsApp Configuration operations
  async getWhatsappConfig(tenantId: string): Promise<WhatsappConfig | undefined> {
    const [config] = await db.select().from(whatsappConfigs).where(eq(whatsappConfigs.tenantId, tenantId)).limit(1);
    return config;
  }

  async saveWhatsappConfig(tenantId: string, config: InsertWhatsappConfig): Promise<WhatsappConfig> {
    const existing = await this.getWhatsappConfig(tenantId);
    
    if (existing) {
      const [updated] = await db.update(whatsappConfigs)
        .set({ ...config, updatedAt: new Date() })
        .where(and(eq(whatsappConfigs.tenantId, tenantId), eq(whatsappConfigs.id, existing.id)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(whatsappConfigs)
        .values({ ...config, tenantId })
        .returning();
      return created;
    }
  }

  async updateWhatsappConfig(tenantId: string, id: string, config: Partial<InsertWhatsappConfig>): Promise<WhatsappConfig | undefined> {
    const [updated] = await db.update(whatsappConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(and(eq(whatsappConfigs.tenantId, tenantId), eq(whatsappConfigs.id, id)))
      .returning();
    return updated;
  }

  // WhatsApp Template operations
  async getWhatsappTemplates(tenantId: string): Promise<WhatsappTemplate[]> {
    return await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.tenantId, tenantId)).orderBy(desc(whatsappTemplates.createdAt));
  }

  async getWhatsappTemplatesByModule(tenantId: string, module: string): Promise<WhatsappTemplate[]> {
    return await db.select().from(whatsappTemplates)
      .where(and(eq(whatsappTemplates.tenantId, tenantId), eq(whatsappTemplates.module, module)))
      .orderBy(desc(whatsappTemplates.createdAt));
  }

  async getWhatsappTemplate(tenantId: string, id: string): Promise<WhatsappTemplate | undefined> {
    const [template] = await db.select().from(whatsappTemplates).where(and(eq(whatsappTemplates.tenantId, tenantId), eq(whatsappTemplates.id, id)));
    return template;
  }

  async createWhatsappTemplate(tenantId: string, template: InsertWhatsappTemplate): Promise<WhatsappTemplate> {
    const [created] = await db.insert(whatsappTemplates)
      .values({ ...template, tenantId })
      .returning();
    return created;
  }

  async updateWhatsappTemplate(tenantId: string, id: string, template: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined> {
    const [updated] = await db.update(whatsappTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(whatsappTemplates.tenantId, tenantId), eq(whatsappTemplates.id, id)))
      .returning();
    return updated;
  }

  async deleteWhatsappTemplate(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(whatsappTemplates).where(and(eq(whatsappTemplates.tenantId, tenantId), eq(whatsappTemplates.id, id))).returning();
    return result.length > 0;
  }

  // Ringg.ai Configuration operations
  async getRinggConfig(tenantId: string): Promise<RinggConfig | undefined> {
    const [config] = await db.select().from(ringgConfigs).where(eq(ringgConfigs.tenantId, tenantId)).limit(1);
    return config;
  }

  async createRinggConfig(tenantId: string, config: InsertRinggConfig): Promise<RinggConfig> {
    const [newConfig] = await db.insert(ringgConfigs).values({ ...config, tenantId }).returning();
    return newConfig;
  }

  async updateRinggConfig(tenantId: string, id: string, config: Partial<InsertRinggConfig>): Promise<RinggConfig | undefined> {
    const [updated] = await db
      .update(ringgConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(and(eq(ringgConfigs.tenantId, tenantId), eq(ringgConfigs.id, id)))
      .returning();
    return updated;
  }

  async deleteRinggConfig(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(ringgConfigs).where(and(eq(ringgConfigs.tenantId, tenantId), eq(ringgConfigs.id, id))).returning();
    return result.length > 0;
  }

  // Call Script Mappings operations
  async getCallScriptMappings(tenantId: string): Promise<CallScriptMapping[]> {
    return await db.select().from(callScriptMappings).where(eq(callScriptMappings.tenantId, tenantId)).orderBy(callScriptMappings.module);
  }

  async getCallScriptMappingsByModule(tenantId: string, module: string): Promise<CallScriptMapping[]> {
    return await db.select().from(callScriptMappings).where(and(eq(callScriptMappings.tenantId, tenantId), eq(callScriptMappings.module, module)));
  }

  async getCallScriptMapping(tenantId: string, id: string): Promise<CallScriptMapping | undefined> {
    const [mapping] = await db.select().from(callScriptMappings).where(and(eq(callScriptMappings.tenantId, tenantId), eq(callScriptMappings.id, id)));
    return mapping;
  }

  async createCallScriptMapping(tenantId: string, mapping: InsertCallScriptMapping): Promise<CallScriptMapping> {
    const [newMapping] = await db.insert(callScriptMappings).values({ ...mapping, tenantId }).returning();
    return newMapping;
  }

  async updateCallScriptMapping(tenantId: string, id: string, mapping: Partial<InsertCallScriptMapping>): Promise<CallScriptMapping | undefined> {
    const [updated] = await db
      .update(callScriptMappings)
      .set({ ...mapping, updatedAt: new Date() })
      .where(and(eq(callScriptMappings.tenantId, tenantId), eq(callScriptMappings.id, id)))
      .returning();
    return updated;
  }

  async deleteCallScriptMapping(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(callScriptMappings).where(and(eq(callScriptMappings.tenantId, tenantId), eq(callScriptMappings.id, id))).returning();
    return result.length > 0;
  }

  // Call Logs operations
  async getCallLogs(tenantId: string): Promise<CallLog[]> {
    return await db.select().from(callLogs).where(eq(callLogs.tenantId, tenantId)).orderBy(callLogs.createdAt);
  }

  async getCallLogsByModule(tenantId: string, module: string): Promise<CallLog[]> {
    return await db.select().from(callLogs).where(and(eq(callLogs.tenantId, tenantId), eq(callLogs.module, module))).orderBy(callLogs.createdAt);
  }

  async getCallLogsByCustomer(tenantId: string, customerId: string): Promise<CallLog[]> {
    return await db.select().from(callLogs).where(and(eq(callLogs.tenantId, tenantId), eq(callLogs.customerId, customerId))).orderBy(callLogs.createdAt);
  }

  async getCallLog(tenantId: string, id: string): Promise<CallLog | undefined> {
    const [log] = await db.select().from(callLogs).where(and(eq(callLogs.tenantId, tenantId), eq(callLogs.id, id)));
    return log;
  }

  async createCallLog(tenantId: string, log: InsertCallLog): Promise<CallLog> {
    const [newLog] = await db.insert(callLogs).values({ ...log, tenantId }).returning();
    return newLog;
  }

  async updateCallLog(tenantId: string, id: string, log: Partial<InsertCallLog>): Promise<CallLog | undefined> {
    const [updated] = await db
      .update(callLogs)
      .set({ ...log, updatedAt: new Date() })
      .where(and(eq(callLogs.tenantId, tenantId), eq(callLogs.id, id)))
      .returning();
    return updated;
  }

  async updateCallLogByRinggId(tenantId: string, ringgCallId: string, log: Partial<InsertCallLog>): Promise<CallLog | undefined> {
    const [updated] = await db
      .update(callLogs)
      .set({ ...log, updatedAt: new Date() })
      .where(and(eq(callLogs.tenantId, tenantId), eq(callLogs.ringgCallId, ringgCallId)))
      .returning();
    return updated;
  }

  async deleteCallLog(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(callLogs).where(and(eq(callLogs.tenantId, tenantId), eq(callLogs.id, id))).returning();
    return result.length > 0;
  }

  // Communication Schedule operations
  async getCommunicationSchedules(tenantId: string): Promise<CommunicationSchedule[]> {
    return await db.select().from(communicationSchedules).where(eq(communicationSchedules.tenantId, tenantId)).orderBy(desc(communicationSchedules.createdAt));
  }

  async getCommunicationSchedule(tenantId: string, id: string): Promise<CommunicationSchedule | undefined> {
    const [schedule] = await db.select().from(communicationSchedules).where(and(eq(communicationSchedules.tenantId, tenantId), eq(communicationSchedules.id, id)));
    return schedule;
  }

  async getCommunicationSchedulesByModule(tenantId: string, module: string): Promise<CommunicationSchedule[]> {
    return await db.select().from(communicationSchedules).where(and(eq(communicationSchedules.tenantId, tenantId), eq(communicationSchedules.module, module))).orderBy(desc(communicationSchedules.createdAt));
  }

  async createCommunicationSchedule(tenantId: string, schedule: InsertCommunicationSchedule): Promise<CommunicationSchedule> {
    const [newSchedule] = await db.insert(communicationSchedules).values({ ...schedule, tenantId }).returning();
    return newSchedule;
  }

  async updateCommunicationSchedule(tenantId: string, id: string, schedule: Partial<InsertCommunicationSchedule>): Promise<CommunicationSchedule | undefined> {
    const [updated] = await db
      .update(communicationSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(and(eq(communicationSchedules.tenantId, tenantId), eq(communicationSchedules.id, id)))
      .returning();
    return updated;
  }

  async deleteCommunicationSchedule(tenantId: string, id: string): Promise<boolean> {
    const result = await db.delete(communicationSchedules).where(and(eq(communicationSchedules.tenantId, tenantId), eq(communicationSchedules.id, id))).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
