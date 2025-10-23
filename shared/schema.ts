import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Multi-Tenant Tables

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  email: text("email").notNull().unique(),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  pincode: text("pincode").notNull(),
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  industryType: text("industry_type"),
  planType: text("plan_type").notNull(),
  existingAccountingSoftware: text("existing_accounting_software"),
  status: text("status").notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
});

export const insertTenantSchema = createInsertSchema(tenants).pick({
  slug: true,
  businessName: true,
  email: true,
  businessAddress: true,
  city: true,
  state: true,
  pincode: true,
  panNumber: true,
  gstNumber: true,
  industryType: true,
  planType: true,
  existingAccountingSoftware: true,
}).extend({
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  pincode: z.string().min(1, "Pincode is required"),
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  industryType: z.string().optional(),
  planType: z.enum(["6_months_demo", "annual_subscription", "lifetime"], {
    errorMap: () => ({ message: "Invalid plan type" }),
  }),
  existingAccountingSoftware: z.string().optional(),
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export const tenantUsers = pgTable("tenant_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TenantUser = typeof tenantUsers.$inferSelect;

export const registrationRequests = pgTable("registration_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  email: text("email").notNull(),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  pincode: text("pincode").notNull(),
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  industryType: text("industry_type"),
  planType: text("plan_type").notNull(),
  existingAccountingSoftware: text("existing_accounting_software"),
  paymentMethod: text("payment_method").notNull(),
  paymentReceiptUrl: text("payment_receipt_url"),
  status: text("status").notNull().default("pending"),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  rejectionReason: text("rejection_reason"),
});

export const insertRegistrationRequestSchema = createInsertSchema(registrationRequests).pick({
  businessName: true,
  email: true,
  businessAddress: true,
  city: true,
  state: true,
  pincode: true,
  panNumber: true,
  gstNumber: true,
  industryType: true,
  planType: true,
  existingAccountingSoftware: true,
  paymentMethod: true,
  paymentReceiptUrl: true,
}).extend({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  pincode: z.string().min(1, "Pincode is required"),
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  industryType: z.string().optional(),
  planType: z.enum(["6_months_demo", "annual_subscription", "lifetime"], {
    errorMap: () => ({ message: "Invalid plan type" }),
  }),
  existingAccountingSoftware: z.string().optional(),
  paymentMethod: z.enum(["qr_code", "payu", "bank_transfer"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  paymentReceiptUrl: z.string().optional(),
});

export type InsertRegistrationRequest = z.infer<typeof insertRegistrationRequestSchema>;
export type RegistrationRequest = typeof registrationRequests.$inferSelect;

// Legacy/Existing Tables (will be updated with tenantId)

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amountOwed: decimal("amount_owed", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // Alpha, Beta, Gamma, Delta
  assignedUser: text("assigned_user"),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
});

export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Meeting, Call, WhatsApp, Email
  remarks: text("remarks").notNull(),
  followUpDateTime: timestamp("follow_up_date_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
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
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }),
  // Interest Configuration
  interestApplicableFrom: text("interest_applicable_from"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  // Sales Person
  salesPerson: text("sales_person"),
  // Status
  isActive: text("is_active").notNull().default("Active"), // Active, Inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMasterCustomerSchema = createInsertSchema(masterCustomers).pick({
  clientName: true,
  category: true,
  primaryContactName: true,
  primaryMobile: true,
  primaryEmail: true,
  secondaryContactName: true,
  secondaryMobile: true,
  secondaryEmail: true,
  gstNumber: true,
  billingAddress: true,
  city: true,
  state: true,
  pincode: true,
  paymentTermsDays: true,
  creditLimit: true,
  openingBalance: true,
  interestApplicableFrom: true,
  interestRate: true,
  salesPerson: true,
  isActive: true,
}).extend({
  clientName: z.string().min(1, "Client name is required"),
  category: z.enum(["Alpha", "Beta", "Gamma", "Delta"], {
    errorMap: () => ({ message: "Category must be Alpha, Beta, Gamma, or Delta" }),
  }),
  primaryContactName: z.string().optional(),
  primaryMobile: z.string()
    .min(1, "Primary mobile is required")
    .regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
  primaryEmail: z.string().min(1, "Primary email is required").email("Invalid primary email"),
  secondaryContactName: z.string().optional(),
  secondaryMobile: z.string()
    .regex(/^[0-9]{10}$/, "Secondary mobile must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  secondaryEmail: z.string().email("Invalid secondary email").optional().or(z.literal("")),
  gstNumber: z.string().min(1, "GST number is required"),
  billingAddress: z.string().min(1, "Billing address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  pincode: z.string().min(1, "Pin code is required"),
  paymentTermsDays: z.string().min(1, "Payment terms are required"),
  creditLimit: z.string().min(1, "Credit limit is required"),
  openingBalance: z.string().optional().or(z.literal("")),
  interestApplicableFrom: z.string().optional(),
  interestRate: z.string().min(1, "Interest rate is required"),
  salesPerson: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertMasterCustomer = z.infer<typeof insertMasterCustomerSchema>;
export type MasterCustomer = typeof masterCustomers.$inferSelect;

// Flexible import schema - only clientName is required
export const insertMasterCustomerSchemaFlexible = createInsertSchema(masterCustomers).pick({
  clientName: true,
  category: true,
  primaryContactName: true,
  primaryMobile: true,
  primaryEmail: true,
  secondaryContactName: true,
  secondaryMobile: true,
  secondaryEmail: true,
  gstNumber: true,
  billingAddress: true,
  city: true,
  state: true,
  pincode: true,
  paymentTermsDays: true,
  creditLimit: true,
  openingBalance: true,
  interestApplicableFrom: true,
  interestRate: true,
  salesPerson: true,
  isActive: true,
}).extend({
  clientName: z.string().min(1, "Client name is required"),
  category: z.enum(["Alpha", "Beta", "Gamma", "Delta"], {
    errorMap: () => ({ message: "Category must be Alpha, Beta, Gamma, or Delta" }),
  }).optional(),
  primaryContactName: z.string().optional(),
  primaryMobile: z.string()
    .regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  primaryEmail: z.string().email("Invalid primary email").optional().or(z.literal("")),
  secondaryContactName: z.string().optional(),
  secondaryMobile: z.string()
    .regex(/^[0-9]{10}$/, "Secondary mobile must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  secondaryEmail: z.string().email("Invalid secondary email").optional().or(z.literal("")),
  gstNumber: z.string().optional(),
  billingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  paymentTermsDays: z.string().optional(),
  creditLimit: z.string().optional().or(z.literal("")),
  openingBalance: z.string().optional().or(z.literal("")),
  interestApplicableFrom: z.string().optional(),
  interestRate: z.string().optional().or(z.literal("")),
  salesPerson: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertMasterCustomerFlexible = z.infer<typeof insertMasterCustomerSchemaFlexible>;

// Master Items table (Products & Services)
export const masterItems = pgTable("master_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Type toggle
  itemType: text("item_type").notNull(), // 'product' or 'service'
  // Common fields
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(), // PCS, KG, BOX, Hour, Visit, Job, Month, Year, etc.
  tax: text("tax").notNull(), // 5%, 12%, 18%, 28%
  sku: text("sku").notNull(),
  saleUnitPrice: decimal("sale_unit_price", { precision: 15, scale: 2 }).notNull(),
  buyUnitPrice: decimal("buy_unit_price", { precision: 15, scale: 2 }),
  // Product-only fields
  openingQuantity: decimal("opening_quantity", { precision: 15, scale: 2 }),
  hsn: text("hsn"),
  // Service-only fields
  sac: text("sac"),
  // Status
  isActive: text("is_active").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMasterItemSchema = createInsertSchema(masterItems).pick({
  itemType: true,
  name: true,
  description: true,
  unit: true,
  tax: true,
  sku: true,
  saleUnitPrice: true,
  buyUnitPrice: true,
  openingQuantity: true,
  hsn: true,
  sac: true,
  isActive: true,
}).extend({
  itemType: z.enum(["product", "service"], {
    errorMap: () => ({ message: "Item type must be product or service" }),
  }),
  name: z.string().min(1, "Item name is required"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  unit: z.string().min(1, "Unit is required"),
  tax: z.string().min(1, "Tax rate is required"),
  sku: z.string().min(1, "SKU is required"),
  saleUnitPrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Sale price must be a valid positive number",
  }),
  buyUnitPrice: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Buy price must be a valid positive number",
  }).optional(),
  openingQuantity: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Opening quantity must be a valid positive number",
  }).optional(),
  hsn: z.string().optional(),
  sac: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertMasterItem = z.infer<typeof insertMasterItemSchema>;
export type MasterItem = typeof masterItems.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  invoiceAmount: decimal("invoice_amount", { precision: 15, scale: 2 }).notNull(),
  grossProfit: decimal("gross_profit", { precision: 15, scale: 2 }).notNull(),
  finalGrossProfit: decimal("final_gross_profit", { precision: 15, scale: 2 }),
  grossProfitPercentage: decimal("gross_profit_percentage", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("Unpaid"), // Paid, Unpaid, Partial
  remarks: text("remarks"),
  // Customer-related fields (auto-populated from customer selection)
  category: text("category"),
  primaryMobile: text("primary_mobile"),
  city: text("city"),
  pincode: text("pincode"),
  paymentTerms: integer("payment_terms"),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }),
  interestApplicableFrom: text("interest_applicable_from"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  salesPerson: text("sales_person"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  invoiceNumber: true,
  customerName: true,
  invoiceDate: true,
  invoiceAmount: true,
  grossProfit: true,
  remarks: true,
  category: true,
  primaryMobile: true,
  city: true,
  pincode: true,
  paymentTerms: true,
  creditLimit: true,
  interestApplicableFrom: true,
  interestRate: true,
  salesPerson: true,
}).extend({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerName: z.string().min(1, "Customer name is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  invoiceAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Invoice amount must be a valid positive number",
  }),
  grossProfit: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Gross profit must be a valid number",
  }),
  remarks: z.string().optional(),
  category: z.string().optional(),
  primaryMobile: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  paymentTerms: z.number().optional(),
  creditLimit: z.string().optional(),
  interestApplicableFrom: z.string().optional(),
  interestRate: z.string().optional(),
  salesPerson: z.string().optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Receipts table
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  voucherNumber: text("voucher_number").notNull(),
  voucherType: text("voucher_type"),
  customerName: text("customer_name").notNull(),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReceiptSchema = createInsertSchema(receipts).pick({
  voucherNumber: true,
  voucherType: true,
  customerName: true,
  date: true,
  amount: true,
  remarks: true,
}).extend({
  voucherNumber: z.string().min(1, "Voucher number is required"),
  voucherType: z.string().min(1, "Voucher type is required"),
  customerName: z.string().min(1, "Customer name is required"),
  date: z.string().min(1, "Date is required"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a valid positive number",
  }),
  remarks: z.string().optional(),
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

// Invoice Payments (Junction table to track receipt allocations to invoices)
export const invoicePayments = pgTable("invoice_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  receiptId: varchar("receipt_id").notNull().references(() => receipts.id, { onDelete: "cascade" }),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments).pick({
  invoiceId: true,
  receiptId: true,
  paymentAmount: true,
  paymentDate: true,
}).extend({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  receiptId: z.string().min(1, "Receipt ID is required"),
  paymentAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Payment amount must be a valid positive number",
  }),
  paymentDate: z.string().min(1, "Payment date is required"),
});

export type InsertInvoicePayment = z.infer<typeof insertInvoicePaymentSchema>;
export type InvoicePayment = typeof invoicePayments.$inferSelect;

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  leadSource: text("lead_source").notNull(), // Existing Client, Instagram, Facebook, Website, Indiamart, Justdial, Reference
  leadStatus: text("lead_status").notNull().default("New Lead"), // New Lead, In Progress, Pending From Client, Pending From Wizone, Quotation Sent, Converted, Delivered
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  remarks: text("remarks"),
  industry: text("industry"),
  priority: text("priority"), // High, Medium, Low
  assignedUser: text("assigned_user"),
  estimatedDealAmount: decimal("estimated_deal_amount", { precision: 15, scale: 2 }),
  customerId: varchar("customer_id").references(() => masterCustomers.id),
  dateCreated: timestamp("date_created").defaultNow().notNull(),
  lastFollowUp: timestamp("last_follow_up"),
  nextFollowUp: timestamp("next_follow_up"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  companyName: true,
  contactPerson: true,
  mobile: true,
  email: true,
  leadSource: true,
  leadStatus: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  remarks: true,
  industry: true,
  priority: true,
  assignedUser: true,
  estimatedDealAmount: true,
  customerId: true,
  dateCreated: true,
  lastFollowUp: true,
  nextFollowUp: true,
}).extend({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  email: z.string().email("Invalid email address"),
  leadSource: z.enum(["Existing Client", "Instagram", "Facebook", "Website", "Indiamart", "Justdial", "Reference"], {
    errorMap: () => ({ message: "Invalid lead source" }),
  }),
  leadStatus: z.enum(["New Lead", "In Progress", "Pending From Client", "Pending From Wizone", "Quotation Sent", "Converted", "Delivered"], {
    errorMap: () => ({ message: "Invalid lead status" }),
  }).default("New Lead"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  remarks: z.string().optional(),
  industry: z.string().optional(),
  priority: z.enum(["High", "Medium", "Low"], {
    errorMap: () => ({ message: "Priority must be High, Medium, or Low" }),
  }).optional(),
  assignedUser: z.enum(["Manpreet Bedi", "Bilal Ahamad", "Anjali Dhiman", "Princi Soni"], {
    errorMap: () => ({ message: "Invalid assigned user" }),
  }).optional(),
  estimatedDealAmount: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Estimated deal amount must be a valid positive number",
  }).optional(),
  customerId: z.string().optional(),
  dateCreated: z.string().optional(),
  lastFollowUp: z.string().optional(),
  nextFollowUp: z.string().optional(),
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect & {
  lastFollowUpType?: string | null;
  lastFollowUpRemarks?: string | null;
};

// Lead Follow-ups table
export const leadFollowUps = pgTable("lead_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Meeting, Call, WhatsApp, Email
  remarks: text("remarks").notNull(),
  followUpDateTime: timestamp("follow_up_date_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadFollowUpSchema = createInsertSchema(leadFollowUps).pick({
  leadId: true,
  type: true,
  remarks: true,
  followUpDateTime: true,
}).extend({
  leadId: z.string().min(1, "Lead ID is required"),
  type: z.enum(["Meeting", "Call", "WhatsApp", "Email"], {
    errorMap: () => ({ message: "Type must be Meeting, Call, WhatsApp, or Email" }),
  }),
  remarks: z.string().min(1, "Remarks are required"),
  followUpDateTime: z.string().min(1, "Follow-up date and time are required"),
});

export type InsertLeadFollowUp = z.infer<typeof insertLeadFollowUpSchema>;
export type LeadFollowUp = typeof leadFollowUps.$inferSelect;

// Company Profile table
export const companyProfile = pgTable("company_profile", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Basic Information
  logo: text("logo"),
  legalName: text("legal_name").notNull(),
  entityType: text("entity_type").notNull(),
  gstin: text("gstin"),
  pan: text("pan"),
  cin: text("cin"),
  yearOfIncorporation: text("year_of_incorporation"),
  // Registered Office Address
  regAddressLine1: text("reg_address_line1").notNull(),
  regAddressLine2: text("reg_address_line2"),
  regCity: text("reg_city").notNull(),
  regState: text("reg_state").notNull(),
  regPincode: text("reg_pincode").notNull(),
  // Corporate Office Address (optional)
  corpAddressLine1: text("corp_address_line1"),
  corpAddressLine2: text("corp_address_line2"),
  corpCity: text("corp_city"),
  corpState: text("corp_state"),
  corpPincode: text("corp_pincode"),
  // Primary Contact Person
  primaryContactName: text("primary_contact_name").notNull(),
  primaryContactDesignation: text("primary_contact_designation"),
  primaryContactMobile: text("primary_contact_mobile").notNull(),
  primaryContactEmail: text("primary_contact_email").notNull(),
  // Accounts Contact
  accountsContactName: text("accounts_contact_name"),
  accountsContactMobile: text("accounts_contact_mobile"),
  accountsContactEmail: text("accounts_contact_email"),
  // Banking & Finance
  bankName: text("bank_name"),
  branchName: text("branch_name"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  // Branding
  brandColor: text("brand_color").default("#ea580c"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfile).pick({
  logo: true,
  legalName: true,
  entityType: true,
  gstin: true,
  pan: true,
  cin: true,
  yearOfIncorporation: true,
  regAddressLine1: true,
  regAddressLine2: true,
  regCity: true,
  regState: true,
  regPincode: true,
  corpAddressLine1: true,
  corpAddressLine2: true,
  corpCity: true,
  corpState: true,
  corpPincode: true,
  primaryContactName: true,
  primaryContactDesignation: true,
  primaryContactMobile: true,
  primaryContactEmail: true,
  accountsContactName: true,
  accountsContactMobile: true,
  accountsContactEmail: true,
  bankName: true,
  branchName: true,
  accountName: true,
  accountNumber: true,
  ifscCode: true,
  brandColor: true,
}).extend({
  logo: z.string().optional(),
  legalName: z.string().min(1, "Legal name is required"),
  entityType: z.string().min(1, "Entity type is required"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  cin: z.string().optional(),
  yearOfIncorporation: z.string().optional(),
  regAddressLine1: z.string().min(1, "Registered address line 1 is required"),
  regAddressLine2: z.string().optional(),
  regCity: z.string().min(1, "Registered city is required"),
  regState: z.string().min(1, "Registered state is required"),
  regPincode: z.string().min(1, "Registered pincode is required"),
  corpAddressLine1: z.string().optional(),
  corpAddressLine2: z.string().optional(),
  corpCity: z.string().optional(),
  corpState: z.string().optional(),
  corpPincode: z.string().optional(),
  primaryContactName: z.string().min(1, "Primary contact name is required"),
  primaryContactDesignation: z.string().optional(),
  primaryContactMobile: z.string().min(1, "Primary contact mobile is required"),
  primaryContactEmail: z.string().email("Invalid email address"),
  accountsContactName: z.string().optional(),
  accountsContactMobile: z.string().optional(),
  accountsContactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Brand color must be a valid hex color").optional(),
});

export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfile.$inferSelect;

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  quotationNumber: text("quotation_number").notNull(),
  quotationDate: timestamp("quotation_date").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "restrict" }),
  leadName: text("lead_name").notNull(),
  leadEmail: text("lead_email").notNull(),
  leadMobile: text("lead_mobile").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  totalDiscount: decimal("total_discount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 15, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).notNull().default("0"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuotationSchema = createInsertSchema(quotations).pick({
  quotationNumber: true,
  quotationDate: true,
  validUntil: true,
  leadId: true,
  leadName: true,
  leadEmail: true,
  leadMobile: true,
  subtotal: true,
  totalDiscount: true,
  totalTax: true,
  grandTotal: true,
  termsAndConditions: true,
}).extend({
  quotationNumber: z.string().min(1, "Quotation number is required"),
  quotationDate: z.string().min(1, "Quotation date is required"),
  validUntil: z.string().min(1, "Valid until date is required"),
  leadId: z.string().min(1, "Lead is required"),
  leadName: z.string().min(1, "Lead name is required"),
  leadEmail: z.string().email("Invalid email address"),
  leadMobile: z.string().min(1, "Mobile is required"),
  subtotal: z.string().optional(),
  totalDiscount: z.string().optional(),
  totalTax: z.string().optional(),
  grandTotal: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;

// Quotation Items table
export const quotationItems = pgTable("quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  quotationId: varchar("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").references(() => masterItems.id),
  itemName: text("item_name").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  rate: decimal("rate", { precision: 15, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  displayOrder: text("display_order").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).pick({
  quotationId: true,
  itemId: true,
  itemName: true,
  quantity: true,
  unit: true,
  rate: true,
  discountPercent: true,
  taxPercent: true,
  amount: true,
  displayOrder: true,
}).extend({
  quotationId: z.string().min(1, "Quotation ID is required"),
  itemId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Quantity must be a valid positive number",
  }),
  unit: z.string().min(1, "Unit is required"),
  rate: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Rate must be a valid number",
  }),
  discountPercent: z.string().optional(),
  taxPercent: z.string().optional(),
  amount: z.string().optional(),
  displayOrder: z.string().optional(),
});

export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;

// Quotation Settings table (for Terms & Conditions)
export const quotationSettings = pgTable("quotation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  termsAndConditions: text("terms_and_conditions").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuotationSettingsSchema = createInsertSchema(quotationSettings).pick({
  termsAndConditions: true,
}).extend({
  termsAndConditions: z.string().min(1, "Terms and conditions are required"),
});

export type InsertQuotationSettings = z.infer<typeof insertQuotationSettingsSchema>;
export type QuotationSettings = typeof quotationSettings.$inferSelect;

// Proforma Invoices table
export const proformaInvoices = pgTable("proforma_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  quotationId: varchar("quotation_id").references(() => quotations.id, { onDelete: "restrict" }),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "restrict" }),
  leadName: text("lead_name").notNull(),
  leadEmail: text("lead_email").notNull(),
  leadMobile: text("lead_mobile").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  totalDiscount: decimal("total_discount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalTax: decimal("total_tax", { precision: 15, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).notNull().default("0"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProformaInvoiceSchema = createInsertSchema(proformaInvoices).pick({
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  quotationId: true,
  leadId: true,
  leadName: true,
  leadEmail: true,
  leadMobile: true,
  subtotal: true,
  totalDiscount: true,
  totalTax: true,
  grandTotal: true,
  termsAndConditions: true,
}).extend({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  quotationId: z.string().optional(),
  leadId: z.string().min(1, "Lead is required"),
  leadName: z.string().min(1, "Lead name is required"),
  leadEmail: z.string().email("Invalid email address"),
  leadMobile: z.string().min(1, "Mobile is required"),
  subtotal: z.string().optional(),
  totalDiscount: z.string().optional(),
  totalTax: z.string().optional(),
  grandTotal: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

export type InsertProformaInvoice = z.infer<typeof insertProformaInvoiceSchema>;
export type ProformaInvoice = typeof proformaInvoices.$inferSelect;

// Proforma Invoice Items table
export const proformaInvoiceItems = pgTable("proforma_invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").notNull().references(() => proformaInvoices.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").references(() => masterItems.id),
  itemName: text("item_name").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  rate: decimal("rate", { precision: 15, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  displayOrder: text("display_order").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProformaInvoiceItemSchema = createInsertSchema(proformaInvoiceItems).pick({
  invoiceId: true,
  itemId: true,
  itemName: true,
  quantity: true,
  unit: true,
  rate: true,
  discountPercent: true,
  taxPercent: true,
  amount: true,
  displayOrder: true,
}).extend({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  itemId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Quantity must be a valid positive number",
  }),
  unit: z.string().min(1, "Unit is required"),
  rate: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Rate must be a valid number",
  }),
  discountPercent: z.string().optional(),
  taxPercent: z.string().optional(),
  amount: z.string().optional(),
  displayOrder: z.string().optional(),
});

export type InsertProformaInvoiceItem = z.infer<typeof insertProformaInvoiceItemSchema>;
export type ProformaInvoiceItem = typeof proformaInvoiceItems.$inferSelect;

// Debtors Follow-ups table
export const debtorsFollowUps = pgTable("debtors_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => masterCustomers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Meeting, Call, WhatsApp, Email
  remarks: text("remarks").notNull(),
  followUpDateTime: timestamp("follow_up_date_time").notNull(),
  priority: text("priority").notNull(), // High, Medium, Low
  status: text("status").notNull().default("Pending"), // Pending, Completed, Cancelled
  nextFollowUpDate: timestamp("next_follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDebtorsFollowUpSchema = createInsertSchema(debtorsFollowUps).pick({
  customerId: true,
  type: true,
  remarks: true,
  followUpDateTime: true,
  priority: true,
  status: true,
  nextFollowUpDate: true,
}).extend({
  customerId: z.string().min(1, "Customer ID is required"),
  type: z.enum(["Meeting", "Call", "WhatsApp", "Email"], {
    errorMap: () => ({ message: "Type must be Meeting, Call, WhatsApp, or Email" }),
  }),
  remarks: z.string().min(1, "Remarks are required"),
  followUpDateTime: z.string().min(1, "Follow-up date and time are required"),
  priority: z.enum(["High", "Medium", "Low"], {
    errorMap: () => ({ message: "Priority must be High, Medium, or Low" }),
  }),
  status: z.enum(["Pending", "Completed", "Cancelled"]).default("Pending"),
  nextFollowUpDate: z.string().optional(),
});

export type InsertDebtorsFollowUp = z.infer<typeof insertDebtorsFollowUpSchema>;
export type DebtorsFollowUp = typeof debtorsFollowUps.$inferSelect;

// Roles table for RBAC
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRolePerTenant: sql`CONSTRAINT unique_role_per_tenant UNIQUE (tenant_id, name)`,
}));

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  permissions: true,
}).extend({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Users table for user management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // Nullable for platform admins
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  mobile: text("mobile"),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "set null" }),
  status: text("status").notNull().default("Active"), // Active, Inactive
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  mobile: true,
  roleId: true,
  status: true,
  password: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits").optional().or(z.literal("")),
  roleId: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  password: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect & {
  roleName?: string | null;
};

// Email Configuration table
// Note: tenantId is nullable to allow platform-level email config (null = platform admin)
export const emailConfigs = pgTable("email_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // gmail, smtp
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  gmailAccessToken: text("gmail_access_token"),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailTokenExpiry: timestamp("gmail_token_expiry"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull(),
  isActive: text("is_active").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailConfigSchema = createInsertSchema(emailConfigs).pick({
  provider: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  gmailAccessToken: true,
  gmailRefreshToken: true,
  gmailTokenExpiry: true,
  fromEmail: true,
  fromName: true,
  isActive: true,
}).extend({
  provider: z.enum(["gmail", "smtp"]),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  gmailAccessToken: z.string().optional(),
  gmailRefreshToken: z.string().optional(),
  gmailTokenExpiry: z.date().optional(),
  fromEmail: z.string().email("Invalid email address"),
  fromName: z.string().min(1, "From name is required"),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type EmailConfig = typeof emailConfigs.$inferSelect;

// Email Templates table
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  module: text("module").notNull(), // leads, quotations, proforma_invoices, invoices, receipts, debtors, credit_management
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  variables: text("variables").array().notNull().default(sql`ARRAY[]::text[]`),
  isDefault: text("is_default").notNull().default("No"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  module: true,
  name: true,
  subject: true,
  body: true,
  variables: true,
  isDefault: true,
}).extend({
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management"]),
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  variables: z.array(z.string()).default([]),
  isDefault: z.enum(["Yes", "No"]).default("No"),
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// WhatsApp Configuration table
export const whatsappConfigs = pgTable("whatsapp_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // twilio, wati, meta, interakt, aisensy
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret"),
  accountSid: text("account_sid"), // For Twilio
  phoneNumberId: text("phone_number_id"), // For Meta WhatsApp Business API
  businessAccountId: text("business_account_id"), // For Meta
  fromNumber: text("from_number").notNull(), // WhatsApp number in format +1234567890
  apiUrl: text("api_url"), // Custom API endpoint URL
  isActive: text("is_active").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWhatsappConfigSchema = createInsertSchema(whatsappConfigs).pick({
  provider: true,
  apiKey: true,
  apiSecret: true,
  accountSid: true,
  phoneNumberId: true,
  businessAccountId: true,
  fromNumber: true,
  apiUrl: true,
  isActive: true,
}).extend({
  provider: z.enum(["twilio", "wati", "meta", "interakt", "aisensy", "other"]),
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().optional(),
  accountSid: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
  fromNumber: z.string().min(1, "WhatsApp number is required").regex(/^\+\d{1,15}$/, "Must be in format +1234567890"),
  apiUrl: z.string().url("Must be a valid URL").optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;
export type WhatsappConfig = typeof whatsappConfigs.$inferSelect;

// WhatsApp Message Templates table
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  module: text("module").notNull(), // leads, quotations, proforma_invoices, invoices, receipts, debtors, credit_management
  name: text("name").notNull(),
  message: text("message").notNull(),
  variables: text("variables").array().notNull().default(sql`ARRAY[]::text[]`),
  isDefault: text("is_default").notNull().default("No"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).pick({
  module: true,
  name: true,
  message: true,
  variables: true,
  isDefault: true,
}).extend({
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management"]),
  name: z.string().min(1, "Template name is required"),
  message: z.string().min(1, "Message is required"),
  variables: z.array(z.string()).default([]),
  isDefault: z.enum(["Yes", "No"]).default("No"),
});

export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;

// Ringg.ai Configuration table
export const ringgConfigs = pgTable("ringg_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  apiKey: text("api_key").notNull(),
  fromNumber: text("from_number").notNull(),
  webhookUrl: text("webhook_url"),
  isActive: text("is_active").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRinggConfigSchema = createInsertSchema(ringgConfigs).pick({
  apiKey: true,
  fromNumber: true,
  webhookUrl: true,
  isActive: true,
}).extend({
  apiKey: z.string().min(1, "API key is required"),
  fromNumber: z.string().min(1, "From Number is required").regex(/^\+\d{1,15}$/, "Must be in format +1234567890"),
  webhookUrl: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertRinggConfig = z.infer<typeof insertRinggConfigSchema>;
export type RinggConfig = typeof ringgConfigs.$inferSelect;

// Call Script Mappings table
export const callScriptMappings = pgTable("call_script_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  module: text("module").notNull(), // leads, quotations, proforma_invoices, invoices, receipts, debtors, credit_management
  scriptName: text("script_name").notNull(),
  ringgScriptId: text("ringg_script_id").notNull(),
  description: text("description"),
  isActive: text("is_active").notNull().default("Active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCallScriptMappingSchema = createInsertSchema(callScriptMappings).pick({
  module: true,
  scriptName: true,
  ringgScriptId: true,
  description: true,
  isActive: true,
}).extend({
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management"]),
  scriptName: z.string().min(1, "Script name is required"),
  ringgScriptId: z.string().min(1, "Ringg.ai Script ID is required"),
  description: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertCallScriptMapping = z.infer<typeof insertCallScriptMappingSchema>;
export type CallScriptMapping = typeof callScriptMappings.$inferSelect;

// Call Logs table
export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id"),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  module: text("module").notNull(), // leads, quotations, proforma_invoices, invoices, receipts, debtors, credit_management
  scriptId: varchar("script_id").references(() => callScriptMappings.id),
  ringgCallId: text("ringg_call_id"),
  status: text("status").notNull().default("initiated"), // initiated, ringing, answered, completed, failed, busy, no_answer
  duration: integer("duration"), // in seconds
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  outcome: text("outcome"), // payment_promised, callback_requested, not_interested, wrong_number, etc.
  notes: text("notes"),
  callContext: text("call_context"), // JSON string with invoice number, amount, etc.
  initiatedBy: varchar("initiated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCallLogSchema = createInsertSchema(callLogs).pick({
  customerId: true,
  customerName: true,
  phoneNumber: true,
  module: true,
  scriptId: true,
  ringgCallId: true,
  status: true,
  duration: true,
  recordingUrl: true,
  transcript: true,
  outcome: true,
  notes: true,
  callContext: true,
  initiatedBy: true,
}).extend({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management"]),
  scriptId: z.string().optional(),
  ringgCallId: z.string().optional(),
  status: z.enum(["initiated", "ringing", "answered", "completed", "failed", "busy", "no_answer"]).default("initiated"),
  duration: z.number().optional(),
  recordingUrl: z.string().optional(),
  transcript: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  callContext: z.string().optional(),
  initiatedBy: z.string().optional(),
});


export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

// Communication Schedules table
export const communicationSchedules = pgTable("communication_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  communicationType: text("communication_type").notNull(),
  frequency: text("frequency").notNull(),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  timeOfDay: text("time_of_day"),
  filterCondition: text("filter_condition"),
  scriptId: varchar("script_id").references(() => callScriptMappings.id),
  emailTemplateId: varchar("email_template_id").references(() => emailTemplates.id),
  message: text("message"),
  isActive: text("is_active").notNull().default("Active"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommunicationScheduleSchema = createInsertSchema(communicationSchedules).pick({
  module: true,
  communicationType: true,
  frequency: true,
  dayOfWeek: true,
  dayOfMonth: true,
  timeOfDay: true,
  filterCondition: true,
  scriptId: true,
  emailTemplateId: true,
  message: true,
  isActive: true,
}).extend({
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management"]),
  communicationType: z.enum(["call", "email", "whatsapp"]),
  frequency: z.enum(["once", "daily", "weekly", "monthly"]),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  filterCondition: z.string().optional(),
  scriptId: z.string().optional(),
  emailTemplateId: z.string().optional(),
  message: z.string().optional(),
  isActive: z.enum(["Active", "Inactive"]).default("Active"),
});

export type InsertCommunicationSchedule = z.infer<typeof insertCommunicationScheduleSchema>;
export type CommunicationSchedule = typeof communicationSchedules.$inferSelect;

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

