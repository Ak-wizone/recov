CREATE TABLE "company_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo" text,
	"legal_name" text NOT NULL,
	"entity_type" text NOT NULL,
	"gstin" text,
	"pan" text,
	"cin" text,
	"year_of_incorporation" text,
	"reg_address_line1" text NOT NULL,
	"reg_address_line2" text,
	"reg_city" text NOT NULL,
	"reg_state" text NOT NULL,
	"reg_pincode" text NOT NULL,
	"corp_address_line1" text,
	"corp_address_line2" text,
	"corp_city" text,
	"corp_state" text,
	"corp_pincode" text,
	"primary_contact_name" text NOT NULL,
	"primary_contact_designation" text,
	"primary_contact_mobile" text NOT NULL,
	"primary_contact_email" text NOT NULL,
	"accounts_contact_name" text,
	"accounts_contact_mobile" text,
	"accounts_contact_email" text,
	"bank_name" text,
	"branch_name" text,
	"account_name" text,
	"account_number" text,
	"ifsc_code" text,
	"brand_color" text DEFAULT '#ea580c',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"amount_owed" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"assigned_user" text,
	"mobile" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debtors_follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"type" text NOT NULL,
	"remarks" text NOT NULL,
	"follow_up_date_time" timestamp NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"next_follow_up_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"type" text NOT NULL,
	"remarks" text NOT NULL,
	"follow_up_date_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"invoice_amount" numeric(15, 2) NOT NULL,
	"net_profit" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'Unpaid' NOT NULL,
	"remarks" text,
	"category" text,
	"primary_mobile" text,
	"city" text,
	"pincode" text,
	"payment_terms" integer,
	"credit_limit" numeric(15, 2),
	"interest_applicable_from" text,
	"interest_rate" numeric(5, 2),
	"sales_person" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"type" text NOT NULL,
	"remarks" text NOT NULL,
	"follow_up_date_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_person" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text NOT NULL,
	"lead_source" text NOT NULL,
	"lead_status" text DEFAULT 'New Lead' NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"pincode" text,
	"remarks" text,
	"industry" text,
	"priority" text,
	"assigned_user" text,
	"estimated_deal_amount" numeric(15, 2),
	"customer_id" varchar,
	"date_created" timestamp DEFAULT now() NOT NULL,
	"last_follow_up" timestamp,
	"next_follow_up" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_name" text NOT NULL,
	"category" text NOT NULL,
	"billing_address" text,
	"city" text,
	"pincode" text,
	"state" text,
	"country" text,
	"gst_number" text,
	"pan_number" text,
	"msme_number" text,
	"incorporation_cert_number" text,
	"incorporation_date" timestamp,
	"company_type" text,
	"primary_contact_name" text,
	"primary_mobile" text,
	"primary_email" text,
	"secondary_contact_name" text,
	"secondary_mobile" text,
	"secondary_email" text,
	"payment_terms_days" text NOT NULL,
	"credit_limit" numeric(15, 2),
	"opening_balance" numeric(15, 2),
	"interest_applicable_from" text,
	"interest_rate" numeric(5, 2),
	"sales_person" text,
	"is_active" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text NOT NULL,
	"tax" text NOT NULL,
	"sku" text NOT NULL,
	"sale_unit_price" numeric(15, 2) NOT NULL,
	"buy_unit_price" numeric(15, 2),
	"opening_quantity" numeric(15, 2),
	"hsn" text,
	"sac" text,
	"is_active" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"receipt_number" text,
	"notes" text,
	"payment_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proforma_invoice_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"item_id" varchar,
	"item_name" text NOT NULL,
	"quantity" numeric(15, 2) NOT NULL,
	"unit" text NOT NULL,
	"rate" numeric(15, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"display_order" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proforma_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"quotation_id" varchar,
	"lead_id" varchar NOT NULL,
	"lead_name" text NOT NULL,
	"lead_email" text NOT NULL,
	"lead_mobile" text NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" varchar NOT NULL,
	"item_id" varchar,
	"item_name" text NOT NULL,
	"quantity" numeric(15, 2) NOT NULL,
	"unit" text NOT NULL,
	"rate" numeric(15, 2) NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"display_order" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terms_and_conditions" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_number" text NOT NULL,
	"quotation_date" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"lead_id" varchar NOT NULL,
	"lead_name" text NOT NULL,
	"lead_email" text NOT NULL,
	"lead_mobile" text NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_number" text NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"mobile" text,
	"role_id" varchar,
	"status" text DEFAULT 'Active' NOT NULL,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "debtors_follow_ups" ADD CONSTRAINT "debtors_follow_ups_customer_id_master_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."master_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_master_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."master_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_invoice_items" ADD CONSTRAINT "proforma_invoice_items_invoice_id_proforma_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_invoice_items" ADD CONSTRAINT "proforma_invoice_items_item_id_master_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."master_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_invoices" ADD CONSTRAINT "proforma_invoices_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proforma_invoices" ADD CONSTRAINT "proforma_invoices_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_item_id_master_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."master_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;