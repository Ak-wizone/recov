import { type Customer, type InsertCustomer, type Payment, type InsertPayment, type FollowUp, type InsertFollowUp, type MasterCustomer, type InsertMasterCustomer, type MasterItem, type InsertMasterItem, type Invoice, type InsertInvoice, customers, payments, followUps, masterCustomers, masterItems, invoices } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  deleteInvoices(ids: string[]): Promise<number>;
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
}

export const storage = new DatabaseStorage();
