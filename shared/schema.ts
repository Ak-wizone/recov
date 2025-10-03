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
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
});

export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Master Items table (Products & Services)
export const masterItems = pgTable("master_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  invoiceAmount: decimal("invoice_amount", { precision: 15, scale: 2 }).notNull(),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("Unpaid"), // Paid, Unpaid, Partial
  assignedUser: text("assigned_user"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  invoiceNumber: true,
  customerName: true,
  invoiceDate: true,
  invoiceAmount: true,
  netProfit: true,
  status: true,
  assignedUser: true,
  remarks: true,
}).extend({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerName: z.string().min(1, "Customer name is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  invoiceAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Invoice amount must be a valid positive number",
  }),
  netProfit: z.string().refine((val) => !isNaN(parseFloat(val)), {
    message: "Net profit must be a valid number",
  }),
  status: z.enum(["Paid", "Unpaid", "Partial"], {
    errorMap: () => ({ message: "Status must be Paid, Unpaid, or Partial" }),
  }).default("Unpaid"),
  assignedUser: z.enum(["Manpreet Bedi", "Bilal Ahamad", "Anjali Dhiman", "Princi Soni"], {
    errorMap: () => ({ message: "Invalid assigned user" }),
  }).optional(),
  remarks: z.string().optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Receipts table
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucherNumber: text("voucher_number").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name").notNull(),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReceiptSchema = createInsertSchema(receipts).pick({
  voucherNumber: true,
  invoiceNumber: true,
  customerName: true,
  date: true,
  amount: true,
  remarks: true,
}).extend({
  voucherNumber: z.string().min(1, "Voucher number is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
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
});

export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfile.$inferSelect;
