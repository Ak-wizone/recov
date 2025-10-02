import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  amountOwed: decimal("amount_owed", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // Alpha, Beta, Gamma, Delta
  assignedUser: text("assigned_user"),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
});

export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Meeting, Call, WhatsApp, Email
  remarks: text("remarks").notNull(),
  followUpDateTime: timestamp("follow_up_date_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  amountOwed: true,
  category: true,
  assignedUser: true,
  mobile: true,
  email: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  amountOwed: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Amount must be a valid positive number",
  }),
  category: z.enum(["Alpha", "Beta", "Gamma", "Delta"], {
    errorMap: () => ({ message: "Category must be Alpha, Beta, Gamma, or Delta" }),
  }),
  assignedUser: z.enum(["Manpreet Bedi", "Bilal Ahamad", "Anjali Dhiman", "Princi Soni"], {
    errorMap: () => ({ message: "Invalid assigned user" }),
  }).optional(),
  mobile: z.string().min(1, "Mobile number is required"),
  email: z.string().email("Invalid email address"),
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  customerId: true,
  amount: true,
  paymentMethod: true,
  receiptNumber: true,
  notes: true,
}).extend({
  customerId: z.string().min(1, "Customer ID is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Payment amount must be a valid positive number",
  }),
  paymentMethod: z.string().min(1, "Payment method is required"),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const insertFollowUpSchema = createInsertSchema(followUps).pick({
  customerId: true,
  type: true,
  remarks: true,
  followUpDateTime: true,
}).extend({
  customerId: z.string().min(1, "Customer ID is required"),
  type: z.enum(["Meeting", "Call", "WhatsApp", "Email"], {
    errorMap: () => ({ message: "Type must be Meeting, Call, WhatsApp, or Email" }),
  }),
  remarks: z.string().min(1, "Remarks are required"),
  followUpDateTime: z.string().min(1, "Follow-up date and time are required"),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect & {
  lastFollowUpRemarks?: string | null;
  lastFollowUpDate?: Date | null;
  lastFollowUpType?: string | null;
  nextFollowUpDate?: Date | null;
  nextFollowUpType?: string | null;
};
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUps.$inferSelect;

// Master Customers table with detailed company information
export const masterCustomers = pgTable("master_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Company & Compliance
  clientName: text("client_name").notNull(),
  category: text("category").notNull(), // Alpha, Beta, Gamma, Delta
  billingAddress: text("billing_address"),
  city: text("city"),
  pincode: text("pincode"),
  state: text("state"),
  country: text("country"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  msmeNumber: text("msme_number"),
  incorporationCertNumber: text("incorporation_cert_number"),
  incorporationDate: timestamp("incorporation_date"),
  companyType: text("company_type"),
  // Primary Contact
  primaryContactName: text("primary_contact_name"),
  primaryMobile: text("primary_mobile"),
  primaryEmail: text("primary_email"),
  // Secondary Contact
  secondaryContactName: text("secondary_contact_name"),
  secondaryMobile: text("secondary_mobile"),
  secondaryEmail: text("secondary_email"),
  // Payment & Credit Terms
  paymentTermsDays: text("payment_terms_days").notNull(),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  // Interest Configuration
  interestApplicableFrom: text("interest_applicable_from"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  // Sales Person
  salesPerson: text("sales_person"),
  // Status
  isActive: text("is_active").notNull().default("Active"), // Active, Inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
});

export const insertMasterCustomerSchema = createInsertSchema(masterCustomers).pick({
  clientName: true,
  category: true,
  billingAddress: true,
  city: true,
  pincode: true,
  state: true,
  country: true,
  gstNumber: true,
  panNumber: true,
  msmeNumber: true,
  incorporationCertNumber: true,
  incorporationDate: true,
  companyType: true,
  primaryContactName: true,
  primaryMobile: true,
  primaryEmail: true,
  secondaryContactName: true,
  secondaryMobile: true,
  secondaryEmail: true,
  paymentTermsDays: true,
  creditLimit: true,
  interestApplicableFrom: true,
  interestRate: true,
  salesPerson: true,
  isActive: true,
}).extend({
  clientName: z.string().min(1, "Client name is required"),
  category: z.enum(["Alpha", "Beta", "Gamma", "Delta"], {
    errorMap: () => ({ message: "Category must be Alpha, Beta, Gamma, or Delta" }),
  }),
  billingAddress: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  msmeNumber: z.string().optional(),
  incorporationCertNumber: z.string().optional(),
  incorporationDate: z.string().optional(),
  companyType: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryMobile: z.string().optional(),
  primaryEmail: z.string().email("Invalid primary email").optional().or(z.literal("")),
  secondaryContactName: z.string().optional(),
  secondaryMobile: z.string().optional(),
  secondaryEmail: z.string().email("Invalid secondary email").optional().or(z.literal("")),
  paymentTermsDays: z.string().min(1, "Payment terms are required"),
  creditLimit: z.string().optional(),
  interestApplicableFrom: z.string().optional(),
  interestRate: z.string().optional(),
  salesPerson: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertMasterCustomer = z.infer<typeof insertMasterCustomerSchema>;
export type MasterCustomer = typeof masterCustomers.$inferSelect;
