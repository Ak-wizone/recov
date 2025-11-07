import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Multi-Tenant Tables

// Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly, annual, lifetime
  allowedModules: text("allowed_modules").array().notNull(),
  color: text("color").notNull().default("#3B82F6"), // For UI badges
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  billingCycle: z.enum(["monthly", "annual", "lifetime"]),
  allowedModules: z.array(z.string()).min(1, "At least one module must be selected"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  email: text("email").notNull().unique(),
  mobileNumber: text("mobile_number"),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  pincode: text("pincode").notNull(),
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  industryType: text("industry_type"),
  planType: text("plan_type").notNull(), // Legacy field, kept for backward compatibility
  subscriptionPlanId: varchar("subscription_plan_id").references(() => subscriptionPlans.id),
  allowedModules: text("allowed_modules").array(), // Effective modules from subscription plan
  customModules: text("custom_modules").array(), // Override plan modules if needed
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

export const updateTenantProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits").optional().or(z.literal("")),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional().or(z.literal("")),
  pincode: z.string().min(1, "Pincode is required"),
  panNumber: z.string().optional().or(z.literal("")),
  gstNumber: z.string().optional().or(z.literal("")),
  industryType: z.string().optional().or(z.literal("")),
});

export type UpdateTenantProfile = z.infer<typeof updateTenantProfileSchema>;

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
  mobileNumber: text("mobile_number"),
  businessAddress: text("business_address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  pincode: text("pincode").notNull(),
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  industryType: text("industry_type"),
  planType: text("plan_type").notNull(),
  selectedPlanId: varchar("selected_plan_id").references(() => subscriptionPlans.id),
  existingAccountingSoftware: text("existing_accounting_software"),
  paymentMethod: text("payment_method").notNull(),
  paymentReceiptUrl: text("payment_receipt_url"),
  paymentStatus: text("payment_status").default("pending"), // pending, success, failed
  paymentId: text("payment_id"),
  transactionId: text("transaction_id"),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }),
  paymentTimestamp: timestamp("payment_timestamp"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  tenantId: varchar("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  rejectionReason: text("rejection_reason"),
});

export const insertRegistrationRequestSchema = createInsertSchema(registrationRequests).pick({
  businessName: true,
  email: true,
  mobileNumber: true,
  businessAddress: true,
  city: true,
  state: true,
  pincode: true,
  panNumber: true,
  gstNumber: true,
  industryType: true,
  planType: true,
  selectedPlanId: true,
  existingAccountingSoftware: true,
  paymentMethod: true,
  paymentReceiptUrl: true,
}).extend({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
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
  selectedPlanId: z.string().min(1, "Plan selection is required"),
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
  gp: decimal("gp", { precision: 15, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }),
  finalGp: decimal("final_gp", { precision: 15, scale: 2 }),
  finalGpPercentage: decimal("final_gp_percentage", { precision: 5, scale: 2 }),
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
  gp: true,
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
  gp: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "G.P. must be a valid number",
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
  // Field-level permissions
  canViewGP: boolean("can_view_gp").notNull().default(false), // Can view Gross Profit columns in Invoice module
  // Action permissions for communication and other actions
  canSendEmail: boolean("can_send_email").notNull().default(true),
  canSendWhatsApp: boolean("can_send_whatsapp").notNull().default(true),
  canSendSMS: boolean("can_send_sms").notNull().default(true),
  canTriggerCall: boolean("can_trigger_call").notNull().default(true),
  canSendReminder: boolean("can_send_reminder").notNull().default(true),
  canShareDocuments: boolean("can_share_documents").notNull().default(true),
  // Dashboard card visibility permissions (array of allowed card IDs)
  allowedDashboardCards: text("allowed_dashboard_cards").array().notNull().default(sql`ARRAY['revenue', 'collections', 'outstanding', 'interest', 'invoices', 'receipts', 'customers', 'debtors', 'recent-activity', 'charts']::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRolePerTenant: sql`CONSTRAINT unique_role_per_tenant UNIQUE (tenant_id, name)`,
}));

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  permissions: true,
  canViewGP: true,
  canSendEmail: true,
  canSendWhatsApp: true,
  canSendSMS: true,
  canTriggerCall: true,
  canSendReminder: true,
  canShareDocuments: true,
  allowedDashboardCards: true,
}).extend({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  canViewGP: z.boolean().default(false),
  canSendEmail: z.boolean().default(true),
  canSendWhatsApp: z.boolean().default(true),
  canSendSMS: z.boolean().default(true),
  canTriggerCall: z.boolean().default(true),
  canSendReminder: z.boolean().default(true),
  canShareDocuments: z.boolean().default(true),
  allowedDashboardCards: z.array(z.string()).default(['revenue', 'collections', 'outstanding', 'interest', 'invoices', 'receipts', 'customers', 'debtors', 'recent-activity', 'charts']),
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// User Column Preferences table for saving column visibility per user per module
export const userColumnPreferences = pgTable("user_column_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleName: text("module_name").notNull(), // e.g., "invoices", "receipts", "debtors"
  visibleColumns: text("visible_columns").array().notNull(), // Array of column keys that should be visible
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserModule: sql`CONSTRAINT unique_user_module UNIQUE (user_id, module_name)`,
}));

export const insertUserColumnPreferenceSchema = createInsertSchema(userColumnPreferences).pick({
  moduleName: true,
  visibleColumns: true,
}).extend({
  moduleName: z.string().min(1, "Module name is required"),
  visibleColumns: z.array(z.string()).min(1, "At least one column must be visible"),
});

export type InsertUserColumnPreference = z.infer<typeof insertUserColumnPreferenceSchema>;
export type UserColumnPreference = typeof userColumnPreferences.$inferSelect;

// Users table for user management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // Nullable for platform admins
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  mobile: text("mobile"),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "set null" }),
  isAdmin: boolean("is_admin").notNull().default(false), // Primary tenant admin with locked full permissions
  status: text("status").notNull().default("Active"), // Active, Inactive
  password: text("password"),
  lastLoginAt: timestamp("last_login_at"), // Track user activity for platform statistics
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
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management", "followup_automation"]),
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
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management", "followup_automation"]),
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
  module: z.enum(["leads", "quotations", "proforma_invoices", "invoices", "receipts", "debtors", "credit_management", "followup_automation"]),
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

// ==================== CREDIT CONTROL / RECOVERY MANAGEMENT TABLES ====================

// Category Rules - Payment delay thresholds for auto-upgrade (cumulative grace periods)
export const categoryRules = pgTable("category_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  alphaDays: integer("alpha_days").notNull().default(5), // Grace period: 0-5 days = Alpha
  betaDays: integer("beta_days").notNull().default(20), // Grace period: 6-25 days (5+20) = Beta
  gammaDays: integer("gamma_days").notNull().default(40), // Grace period: 26-65 days (5+20+40) = Gamma
  deltaDays: integer("delta_days").notNull().default(100), // Grace period: 66+ days = Delta
  partialPaymentThresholdPercent: integer("partial_payment_threshold_percent").notNull().default(80), // Exclude invoices with payment >= 80%
  graceDays: integer("grace_days").notNull().default(7), // Days after invoice due date that counts as grace period (for Paid On Time / In Grace)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCategoryRulesSchema = createInsertSchema(categoryRules).pick({
  alphaDays: true,
  betaDays: true,
  gammaDays: true,
  deltaDays: true,
  partialPaymentThresholdPercent: true,
  graceDays: true,
}).extend({
  alphaDays: z.number().min(0).max(1000),
  betaDays: z.number().min(0).max(1000),
  gammaDays: z.number().min(0).max(1000),
  deltaDays: z.number().min(0).max(1000),
  partialPaymentThresholdPercent: z.number().min(0).max(100),
  graceDays: z.number().min(0).max(365),
});

export type InsertCategoryRules = z.infer<typeof insertCategoryRulesSchema>;
export type CategoryRules = typeof categoryRules.$inferSelect;

// Follow-up Rules - Follow-up thresholds per category
export const followupRules = pgTable("followup_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  alphaDays: integer("alpha_days").notNull().default(7), // Alpha: follow up after 7 days
  betaDays: integer("beta_days").notNull().default(4), // Beta: follow up after 4 days
  gammaDays: integer("gamma_days").notNull().default(2), // Gamma: follow up after 2 days
  deltaDays: integer("delta_days").notNull().default(1), // Delta: follow up daily
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFollowupRulesSchema = createInsertSchema(followupRules).pick({
  alphaDays: true,
  betaDays: true,
  gammaDays: true,
  deltaDays: true,
}).extend({
  alphaDays: z.number().min(0).max(365),
  betaDays: z.number().min(0).max(365),
  gammaDays: z.number().min(0).max(365),
  deltaDays: z.number().min(0).max(365),
});

export type InsertFollowupRules = z.infer<typeof insertFollowupRulesSchema>;
export type FollowupRules = typeof followupRules.$inferSelect;

// Recovery Settings - Auto/manual mode toggle
export const recoverySettings = pgTable("recovery_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  autoUpgradeEnabled: boolean("auto_upgrade_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecoverySettingsSchema = createInsertSchema(recoverySettings).pick({
  autoUpgradeEnabled: true,
}).extend({
  autoUpgradeEnabled: z.boolean(),
});

export type InsertRecoverySettings = z.infer<typeof insertRecoverySettingsSchema>;
export type RecoverySettings = typeof recoverySettings.$inferSelect;

// Category Change Log - Audit trail of category changes
export const categoryChangeLog = pgTable("category_change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  oldCategory: text("old_category").notNull(), // Alpha, Beta, Gamma, Delta
  newCategory: text("new_category").notNull(),
  changeType: text("change_type").notNull(), // auto, manual
  changedBy: varchar("changed_by"), // user ID if manual, null if auto
  reason: text("reason"), // e.g., "Overdue 15 days", "Manual override by admin"
  daysOverdue: integer("days_overdue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategoryChangeLogSchema = createInsertSchema(categoryChangeLog).pick({
  customerId: true,
  customerName: true,
  oldCategory: true,
  newCategory: true,
  changeType: true,
  changedBy: true,
  reason: true,
  daysOverdue: true,
}).extend({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  oldCategory: z.enum(["Alpha", "Beta", "Gamma", "Delta"]),
  newCategory: z.enum(["Alpha", "Beta", "Gamma", "Delta"]),
  changeType: z.enum(["auto", "manual"]),
  changedBy: z.string().optional(),
  reason: z.string().optional(),
  daysOverdue: z.number().optional(),
});

export type InsertCategoryChangeLog = z.infer<typeof insertCategoryChangeLogSchema>;
export type CategoryChangeLog = typeof categoryChangeLog.$inferSelect;

// Payment Patterns - Customer payment behavior tracking
export const paymentPatterns = pgTable("payment_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  totalInvoices: integer("total_invoices").notNull().default(0),
  onTimeCount: integer("on_time_count").notNull().default(0),
  lateCount: integer("late_count").notNull().default(0),
  avgDelayDays: decimal("avg_delay_days", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentScore: integer("payment_score").notNull().default(0), // 0-100
  paymentClassification: text("payment_classification").notNull().default("Regular"), // Star, Regular, Risky, Critical
  highestCategoryReached: text("highest_category_reached").notNull().default("Alpha"), // Alpha, Beta, Gamma, Delta
  alphaDays: integer("alpha_days").notNull().default(0),
  betaDays: integer("beta_days").notNull().default(0),
  gammaDays: integer("gamma_days").notNull().default(0),
  deltaDays: integer("delta_days").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0), // Consecutive on-time payments
  longestDelay: integer("longest_delay").notNull().default(0), // Maximum days overdue
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentPatternSchema = createInsertSchema(paymentPatterns).pick({
  customerId: true,
  customerName: true,
  totalInvoices: true,
  onTimeCount: true,
  lateCount: true,
  avgDelayDays: true,
  paymentScore: true,
  paymentClassification: true,
  highestCategoryReached: true,
  alphaDays: true,
  betaDays: true,
  gammaDays: true,
  deltaDays: true,
  currentStreak: true,
  longestDelay: true,
}).extend({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  totalInvoices: z.number().int().min(0).default(0),
  onTimeCount: z.number().int().min(0).default(0),
  lateCount: z.number().int().min(0).default(0),
  avgDelayDays: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid delay days format").default("0"),
  paymentScore: z.number().int().min(0).max(100).default(0),
  paymentClassification: z.enum(["Star", "Regular", "Risky", "Critical"]).default("Regular"),
  highestCategoryReached: z.enum(["Alpha", "Beta", "Gamma", "Delta"]).default("Alpha"),
  alphaDays: z.number().int().min(0).default(0),
  betaDays: z.number().int().min(0).default(0),
  gammaDays: z.number().int().min(0).default(0),
  deltaDays: z.number().int().min(0).default(0),
  currentStreak: z.number().int().min(0).default(0),
  longestDelay: z.number().int().min(0).default(0),
});

export type InsertPaymentPattern = z.infer<typeof insertPaymentPatternSchema>;
export type PaymentPattern = typeof paymentPatterns.$inferSelect;

// Legal Notice Templates - 5 template types with variable support
export const legalNoticeTemplates = pgTable("legal_notice_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  noticeNumber: integer("notice_number").notNull(), // 1-5
  title: text("title").notNull(), // e.g., "First Reminder", "Final Warning"
  subject: text("subject").notNull(), // Email subject with variables
  body: text("body").notNull(), // Template content with {{variables}}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLegalNoticeTemplateSchema = createInsertSchema(legalNoticeTemplates).pick({
  noticeNumber: true,
  title: true,
  subject: true,
  body: true,
}).extend({
  noticeNumber: z.number().min(1).max(5),
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
});

export type InsertLegalNoticeTemplate = z.infer<typeof insertLegalNoticeTemplateSchema>;
export type LegalNoticeTemplate = typeof legalNoticeTemplates.$inferSelect;

// Legal Notices Sent - History of sent notices
export const legalNoticesSent = pgTable("legal_notices_sent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => legalNoticeTemplates.id),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  invoiceId: varchar("invoice_id"),
  invoiceNumber: text("invoice_number"),
  sentVia: text("sent_via").notNull(), // email, whatsapp, both
  recipientEmail: text("recipient_email"),
  recipientMobile: text("recipient_mobile"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentBy: varchar("sent_by").notNull(), // user ID
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertLegalNoticeSentSchema = createInsertSchema(legalNoticesSent).pick({
  templateId: true,
  customerId: true,
  customerName: true,
  invoiceId: true,
  invoiceNumber: true,
  sentVia: true,
  recipientEmail: true,
  recipientMobile: true,
  subject: true,
  body: true,
  sentBy: true,
}).extend({
  templateId: z.string().min(1, "Template ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  invoiceId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  sentVia: z.enum(["email", "whatsapp", "both"]),
  recipientEmail: z.string().email().optional(),
  recipientMobile: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  sentBy: z.string().min(1, "Sender ID is required"),
});

export type InsertLegalNoticeSent = z.infer<typeof insertLegalNoticeSentSchema>;
export type LegalNoticeSent = typeof legalNoticesSent.$inferSelect;

// Follow-up Automation Settings - Configuration for automated reminders
export const followupAutomationSettings = pgTable("followup_automation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Scheduling Mode: fixed_frequency, before_due, after_due, weekly, monthly
  schedulingMode: text("scheduling_mode").notNull().default("after_due"),
  
  // Category-wise actions (JSON: { alpha: { whatsapp: true, email: true, ivr: false }, beta: {...}, ... })
  categoryActions: text("category_actions").notNull().default('{"alpha":{"whatsapp":false,"email":false,"ivr":false},"beta":{"whatsapp":true,"email":true,"ivr":false},"gamma":{"whatsapp":true,"email":true,"ivr":true},"delta":{"whatsapp":true,"email":true,"ivr":true}}'),
  
  // For weekly mode: day of week (0-6, 0 = Sunday)
  weeklyDay: integer("weekly_day"),
  
  // For monthly mode: day of month (1-31)
  monthlyDate: integer("monthly_date"),
  
  // For before_due mode: days before due date
  daysBeforeDue: integer("days_before_due"),
  
  // IVR/Calling settings
  enableIvrCalling: boolean("enable_ivr_calling").notNull().default(false),
  callingHoursStart: text("calling_hours_start").default("09:00"),
  callingHoursEnd: text("calling_hours_end").default("18:00"),
  maxRetriesPerDay: integer("max_retries_per_day").default(3),
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFollowupAutomationSettingsSchema = createInsertSchema(followupAutomationSettings).pick({
  schedulingMode: true,
  categoryActions: true,
  weeklyDay: true,
  monthlyDate: true,
  daysBeforeDue: true,
  enableIvrCalling: true,
  callingHoursStart: true,
  callingHoursEnd: true,
  maxRetriesPerDay: true,
}).extend({
  schedulingMode: z.enum(["fixed_frequency", "before_due", "after_due", "weekly", "monthly"]),
  categoryActions: z.string(),
  weeklyDay: z.number().min(0).max(6).optional(),
  monthlyDate: z.number().min(1).max(31).optional(),
  daysBeforeDue: z.number().min(1).max(30).optional(),
  enableIvrCalling: z.boolean(),
  callingHoursStart: z.string().optional(),
  callingHoursEnd: z.string().optional(),
  maxRetriesPerDay: z.number().min(1).max(10).optional(),
});

export type InsertFollowupAutomationSettings = z.infer<typeof insertFollowupAutomationSettingsSchema>;
export type FollowupAutomationSettings = typeof followupAutomationSettings.$inferSelect;

// Follow-up Schedules - Multiple follow-up configurations
export const followupSchedules = pgTable("followup_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Schedule name/description
  name: text("name").notNull(),
  description: text("description"),
  
  // Trigger type: days_before_due, days_after_due, fixed_weekly, fixed_monthly
  triggerType: text("trigger_type").notNull().default("days_before_due"),
  
  // Timing value (e.g., 7 for "7 days before due", or 3 for "Day 3 of month")
  timingValue: integer("timing_value").notNull(),
  
  // For weekly: day of week (0-6, 0 = Sunday)
  weeklyDay: integer("weekly_day"),
  
  // Communication channels
  enableWhatsapp: boolean("enable_whatsapp").notNull().default(false),
  enableEmail: boolean("enable_email").notNull().default(false),
  enableIvr: boolean("enable_ivr").notNull().default(false),
  
  // Template/Script Mappings - Which templates to use when sending
  whatsappTemplateId: varchar("whatsapp_template_id"),
  emailTemplateId: varchar("email_template_id"),
  ivrScriptId: varchar("ivr_script_id"),
  
  // Category filter (comma-separated: "alpha,beta" or "all")
  categoryFilter: text("category_filter").default("all"),
  
  // Is this schedule active?
  isActive: boolean("is_active").notNull().default(true),
  
  // Order for display
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFollowupScheduleSchema = createInsertSchema(followupSchedules).pick({
  name: true,
  description: true,
  triggerType: true,
  timingValue: true,
  weeklyDay: true,
  enableWhatsapp: true,
  enableEmail: true,
  enableIvr: true,
  whatsappTemplateId: true,
  emailTemplateId: true,
  ivrScriptId: true,
  categoryFilter: true,
  isActive: true,
  displayOrder: true,
}).extend({
  name: z.string().min(1, "Schedule name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["days_before_due", "days_after_due", "fixed_weekly", "fixed_monthly"]),
  timingValue: z.number().min(1),
  weeklyDay: z.number().min(0).max(6).optional(),
  enableWhatsapp: z.boolean(),
  enableEmail: z.boolean(),
  enableIvr: z.boolean(),
  whatsappTemplateId: z.string().optional(),
  emailTemplateId: z.string().optional(),
  ivrScriptId: z.string().optional(),
  categoryFilter: z.string().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
}).refine(
  (data) => !data.enableWhatsapp || (data.whatsappTemplateId && data.whatsappTemplateId.length > 0),
  {
    message: "WhatsApp template is required when WhatsApp is enabled",
    path: ["whatsappTemplateId"],
  }
).refine(
  (data) => !data.enableEmail || (data.emailTemplateId && data.emailTemplateId.length > 0),
  {
    message: "Email template is required when Email is enabled",
    path: ["emailTemplateId"],
  }
).refine(
  (data) => !data.enableIvr || (data.ivrScriptId && data.ivrScriptId.length > 0),
  {
    message: "IVR script is required when IVR is enabled",
    path: ["ivrScriptId"],
  }
);

export type InsertFollowupSchedule = z.infer<typeof insertFollowupScheduleSchema>;
export type FollowupSchedule = typeof followupSchedules.$inferSelect;

// Tasks table - Daily action items and follow-up tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  customerId: varchar("customer_id"),
  customerName: text("customer_name"),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // call, email, meeting, follow_up, payment_reminder
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  assignedToUserId: varchar("assigned_to_user_id"),
  assignedToUserName: text("assigned_to_user_name"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdByUserName: text("created_by_user_name").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  customerId: true,
  customerName: true,
  title: true,
  description: true,
  type: true,
  status: true,
  priority: true,
  dueDate: true,
  assignedToUserId: true,
  assignedToUserName: true,
  createdByUserId: true,
  createdByUserName: true,
}).extend({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  type: z.enum(["call", "email", "meeting", "follow_up", "payment_reminder"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().optional(),
  assignedToUserId: z.string().optional(),
  assignedToUserName: z.string().optional(),
  createdByUserId: z.string(),
  createdByUserName: z.string(),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Activity Logs table - Customer interaction tracking
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  interactionType: text("interaction_type").notNull(), // call, email, meeting, whatsapp, visit
  outcome: text("outcome"), // promised_payment, no_answer, callback_requested, payment_done, dispute
  notes: text("notes"),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  loggedByUserId: varchar("logged_by_user_id").notNull(),
  loggedByUserName: text("logged_by_user_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  customerId: true,
  customerName: true,
  interactionType: true,
  outcome: true,
  notes: true,
  nextAction: true,
  nextActionDate: true,
  loggedByUserId: true,
  loggedByUserName: true,
}).extend({
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().min(1, "Customer name is required"),
  interactionType: z.enum(["call", "email", "meeting", "whatsapp", "visit"]),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  loggedByUserId: z.string(),
  loggedByUserName: z.string(),
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// User Metrics table - Daily performance tracking
export const userMetrics = pgTable("user_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  metricDate: timestamp("metric_date").notNull(), // Date for which metrics are calculated
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  callsMade: integer("calls_made").notNull().default(0),
  emailsSent: integer("emails_sent").notNull().default(0),
  meetingsHeld: integer("meetings_held").notNull().default(0),
  paymentsCollected: decimal("payments_collected", { precision: 15, scale: 2 }).notNull().default("0"),
  efficiencyScore: decimal("efficiency_score", { precision: 5, scale: 2 }).notNull().default("0"), // Calculated score
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserMetricSchema = createInsertSchema(userMetrics).pick({
  userId: true,
  userName: true,
  metricDate: true,
  tasksCompleted: true,
  callsMade: true,
  emailsSent: true,
  meetingsHeld: true,
  paymentsCollected: true,
  efficiencyScore: true,
}).extend({
  userId: z.string(),
  userName: z.string(),
  metricDate: z.string(),
  tasksCompleted: z.number().optional(),
  callsMade: z.number().optional(),
  emailsSent: z.number().optional(),
  meetingsHeld: z.number().optional(),
  paymentsCollected: z.string().optional(),
  efficiencyScore: z.string().optional(),
});

export type InsertUserMetric = z.infer<typeof insertUserMetricSchema>;
export type UserMetric = typeof userMetrics.$inferSelect;

// Daily Targets table - Collection and activity targets
export const dailyTargets = pgTable("daily_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id"), // Nullable - can be team-wide target
  userName: text("user_name"),
  targetDate: timestamp("target_date").notNull(),
  targetType: text("target_type").notNull(), // collection, calls, tasks, emails
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }), // For collection targets
  targetCount: integer("target_count"), // For activity count targets
  achievedAmount: decimal("achieved_amount", { precision: 15, scale: 2 }).default("0"),
  achievedCount: integer("achieved_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyTargetSchema = createInsertSchema(dailyTargets).pick({
  userId: true,
  userName: true,
  targetDate: true,
  targetType: true,
  targetAmount: true,
  targetCount: true,
}).extend({
  userId: z.string().optional(),
  userName: z.string().optional(),
  targetDate: z.string(),
  targetType: z.enum(["collection", "calls", "tasks", "emails"]),
  targetAmount: z.string().optional(),
  targetCount: z.number().optional(),
});

export type InsertDailyTarget = z.infer<typeof insertDailyTargetSchema>;
export type DailyTarget = typeof dailyTargets.$inferSelect;

// Notifications table - Real-time alerts and updates
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(), // User who receives the notification
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // task_assigned, task_due, payment_received, achievement, target_achieved
  relatedId: varchar("related_id"), // ID of related entity (task, customer, payment, etc.)
  relatedType: text("related_type"), // task, customer, payment, etc.
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  message: true,
  type: true,
  relatedId: true,
  relatedType: true,
}).extend({
  userId: z.string(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["task_assigned", "task_due", "payment_received", "achievement", "target_achieved"]),
  relatedId: z.string().optional(),
  relatedType: z.string().optional(),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Backup History table - Track backup and restore operations
export const backupHistory = pgTable("backup_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  operationType: text("operation_type").notNull(), // backup, restore
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // Size in bytes
  status: text("status").notNull().default("success"), // success, failed, in_progress
  recordsCount: integer("records_count"), // Total number of records in backup
  errorMessage: text("error_message"),
  performedBy: varchar("performed_by").notNull(), // User ID who performed the operation
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBackupHistorySchema = createInsertSchema(backupHistory).pick({
  operationType: true,
  fileName: true,
  fileSize: true,
  status: true,
  recordsCount: true,
  errorMessage: true,
  performedBy: true,
  performedByName: true,
}).extend({
  operationType: z.enum(["backup", "restore"]),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().optional(),
  status: z.enum(["success", "failed", "in_progress"]).default("success"),
  recordsCount: z.number().optional(),
  errorMessage: z.string().optional(),
  performedBy: z.string(),
  performedByName: z.string().optional(),
});

export type InsertBackupHistory = z.infer<typeof insertBackupHistorySchema>;
export type BackupHistory = typeof backupHistory.$inferSelect;

// Voice Assistant Tables

export const assistantChatHistory = pgTable("assistant_chat_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  userMessage: text("user_message").notNull(),
  assistantResponse: text("assistant_response").notNull(),
  commandType: text("command_type"), // query, action, info
  actionPerformed: text("action_performed"), // email_sent, whatsapp_sent, call_triggered, etc.
  resultData: text("result_data"), // JSON string of query results
  isVoiceInput: boolean("is_voice_input").notNull().default(true),
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // Speech recognition confidence
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssistantChatHistorySchema = createInsertSchema(assistantChatHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.string(),
  userId: z.string(),
  userMessage: z.string().min(1, "User message is required"),
  assistantResponse: z.string().min(1, "Assistant response is required"),
  commandType: z.enum(["query", "action", "info"]).optional(),
  actionPerformed: z.string().optional(),
  resultData: z.string().optional(),
  isVoiceInput: z.boolean().default(true),
  confidence: z.string().optional(),
});

export type InsertAssistantChatHistory = z.infer<typeof insertAssistantChatHistorySchema>;
export type AssistantChatHistory = typeof assistantChatHistory.$inferSelect;

export const assistantSettings = pgTable("assistant_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  alwaysListen: boolean("always_listen").notNull().default(false),
  wakeWord: text("wake_word").notNull().default("RECOV"),
  wakeWordSensitivity: integer("wake_word_sensitivity").notNull().default(5), // 1-10 scale
  voiceFeedback: boolean("voice_feedback").notNull().default(true),
  language: text("language").notNull().default("en-IN"), // en-IN for Indian English
  autoExecuteActions: boolean("auto_execute_actions").notNull().default(false), // Confirm before email/whatsapp
  showSuggestions: boolean("show_suggestions").notNull().default(true),
  theme: text("theme").notNull().default("light"), // light, dark
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAssistantSettingsSchema = createInsertSchema(assistantSettings).omit({
  id: true,
  updatedAt: true,
}).extend({
  tenantId: z.string(),
  userId: z.string(),
  alwaysListen: z.boolean().default(false),
  wakeWord: z.string().default("RECOV"),
  wakeWordSensitivity: z.number().min(1).max(10).default(5),
  voiceFeedback: z.boolean().default(true),
  language: z.string().default("en-IN"),
  autoExecuteActions: z.boolean().default(false),
  showSuggestions: z.boolean().default(true),
  theme: z.enum(["light", "dark"]).default("light"),
});

export type InsertAssistantSettings = z.infer<typeof insertAssistantSettingsSchema>;
export type AssistantSettings = typeof assistantSettings.$inferSelect;

export const assistantCommands = pgTable("assistant_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"), // null for global commands, specific for custom
  name: text("name").notNull(),
  description: text("description").notNull(),
  keywords: text("keywords").array().notNull(), // Trigger keywords
  category: text("category").notNull(), // reports, customers, invoices, communications, analytics
  commandType: text("command_type").notNull(), // query, action
  action: text("action"), // API endpoint or function to call
  responseTemplate: text("response_template"), // Template for response
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssistantCommandSchema = createInsertSchema(assistantCommands).omit({
  id: true,
  createdAt: true,
  usageCount: true,
}).extend({
  tenantId: z.string().optional(),
  name: z.string().min(1, "Command name is required"),
  description: z.string().min(1, "Description is required"),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  category: z.enum(["reports", "customers", "invoices", "communications", "analytics"]),
  commandType: z.enum(["query", "action"]),
  action: z.string().optional(),
  responseTemplate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type InsertAssistantCommand = z.infer<typeof insertAssistantCommandSchema>;
export type AssistantCommand = typeof assistantCommands.$inferSelect;

// Assistant Analytics Tracking
export const assistantAnalytics = pgTable("assistant_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  command: text("command").notNull(), // The actual command text
  normalizedCommand: text("normalized_command"), // Lowercase, trimmed version
  commandType: text("command_type"), // query, action, info
  isSuccess: boolean("is_success").notNull().default(true),
  errorMessage: text("error_message"), // Error details if failed
  responseTime: integer("response_time"), // Milliseconds
  isVoiceInput: boolean("is_voice_input").notNull().default(false),
  pageContext: text("page_context"), // Which page was user on
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssistantAnalyticsSchema = createInsertSchema(assistantAnalytics).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.string(),
  userId: z.string(),
  command: z.string().min(1, "Command is required"),
  normalizedCommand: z.string().optional(),
  commandType: z.enum(["query", "action", "info"]).optional(),
  isSuccess: z.boolean().default(true),
  errorMessage: z.string().optional(),
  responseTime: z.number().int().optional(),
  isVoiceInput: z.boolean().default(false),
  pageContext: z.string().optional(),
});

export type InsertAssistantAnalytics = z.infer<typeof insertAssistantAnalyticsSchema>;
export type AssistantAnalytics = typeof assistantAnalytics.$inferSelect;

