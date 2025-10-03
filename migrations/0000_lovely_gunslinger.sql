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
	"assigned_user" text,
	"remarks" text,
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
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_master_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."master_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;