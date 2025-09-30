import { type Customer, type InsertCustomer, type Payment, type InsertPayment } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private customers: Map<string, Customer>;
  private payments: Map<string, Payment>;

  constructor() {
    this.customers = new Map();
    this.payments = new Map();
  }

  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...insertCustomer,
      id,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const updatedCustomer: Customer = {
      ...customer,
      ...updates,
    };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    // Delete associated payments first
    const payments = await this.getPaymentsByCustomer(id);
    payments.forEach(payment => this.payments.delete(payment.id));
    
    return this.customers.delete(id);
  }

  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.customerId === customerId,
    );
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      id,
      customerId: insertPayment.customerId,
      amount: insertPayment.amount,
      paymentMethod: insertPayment.paymentMethod,
      receiptNumber: insertPayment.receiptNumber || null,
      notes: insertPayment.notes || null,
      paymentDate: new Date(),
    };
    this.payments.set(id, payment);

    // Update customer's amount owed
    const customer = this.customers.get(insertPayment.customerId);
    if (customer) {
      const currentAmount = parseFloat(customer.amountOwed);
      const paymentAmount = parseFloat(insertPayment.amount);
      const newAmount = Math.max(0, currentAmount - paymentAmount);
      
      this.customers.set(insertPayment.customerId, {
        ...customer,
        amountOwed: newAmount.toFixed(2),
      });
    }

    return payment;
  }

  async createCustomers(customers: InsertCustomer[]): Promise<Customer[]> {
    const created: Customer[] = [];
    for (const customer of customers) {
      created.push(await this.createCustomer(customer));
    }
    return created;
  }
}

export const storage = new MemStorage();
