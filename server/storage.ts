import { type Customer, type InsertCustomer, type Payment, type InsertPayment, customers, payments } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Payment operations
  getPaymentsByCustomer(customerId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Bulk operations
  createCustomers(customers: InsertCustomer[]): Promise<Customer[]>;
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
}

export const storage = new DatabaseStorage();
