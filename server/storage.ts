import { type Customer, type InsertCustomer, type Payment, type InsertPayment, type FollowUp, type InsertFollowUp, type MasterCustomer, type InsertMasterCustomer, type MasterItem, type InsertMasterItem, type Invoice, type InsertInvoice, type Receipt, type InsertReceipt, type Lead, type InsertLead, type LeadFollowUp, type InsertLeadFollowUp, type CompanyProfile, type InsertCompanyProfile, type Quotation, type InsertQuotation, type QuotationItem, type InsertQuotationItem, type QuotationSettings, type InsertQuotationSettings, type ProformaInvoice, type InsertProformaInvoice, type ProformaInvoiceItem, type InsertProformaInvoiceItem, type DebtorsFollowUp, type InsertDebtorsFollowUp, type Role, type InsertRole, type User, type InsertUser, customers, payments, followUps, masterCustomers, masterItems, invoices, receipts, leads, leadFollowUps, companyProfile, quotations, quotationItems, quotationSettings, proformaInvoices, proformaInvoiceItems, debtorsFollowUps, roles, users } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Payment operations
  getPaymentsByCustomer(customerId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  
  // Follow-up operations
  getFollowUpsByCustomer(customerId: string): Promise<FollowUp[]>;
  getFollowUp(id: string): Promise<FollowUp | undefined>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: string, followUp: Partial<InsertFollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: string): Promise<boolean>;
  
  // Bulk operations
  createCustomers(customers: InsertCustomer[]): Promise<Customer[]>;
  deleteCustomers(ids: string[]): Promise<number>;
  
  // Master Customer operations
  getMasterCustomers(): Promise<MasterCustomer[]>;
  getMasterCustomer(id: string): Promise<MasterCustomer | undefined>;
  createMasterCustomer(customer: InsertMasterCustomer): Promise<MasterCustomer>;
  updateMasterCustomer(id: string, customer: Partial<InsertMasterCustomer>): Promise<MasterCustomer | undefined>;
  deleteMasterCustomer(id: string): Promise<boolean>;
  deleteMasterCustomers(ids: string[]): Promise<number>;
  
  // Master Items operations
  getMasterItems(): Promise<MasterItem[]>;
  getMasterItem(id: string): Promise<MasterItem | undefined>;
  createMasterItem(item: InsertMasterItem): Promise<MasterItem>;
  updateMasterItem(id: string, item: Partial<InsertMasterItem>): Promise<MasterItem | undefined>;
  deleteMasterItem(id: string): Promise<boolean>;
  deleteMasterItems(ids: string[]): Promise<number>;
  
  // Invoice operations
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoicesByCustomerName(customerName: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  deleteInvoices(ids: string[]): Promise<number>;
  
  // Receipt operations
  getReceipts(): Promise<Receipt[]>;
  getReceipt(id: string): Promise<Receipt | undefined>;
  getReceiptByVoucherNumber(voucherType: string, voucherNumber: string): Promise<Receipt | undefined>;
  getReceiptsByCustomerName(customerName: string): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: string, receipt: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  deleteReceipt(id: string): Promise<boolean>;
  deleteReceipts(ids: string[]): Promise<number>;
  
  // Lead operations
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  deleteLeads(ids: string[]): Promise<number>;
  
  // Lead Follow-up operations
  getLeadFollowUpsByLead(leadId: string): Promise<LeadFollowUp[]>;
  getLeadFollowUp(id: string): Promise<LeadFollowUp | undefined>;
  createLeadFollowUp(followUp: InsertLeadFollowUp): Promise<LeadFollowUp>;
  updateLeadFollowUp(id: string, followUp: Partial<InsertLeadFollowUp>): Promise<LeadFollowUp | undefined>;
  deleteLeadFollowUp(id: string): Promise<boolean>;
  
  // Company Profile operations
  getCompanyProfile(): Promise<CompanyProfile | undefined>;
  updateCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  
  // Quotation operations
  getQuotations(): Promise<Quotation[]>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  deleteQuotation(id: string): Promise<boolean>;
  deleteQuotations(ids: string[]): Promise<number>;
  getNextQuotationNumber(): Promise<string>;
  
  // Quotation Items operations
  getQuotationItems(quotationId: string): Promise<QuotationItem[]>;
  createQuotationItem(item: InsertQuotationItem): Promise<QuotationItem>;
  deleteQuotationItem(id: string): Promise<boolean>;
  deleteQuotationItems(quotationId: string): Promise<number>;
  
  // Quotation Settings operations
  getQuotationSettings(): Promise<QuotationSettings | undefined>;
  updateQuotationSettings(termsAndConditions: string): Promise<QuotationSettings>;
  
  // Proforma Invoice operations
  getProformaInvoices(): Promise<ProformaInvoice[]>;
  getProformaInvoice(id: string): Promise<ProformaInvoice | undefined>;
  getProformaInvoiceByQuotationId(quotationId: string): Promise<ProformaInvoice | undefined>;
  createProformaInvoice(invoice: InsertProformaInvoice): Promise<ProformaInvoice>;
  updateProformaInvoice(id: string, invoice: Partial<InsertProformaInvoice>): Promise<ProformaInvoice | undefined>;
  deleteProformaInvoice(id: string): Promise<boolean>;
  deleteProformaInvoices(ids: string[]): Promise<number>;
  getNextProformaInvoiceNumber(): Promise<string>;
  
  // Proforma Invoice Items operations
  getProformaInvoiceItems(invoiceId: string): Promise<ProformaInvoiceItem[]>;
  createProformaInvoiceItem(item: InsertProformaInvoiceItem): Promise<ProformaInvoiceItem>;
  deleteProformaInvoiceItem(id: string): Promise<boolean>;
  
  // Debtors operations
  getDebtorsList(): Promise<any>;
  getDebtorsFollowUpStats(): Promise<any>;
  
  // Debtors Follow-up operations
  getDebtorsFollowUpsByCustomer(customerId: string): Promise<any[]>;
  createDebtorsFollowUp(followUp: any): Promise<any>;
  getDebtorsFollowUpsByCategory(category: string): Promise<any[]>;
  
  // Credit Management operations
  getCreditManagementData(): Promise<any>;
  
  // Role operations
  getRoles(): Promise<any[]>;
  getRole(id: string): Promise<any | undefined>;
  createRole(data: any): Promise<any>;
  updateRole(id: string, data: any): Promise<any | undefined>;
  deleteRole(id: string): Promise<boolean>;
  bulkDeleteRoles(ids: string[]): Promise<number>;
  
  // User operations
  getUsers(): Promise<any[]>;
  getUser(id: string): Promise<any | undefined>;
  getUserByEmail(email: string): Promise<any | undefined>;
  createUser(data: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any | undefined>;
  deleteUser(id: string): Promise<boolean>;
  bulkDeleteUsers(ids: string[]): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(insertCustomer)
      .returning();
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    // Payments will be deleted automatically due to cascade delete in schema
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return result.length > 0;
  }

  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    // Create the payment
    const [payment] = await db
      .insert(payments)
      .values({
        customerId: insertPayment.customerId,
        amount: insertPayment.amount,
        paymentMethod: insertPayment.paymentMethod,
        receiptNumber: insertPayment.receiptNumber || null,
        notes: insertPayment.notes || null,
      })
      .returning();

    // Update customer's amount owed
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, insertPayment.customerId));

    if (customer) {
      const currentAmount = parseFloat(customer.amountOwed);
      const paymentAmount = parseFloat(insertPayment.amount);
      const newAmount = Math.max(0, currentAmount - paymentAmount);

      await db
        .update(customers)
        .set({ amountOwed: newAmount.toFixed(2) })
        .where(eq(customers.id, insertPayment.customerId));
    }

    return payment;
  }

  async createCustomers(customersData: InsertCustomer[]): Promise<Customer[]> {
    if (customersData.length === 0) return [];
    
    const result = await db
      .insert(customers)
      .values(customersData)
      .returning();
    return result;
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined> {
    // Get the old payment to calculate amount difference
    const oldPayment = await this.getPayment(id);
    if (!oldPayment) return undefined;

    const [updatedPayment] = await db
      .update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();

    // If amount changed, update customer's amount owed
    if (updates.amount && oldPayment.amount !== updates.amount) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, updatedPayment.customerId));

      if (customer) {
        const oldAmount = parseFloat(oldPayment.amount);
        const newAmount = parseFloat(updates.amount);
        const difference = newAmount - oldAmount;
        
        const currentOwed = parseFloat(customer.amountOwed);
        const newOwed = Math.max(0, currentOwed - difference);

        await db
          .update(customers)
          .set({ amountOwed: newOwed.toFixed(2) })
          .where(eq(customers.id, updatedPayment.customerId));
      }
    }

    return updatedPayment || undefined;
  }

  async deletePayment(id: string): Promise<boolean> {
    // Get the payment first to restore the amount to customer
    const payment = await this.getPayment(id);
    if (!payment) return false;

    // Restore the payment amount back to customer's debt
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, payment.customerId));

    if (customer) {
      const currentOwed = parseFloat(customer.amountOwed);
      const paymentAmount = parseFloat(payment.amount);
      const newOwed = currentOwed + paymentAmount;

      await db
        .update(customers)
        .set({ amountOwed: newOwed.toFixed(2) })
        .where(eq(customers.id, payment.customerId));
    }

    // Delete the payment
    const result = await db
      .delete(payments)
      .where(eq(payments.id, id))
      .returning();

    return result.length > 0;
  }

  async getFollowUpsByCustomer(customerId: string): Promise<FollowUp[]> {
    return await db
      .select()
      .from(followUps)
      .where(eq(followUps.customerId, customerId))
      .orderBy(desc(followUps.followUpDateTime));
  }

  async getFollowUp(id: string): Promise<FollowUp | undefined> {
    const [followUp] = await db.select().from(followUps).where(eq(followUps.id, id));
    return followUp || undefined;
  }

  async createFollowUp(insertFollowUp: InsertFollowUp): Promise<FollowUp> {
    const [followUp] = await db
      .insert(followUps)
      .values({
        customerId: insertFollowUp.customerId,
        type: insertFollowUp.type,
        remarks: insertFollowUp.remarks,
        followUpDateTime: new Date(insertFollowUp.followUpDateTime),
      })
      .returning();
    return followUp;
  }

  async updateFollowUp(id: string, updates: Partial<InsertFollowUp>): Promise<FollowUp | undefined> {
    const updateData: any = { ...updates };
    if (updateData.followUpDateTime) {
      updateData.followUpDateTime = new Date(updateData.followUpDateTime);
    }
    
    const [followUp] = await db
      .update(followUps)
      .set(updateData)
      .where(eq(followUps.id, id))
      .returning();
    return followUp || undefined;
  }

  async deleteFollowUp(id: string): Promise<boolean> {
    const result = await db
      .delete(followUps)
      .where(eq(followUps.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteCustomers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteCustomer(id);
      if (deleted) count++;
    }
    return count;
  }

  async getMasterCustomers(): Promise<MasterCustomer[]> {
    return await db.select().from(masterCustomers);
  }

  async getMasterCustomer(id: string): Promise<MasterCustomer | undefined> {
    const [customer] = await db.select().from(masterCustomers).where(eq(masterCustomers.id, id));
    return customer || undefined;
  }

  async createMasterCustomer(insertCustomer: InsertMasterCustomer): Promise<MasterCustomer> {
    const dataToInsert: any = {
      ...insertCustomer,
      incorporationDate: insertCustomer.incorporationDate ? new Date(insertCustomer.incorporationDate) : null,
    };
    
    const [customer] = await db
      .insert(masterCustomers)
      .values(dataToInsert)
      .returning();
    return customer;
  }

  async updateMasterCustomer(id: string, updates: Partial<InsertMasterCustomer>): Promise<MasterCustomer | undefined> {
    const dataToUpdate: any = { ...updates };
    if (dataToUpdate.incorporationDate) {
      dataToUpdate.incorporationDate = new Date(dataToUpdate.incorporationDate);
    }
    
    const [customer] = await db
      .update(masterCustomers)
      .set(dataToUpdate)
      .where(eq(masterCustomers.id, id))
      .returning();
    return customer || undefined;
  }

  async deleteMasterCustomer(id: string): Promise<boolean> {
    const result = await db
      .delete(masterCustomers)
      .where(eq(masterCustomers.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteMasterCustomers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteMasterCustomer(id);
      if (deleted) count++;
    }
    return count;
  }

  async getMasterItems(): Promise<MasterItem[]> {
    return await db.select().from(masterItems);
  }

  async getMasterItem(id: string): Promise<MasterItem | undefined> {
    const [item] = await db.select().from(masterItems).where(eq(masterItems.id, id));
    return item || undefined;
  }

  async createMasterItem(insertItem: InsertMasterItem): Promise<MasterItem> {
    const [item] = await db
      .insert(masterItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateMasterItem(id: string, updates: Partial<InsertMasterItem>): Promise<MasterItem | undefined> {
    const [item] = await db
      .update(masterItems)
      .set(updates)
      .where(eq(masterItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteMasterItem(id: string): Promise<boolean> {
    const result = await db
      .delete(masterItems)
      .where(eq(masterItems.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteMasterItems(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteMasterItem(id);
      if (deleted) count++;
    }
    return count;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice || undefined;
  }

  async getInvoicesByCustomerName(customerName: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.customerName, customerName))
      .orderBy(invoices.invoiceDate);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        invoiceDate: new Date(insertInvoice.invoiceDate),
      })
      .returning();
    return invoice;
  }

  async updateInvoice(id: string, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const updateData: any = { ...updates };
    if (updates.invoiceDate) {
      updateData.invoiceDate = new Date(updates.invoiceDate);
    }
    
    const [invoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db
      .delete(invoices)
      .where(eq(invoices.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteInvoices(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteInvoice(id);
      if (deleted) count++;
    }
    return count;
  }

  async getReceipts(): Promise<Receipt[]> {
    return await db.select().from(receipts).orderBy(desc(receipts.createdAt));
  }

  async getReceipt(id: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt || undefined;
  }

  async getReceiptByVoucherNumber(voucherType: string, voucherNumber: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(
      and(eq(receipts.voucherType, voucherType), eq(receipts.voucherNumber, voucherNumber))
    );
    return receipt || undefined;
  }

  async getReceiptsByCustomerName(customerName: string): Promise<Receipt[]> {
    return await db.select().from(receipts)
      .where(eq(receipts.customerName, customerName))
      .orderBy(receipts.date);
  }

  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const [receipt] = await db
      .insert(receipts)
      .values({
        ...insertReceipt,
        date: new Date(insertReceipt.date),
      })
      .returning();
    return receipt;
  }

  async updateReceipt(id: string, updates: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const updateData: any = { ...updates };
    if (updates.date) {
      updateData.date = new Date(updates.date);
    }
    
    const [receipt] = await db
      .update(receipts)
      .set(updateData)
      .where(eq(receipts.id, id))
      .returning();
    return receipt || undefined;
  }

  async deleteReceipt(id: string): Promise<boolean> {
    const result = await db
      .delete(receipts)
      .where(eq(receipts.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteReceipts(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteReceipt(id);
      if (deleted) count++;
    }
    return count;
  }

  async getLeads(): Promise<Lead[]> {
    const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    
    // Fetch latest follow-up for each lead
    const leadsWithFollowUps = await Promise.all(
      allLeads.map(async (lead) => {
        const followUps = await db
          .select()
          .from(leadFollowUps)
          .where(eq(leadFollowUps.leadId, lead.id))
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

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const dataToInsert: any = { ...insertLead };
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

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
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
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db
      .delete(leads)
      .where(eq(leads.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteLeads(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    let count = 0;
    for (const id of ids) {
      const deleted = await this.deleteLead(id);
      if (deleted) count++;
    }
    return count;
  }

  async getLeadFollowUpsByLead(leadId: string): Promise<LeadFollowUp[]> {
    return await db
      .select()
      .from(leadFollowUps)
      .where(eq(leadFollowUps.leadId, leadId))
      .orderBy(desc(leadFollowUps.followUpDateTime));
  }

  async getLeadFollowUp(id: string): Promise<LeadFollowUp | undefined> {
    const [followUp] = await db.select().from(leadFollowUps).where(eq(leadFollowUps.id, id));
    return followUp || undefined;
  }

  async createLeadFollowUp(insertFollowUp: InsertLeadFollowUp): Promise<LeadFollowUp> {
    const [followUp] = await db
      .insert(leadFollowUps)
      .values({
        ...insertFollowUp,
        followUpDateTime: new Date(insertFollowUp.followUpDateTime)
      })
      .returning();
    
    await db
      .update(leads)
      .set({ 
        nextFollowUp: new Date(insertFollowUp.followUpDateTime),
        lastFollowUp: new Date()
      })
      .where(eq(leads.id, insertFollowUp.leadId));
    
    return followUp;
  }

  async updateLeadFollowUp(id: string, updates: Partial<InsertLeadFollowUp>): Promise<LeadFollowUp | undefined> {
    const updateData: any = { ...updates };
    if (updates.followUpDateTime) {
      updateData.followUpDateTime = new Date(updates.followUpDateTime);
    }
    const [followUp] = await db
      .update(leadFollowUps)
      .set(updateData)
      .where(eq(leadFollowUps.id, id))
      .returning();
    return followUp || undefined;
  }

  async deleteLeadFollowUp(id: string): Promise<boolean> {
    const result = await db
      .delete(leadFollowUps)
      .where(eq(leadFollowUps.id, id))
      .returning();
    return result.length > 0;
  }

  async getCompanyProfile(): Promise<CompanyProfile | undefined> {
    const [profile] = await db.select().from(companyProfile).limit(1);
    return profile || undefined;
  }

  async updateCompanyProfile(insertProfile: InsertCompanyProfile): Promise<CompanyProfile> {
    const existing = await this.getCompanyProfile();
    
    if (existing) {
      const [updated] = await db
        .update(companyProfile)
        .set({ ...insertProfile, updatedAt: new Date() })
        .where(eq(companyProfile.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(companyProfile)
        .values(insertProfile)
        .returning();
      return created;
    }
  }

  async getQuotations(): Promise<Quotation[]> {
    return await db.select().from(quotations).orderBy(desc(quotations.createdAt));
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation || undefined;
  }

  async createQuotation(insertQuotation: InsertQuotation): Promise<Quotation> {
    const quotationData: any = { ...insertQuotation };
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

  async updateQuotation(id: string, updates: Partial<InsertQuotation>): Promise<Quotation | undefined> {
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
      .where(eq(quotations.id, id))
      .returning();
    return quotation || undefined;
  }

  async deleteQuotation(id: string): Promise<boolean> {
    const result = await db
      .delete(quotations)
      .where(eq(quotations.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteQuotations(ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => 
      db.delete(quotations).where(eq(quotations.id, id))
    );
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  async getNextQuotationNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const allQuotations = await db.select().from(quotations);
    const thisYearQuotations = allQuotations.filter(q => 
      q.quotationNumber.startsWith(`QT-${currentYear}-`)
    );
    const nextNumber = thisYearQuotations.length + 1;
    return `QT-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
    return await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quotationId))
      .orderBy(quotationItems.displayOrder);
  }

  async createQuotationItem(insertItem: InsertQuotationItem): Promise<QuotationItem> {
    const [item] = await db
      .insert(quotationItems)
      .values(insertItem as any)
      .returning();
    return item;
  }

  async deleteQuotationItem(id: string): Promise<boolean> {
    const result = await db
      .delete(quotationItems)
      .where(eq(quotationItems.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteQuotationItems(quotationId: string): Promise<number> {
    const result = await db
      .delete(quotationItems)
      .where(eq(quotationItems.quotationId, quotationId))
      .returning();
    return result.length;
  }

  async getQuotationSettings(): Promise<QuotationSettings | undefined> {
    const [settings] = await db.select().from(quotationSettings).limit(1);
    return settings || undefined;
  }

  async updateQuotationSettings(termsAndConditions: string): Promise<QuotationSettings> {
    const existing = await this.getQuotationSettings();
    
    if (existing) {
      const [updated] = await db
        .update(quotationSettings)
        .set({ termsAndConditions, updatedAt: new Date() })
        .where(eq(quotationSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(quotationSettings)
        .values({ termsAndConditions })
        .returning();
      return created;
    }
  }

  async getProformaInvoices(): Promise<ProformaInvoice[]> {
    return await db.select().from(proformaInvoices).orderBy(desc(proformaInvoices.createdAt));
  }

  async getProformaInvoice(id: string): Promise<ProformaInvoice | undefined> {
    const [invoice] = await db.select().from(proformaInvoices).where(eq(proformaInvoices.id, id));
    return invoice || undefined;
  }

  async getProformaInvoiceByQuotationId(quotationId: string): Promise<ProformaInvoice | undefined> {
    const [invoice] = await db.select().from(proformaInvoices).where(eq(proformaInvoices.quotationId, quotationId));
    return invoice || undefined;
  }

  async createProformaInvoice(insertInvoice: InsertProformaInvoice): Promise<ProformaInvoice> {
    const invoiceData: any = { ...insertInvoice };
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

  async updateProformaInvoice(id: string, updates: Partial<InsertProformaInvoice>): Promise<ProformaInvoice | undefined> {
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
      .where(eq(proformaInvoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteProformaInvoice(id: string): Promise<boolean> {
    const result = await db
      .delete(proformaInvoices)
      .where(eq(proformaInvoices.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteProformaInvoices(ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => 
      db.delete(proformaInvoices).where(eq(proformaInvoices.id, id))
    );
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  async getNextProformaInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const allInvoices = await db.select().from(proformaInvoices);
    const thisYearInvoices = allInvoices.filter(inv => 
      inv.invoiceNumber.startsWith(`PI-${currentYear}-`)
    );
    const nextNumber = thisYearInvoices.length + 1;
    return `PI-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  }

  async getProformaInvoiceItems(invoiceId: string): Promise<ProformaInvoiceItem[]> {
    return await db
      .select()
      .from(proformaInvoiceItems)
      .where(eq(proformaInvoiceItems.invoiceId, invoiceId))
      .orderBy(proformaInvoiceItems.displayOrder);
  }

  async createProformaInvoiceItem(insertItem: InsertProformaInvoiceItem): Promise<ProformaInvoiceItem> {
    const [item] = await db
      .insert(proformaInvoiceItems)
      .values(insertItem as any)
      .returning();
    return item;
  }

  async deleteProformaInvoiceItem(id: string): Promise<boolean> {
    const result = await db
      .delete(proformaInvoiceItems)
      .where(eq(proformaInvoiceItems.id, id))
      .returning();
    return result.length > 0;
  }

  async getDebtorsList(): Promise<any> {
    const customers = await db.select().from(masterCustomers);
    const allInvoices = await db.select().from(invoices);
    const allReceipts = await db.select().from(receipts);
    const allFollowUps = await db.select().from(debtorsFollowUps);

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

      const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
      const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
      const balance = totalInvoices - totalReceipts;

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

  async getDebtorsFollowUpStats(): Promise<any> {
    const allFollowUps = await db
      .select()
      .from(debtorsFollowUps)
      .where(eq(debtorsFollowUps.status, "Pending"));
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get only debtors (customers with outstanding balance)
    const customers = await db.select().from(masterCustomers);
    const allInvoices = await db.select().from(invoices);
    const allReceipts = await db.select().from(receipts);
    
    const debtorIds = new Set<string>();
    for (const customer of customers) {
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
      const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
      const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
      const balance = totalInvoices - totalReceipts;
      
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

  async getDebtorsFollowUpsByCustomer(customerId: string): Promise<DebtorsFollowUp[]> {
    return await db
      .select()
      .from(debtorsFollowUps)
      .where(eq(debtorsFollowUps.customerId, customerId))
      .orderBy(desc(debtorsFollowUps.followUpDateTime));
  }

  async createDebtorsFollowUp(insertFollowUp: InsertDebtorsFollowUp): Promise<DebtorsFollowUp> {
    const followUpData: any = { ...insertFollowUp };
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

  async getDebtorsFollowUpsByCategory(category: string): Promise<any[]> {
    const customers = await db.select().from(masterCustomers).where(eq(masterCustomers.category, category));
    const customerIds = customers.map(c => c.id);

    const allFollowUps = await db
      .select()
      .from(debtorsFollowUps)
      .orderBy(desc(debtorsFollowUps.followUpDateTime));

    return allFollowUps.filter(f => customerIds.includes(f.customerId));
  }

  async getCreditManagementData(): Promise<any> {
    const customers = await db.select().from(masterCustomers);
    const allInvoices = await db.select().from(invoices);
    const allReceipts = await db.select().from(receipts);

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

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(desc(roles.createdAt));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(insertRole as any).returning();
    return role;
  }

  async updateRole(id: string, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const [role] = await db.update(roles).set(updates as any).where(eq(roles.id, id)).returning();
    return role || undefined;
  }

  async deleteRole(id: string): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteRoles(ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => db.delete(roles).where(eq(roles.id, id)));
    const results = await Promise.all(deletePromises);
    return results.length;
  }

  async getUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const allRoles = await db.select().from(roles);
    
    return allUsers.map(user => {
      const role = allRoles.find(r => r.id === user.roleId);
      return {
        ...user,
        roleName: role?.name || null,
      };
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    const [role] = user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = { ...insertUser };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const [user] = await db.insert(users).values(userData as any).returning();
    const [role] = user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
    return {
      ...user,
      roleName: role?.name || null,
    };
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const userData = { ...updates };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const [user] = await db.update(users).set(userData as any).where(eq(users.id, id)).returning();
    if (!user) return undefined;
    
    const [role] = user.roleId ? await db.select().from(roles).where(eq(roles.id, user.roleId)) : [null];
    return {
      ...user,
      roleName: role?.name || null,
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteUsers(ids: string[]): Promise<number> {
    const deletePromises = ids.map(id => db.delete(users).where(eq(users.id, id)));
    const results = await Promise.all(deletePromises);
    return results.length;
  }
}

export const storage = new DatabaseStorage();
