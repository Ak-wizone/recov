import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tenantMiddleware, adminOnlyMiddleware } from "./middleware";
import { requirePermission, requireAnyPermission } from "./permissions";
import { wsManager } from "./websocket";
import { insertCustomerSchema, insertPaymentSchema, insertFollowUpSchema, insertMasterCustomerSchema, insertMasterCustomerSchemaFlexible, insertMasterItemSchema, insertInvoiceSchema, insertReceiptSchema, insertLeadSchema, insertLeadFollowUpSchema, insertCompanyProfileSchema, insertQuotationSchema, insertQuotationItemSchema, insertQuotationSettingsSchema, insertProformaInvoiceSchema, insertProformaInvoiceItemSchema, insertDebtorsFollowUpSchema, insertRoleSchema, insertUserSchema, insertEmailConfigSchema, insertEmailTemplateSchema, insertWhatsappConfigSchema, insertWhatsappTemplateSchema, insertRinggConfigSchema, insertCallScriptMappingSchema, insertCallLogSchema, insertCategoryRulesSchema, insertFollowupRulesSchema, insertRecoverySettingsSchema, insertCategoryChangeLogSchema, insertLegalNoticeTemplateSchema, insertLegalNoticeSentSchema, insertFollowupAutomationSettingsSchema, insertFollowupScheduleSchema, insertSubscriptionPlanSchema, subscriptionPlans, invoices, insertRegistrationRequestSchema, registrationRequests, tenants, users, roles, passwordResetTokens, companyProfile, customers, receipts, assistantChatHistory, assistantAnalytics, updateTenantProfileSchema } from "@shared/schema";
import { createTransporter, sendEmail, testEmailConnection } from "./email-service";
import { getEnrichedEmailVariables, renderTemplate } from "./email-utils";
import { sendWhatsAppMessage } from "./whatsapp-service";
import { seedEmailTemplates } from "./seed-email-templates";
import { whatsappWebService } from "./whatsapp-web-service";
import { ringgService } from "./ringg-service";
import { sendSecureExcelFile } from "./excel-utils";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import OpenAI from "openai";
import { decryptApiKey } from "./encryption";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max (OpenAI limit)
  }
});

// Audio upload configuration for Whisper
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size (OpenAI Whisper limit)
  },
  fileFilter: (req, file, cb) => {
    // Validate audio MIME types
    const allowedMimes = [
      "audio/mpeg", // mp3
      "audio/mp4", // mp4, m4a
      "audio/wav", // wav
      "audio/webm", // webm
      "audio/ogg", // ogg
      "audio/flac", // flac
      "audio/x-wav", // wav alternative
      "audio/x-m4a", // m4a alternative
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio format. Supported: MP3, MP4, M4A, WAV, WebM, OGG, FLAC`));
    }
  }
});

// Centralized credential email template
const CREDENTIAL_EMAIL_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <h2 style="color: #333; margin-bottom: 20px;">Welcome to RECOV.</h2>
  <p style="color: #666; font-size: 16px;">Dear {companyName} Team,</p>
  <p style="color: #666; font-size: 16px;">Your account is now active and ready to use. Here are your login credentials:</p>
  
  <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
    <h3 style="margin-top: 0; color: #333; font-size: 18px;">Login Credentials</h3>
    <p style="margin: 10px 0; color: #444;"><strong>Email:</strong> {email}</p>
    <p style="margin: 10px 0; color: #444;"><strong>Temporary Password:</strong> {password}</p>
    <p style="margin: 10px 0; color: #444;"><strong>Login URL:</strong> <a href="{loginUrl}" style="color: #007bff; text-decoration: none;">{loginUrl}</a></p>
  </div>
  
  <h3 style="color: #333; font-size: 18px; margin-top: 30px;">Next Steps:</h3>
  <ol style="line-height: 2; color: #666; font-size: 16px; padding-left: 20px;">
    <li>Click the login link above</li>
    <li>Enter your email and temporary password</li>
    <li>Start managing your business with RECOV.</li>
  </ol>
  
  <p style="color: #666; font-size: 16px; margin-top: 30px;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="margin: 5px 0; color: #333;">Best regards,</p>
    <p style="margin: 5px 0; color: #333;"><strong>Team RECOV.</strong></p>
    <p style="margin: 15px 0; color: #666;"><strong>WIZONE IT NETWORK INDIA PVT LTD</strong></p>
    <p style="margin: 5px 0; color: #666;">📞 7500 22 33 55</p>
    <p style="margin: 5px 0; color: #666;">📞 9258 299 527</p>
    <p style="margin: 5px 0; color: #666;">📞 9258 299 518</p>
  </div>
</div>
`;

// Payment receipt email template
const PAYMENT_RECEIPT_EMAIL_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #28a745; margin: 0;">Payment Successful</h1>
    <p style="color: #666; font-size: 16px; margin-top: 10px;">Thank you for your payment!</p>
  </div>
  
  <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
    <h3 style="margin-top: 0; color: #333; font-size: 18px;">Payment Receipt</h3>
    <p style="margin: 10px 0; color: #444;"><strong>Business Name:</strong> {businessName}</p>
    <p style="margin: 10px 0; color: #444;"><strong>Email:</strong> {email}</p>
    <p style="margin: 10px 0; color: #444;"><strong>Transaction ID:</strong> {transactionId}</p>
    <p style="margin: 10px 0; color: #444;"><strong>Payment Date:</strong> {paymentDate}</p>
  </div>
  
  <div style="background-color: #ffffff; border: 2px solid #e0e0e0; padding: 25px; border-radius: 8px; margin: 25px 0;">
    <h3 style="margin-top: 0; color: #333; font-size: 18px;">Subscription Details</h3>
    <p style="margin: 10px 0; color: #444;"><strong>Plan:</strong> {planName}</p>
    <p style="margin: 10px 0; color: #444;"><strong>Billing Cycle:</strong> {billingCycle}</p>
    <p style="margin: 10px 0; color: #444; font-size: 20px;"><strong>Amount Paid:</strong> <span style="color: #28a745;">₹{amount}</span></p>
    {trialInfo}
  </div>
  
  <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
    <p style="margin: 0; color: #856404; font-size: 14px;">
      <strong>Note:</strong> This is a payment confirmation receipt, not a GST invoice. 
      Your login credentials have been sent in a separate email.
    </p>
  </div>
  
  <p style="color: #666; font-size: 16px; margin-top: 30px;">
    Your RECOV. account is now active. Check your inbox for login credentials to get started.
  </p>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="margin: 5px 0; color: #333;">Thank you for choosing RECOV.!</p>
    <p style="margin: 5px 0; color: #333;"><strong>Team RECOV.</strong></p>
    <p style="margin: 15px 0; color: #666;"><strong>WIZONE IT NETWORK INDIA PVT LTD</strong></p>
    <p style="margin: 5px 0; color: #666;">📞 7500 22 33 55</p>
    <p style="margin: 5px 0; color: #666;">📞 9258 299 527</p>
    <p style="margin: 5px 0; color: #666;">📞 9258 299 518</p>
  </div>
</div>
`;

// Helper function to send tenant credentials email
async function sendTenantCredentials(
  tenantBusinessName: string,
  tenantEmail: string,
  defaultPassword: string,
  loginUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get platform admin's email configuration (tenantId = null)
    const platformEmailConfig = await storage.getEmailConfig(null);
    
    if (!platformEmailConfig) {
      return {
        success: false,
        message: "Platform email configuration not found. Please set up platform admin email config first."
      };
    }

    // Render the email template
    const emailBody = renderTemplate(CREDENTIAL_EMAIL_TEMPLATE, {
      companyName: tenantBusinessName,
      email: tenantEmail,
      password: defaultPassword,
      loginUrl,
    });

    // Send the email
    await sendEmail(
      platformEmailConfig,
      tenantEmail,
      "Welcome to RECOV. - Your Login Credentials",
      emailBody
    );

    return {
      success: true,
      message: "Credentials email sent successfully"
    };
  } catch (error: any) {
    console.error("Failed to send tenant credentials email:", error);
    return {
      success: false,
      message: error.message || "Failed to send credentials email"
    };
  }
}

// Helper function to send payment receipt email
async function sendPaymentReceipt(
  businessName: string,
  email: string,
  transactionId: string,
  amount: string,
  planName: string,
  billingCycle: string,
  paymentDate: string,
  hasTrial: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // Get platform admin's email configuration (tenantId = null)
    const platformEmailConfig = await storage.getEmailConfig(null);
    
    if (!platformEmailConfig) {
      return {
        success: false,
        message: "Platform email configuration not found"
      };
    }

    // Render the email template (no trial period)
    const emailBody = renderTemplate(PAYMENT_RECEIPT_EMAIL_TEMPLATE, {
      businessName,
      email,
      transactionId,
      paymentDate,
      planName,
      billingCycle,
      amount: parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      trialInfo: '', // No trial period
    });

    // Send the email
    await sendEmail(
      platformEmailConfig,
      email,
      "Payment Successful - RECOV. Subscription Receipt",
      emailBody
    );

    return {
      success: true,
      message: "Payment receipt email sent successfully"
    };
  } catch (error: any) {
    console.error("Failed to send payment receipt email:", error);
    return {
      success: false,
      message: error.message || "Failed to send receipt email"
    };
  }
}

// PayU Payment Helper Functions
function generatePayUHash(data: Record<string, string>, salt: string): string {
  // PayU hash format: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
  // Note: 6 empty pipes (||||||) after udf5 before salt
  const hashString = `${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1 || ''}|${data.udf2 || ''}|${data.udf3 || ''}|${data.udf4 || ''}|${data.udf5 || ''}||||||${salt}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

function verifyPayUHash(data: Record<string, string>, salt: string, receivedHash: string): boolean {
  // Debug: Log UDF values
  console.log('UDF Values in callback:');
  console.log('udf1:', data.udf1, 'Type:', typeof data.udf1);
  console.log('udf2:', data.udf2, 'Type:', typeof data.udf2);
  console.log('udf3:', data.udf3, 'Type:', typeof data.udf3);
  console.log('udf4:', data.udf4, 'Type:', typeof data.udf4);
  console.log('udf5:', data.udf5, 'Type:', typeof data.udf5);
  
  // Reverse hash format for verification: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
  const hashString = `${salt}|${data.status}||||||${data.udf5 || ''}|${data.udf4 || ''}|${data.udf3 || ''}|${data.udf2 || ''}|${data.udf1 || ''}|${data.email}|${data.firstname}|${data.productinfo}|${data.amount}|${data.txnid}|${data.key}`;
  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  // Debug logging
  const debugHashString = `SALT|${data.status}||||||${data.udf5 || ''}|${data.udf4 || ''}|${data.udf3 || ''}|${data.udf2 || ''}|${data.udf1 || ''}|${data.email}|${data.firstname}|${data.productinfo}|${data.amount}|${data.txnid}|${data.key}`;
  console.log('Response Hash Debug:');
  console.log('Expected hash string format:', debugHashString);
  console.log('Calculated hash:', calculatedHash);
  console.log('Received hash:', receivedHash);
  console.log('Match:', calculatedHash === receivedHash);
  
  return calculatedHash === receivedHash;
}

// Module-to-Permission Mapping: Generate permissions based on allowed modules
function getPermissionsForModules(moduleNames: string[]): string[] {
  const modulePermissionMap: Record<string, string[]> = {
    "Business Overview": [
      "Business Overview - View",
    ],
    "Customer Analytics": [
      "Customer Analytics - View",
    ],
    "Leads": [
      "Leads - View", "Leads - Create", "Leads - Edit", "Leads - Delete", 
      "Leads - Export", "Leads - Import", "Leads - Print",
    ],
    "Quotations": [
      "Quotations - View", "Quotations - Create", "Quotations - Edit", "Quotations - Delete", 
      "Quotations - Export", "Quotations - Import", "Quotations - Print",
    ],
    "Proforma Invoices": [
      "Proforma Invoices - View", "Proforma Invoices - Create", "Proforma Invoices - Edit", "Proforma Invoices - Delete", 
      "Proforma Invoices - Export", "Proforma Invoices - Import", "Proforma Invoices - Print",
    ],
    "Invoices": [
      "Invoices - View", "Invoices - Create", "Invoices - Edit", "Invoices - Delete", 
      "Invoices - Export", "Invoices - Import", "Invoices - Print",
    ],
    "Receipts": [
      "Receipts - View", "Receipts - Create", "Receipts - Edit", "Receipts - Delete", 
      "Receipts - Export", "Receipts - Import", "Receipts - Print",
    ],
    "Payment Tracking": [
      "Debtors - View", "Debtors - Export", "Debtors - Print",
      "Ledger - View", "Ledger - Export", "Ledger - Print",
      "Credit Management - View", "Credit Management - Export", "Credit Management - Print",
      "Payment Analytics - View", "Payment Analytics - Export", "Payment Analytics - Print",
    ],
    // Payment Tracking submodules (individual permissions for each child)
    "Debtors": [
      "Debtors - View", "Debtors - Export", "Debtors - Print",
    ],
    "Ledger": [
      "Ledger - View", "Ledger - Export", "Ledger - Print",
    ],
    "Credit Management": [
      "Credit Management - View", "Credit Management - Export", "Credit Management - Print",
    ],
    "Payment Analytics": [
      "Payment Analytics - View", "Payment Analytics - Export", "Payment Analytics - Print",
    ],
    "Action Center": [
      "Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete",
    ],
    // Action Center submodules
    "Daily Dashboard": [
      "Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete",
    ],
    "Task Manager": [
      "Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete",
    ],
    "Call Queue": [
      "Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete",
    ],
    "Activity Logs": [
      "Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete",
    ],
    "Team Performance": [
      "Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete",
    ],
    // Team Performance submodules
    "Leaderboard": [
      "Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete",
    ],
    "Daily Targets": [
      "Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete",
    ],
    "Notification Center": [
      "Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete",
    ],
    "Risk & Recovery": [
      "Risk Management - Client Risk Thermometer - View",
      "Risk Management - Payment Risk Forecaster - View",
      "Risk Management - Recovery Health Test - View",
    ],
    // Risk & Recovery submodules
    "Client Risk Thermometer": [
      "Risk Management - Client Risk Thermometer - View",
    ],
    "Payment Risk Forecaster": [
      "Risk Management - Payment Risk Forecaster - View",
    ],
    "Recovery Health Test": [
      "Risk Management - Recovery Health Test - View",
    ],
    "Credit Control": [
      "Credit Management - View", "Credit Management - Export", "Credit Management - Print",
      "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete", 
      "Credit Control - Export", "Credit Control - Import", "Credit Control - Print",
    ],
    // Credit Control submodules
    "Category Management": [
      "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete",
    ],
    "Follow-up Rules": [
      "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete",
    ],
    "Category Calculation": [
      "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete",
    ],
    "Urgent Actions": [
      "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete",
    ],
    "Follow-up Automation": [
      "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete",
    ],
    "Masters": [
      "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", 
      "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print",
      "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", 
      "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print",
    ],
    // Masters submodules
    "Customers": [
      "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", 
      "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print",
    ],
    "Items": [
      "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", 
      "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print",
    ],
    "Settings": [
      "Company Profile - View", "Company Profile - Edit",
      "Settings - View", "Settings - Edit",
      "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", 
      "User Management - Export", "User Management - Import", "User Management - Print",
      "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", 
      "Roles Management - Export", "Roles Management - Import", "Roles Management - Print",
    ],
    // Settings submodules
    "Company Profile": [
      "Company Profile - View", "Company Profile - Edit",
    ],
    "User Management": [
      "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", 
      "User Management - Export", "User Management - Import", "User Management - Print",
    ],
    "Roles Management": [
      "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", 
      "Roles Management - Export", "Roles Management - Import", "Roles Management - Print",
    ],
    "Backup & Restore": [
      "Backup & Restore - View", "Backup & Restore - Create", "Backup & Restore - Delete",
    ],
    "Audit Logs": [
      "Audit Logs - View", "Audit Logs - Export", "Audit Logs - Print",
    ],
    "Email/WhatsApp/Call Integrations": [
      "Email/WhatsApp/Call Integrations - View", "Email/WhatsApp/Call Integrations - Edit",
    ],
    "Reports": [
      "Reports - View", "Reports - Export", "Reports - Print",
    ],
    "Integrations": [
      "Integrations - View", "Integrations - Edit",
    ],
    "Whisper Voice AI": [
      "Whisper Voice AI - View", "Whisper Voice AI - Create",
    ],
  };

  const permissions: string[] = [];
  for (const moduleName of moduleNames) {
    const modulePerms = modulePermissionMap[moduleName];
    if (modulePerms) {
      permissions.push(...modulePerms);
    }
  }

  return permissions;
}

// Auto-provision tenant after successful payment
async function autoProvisionTenant(requestId: string, baseUrl: string): Promise<{ success: boolean; message: string; tenant?: any }> {
  try {
    // Get the registration request
    const [request] = await db
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, requestId));

    if (!request) {
      return { success: false, message: "Registration request not found" };
    }

    if (request.status === "approved") {
      return { success: false, message: "Tenant already provisioned" };
    }

    if (request.paymentStatus !== "completed") {
      return { success: false, message: "Payment not completed" };
    }

    // Get the selected subscription plan
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, request.selectedPlanId!))
      .limit(1);

    if (!plan) {
      return { success: false, message: "Subscription plan not found" };
    }

    // Generate slug from business name
    const slug = request.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check for duplicates
    const existingTenantByEmail = await db
      .select()
      .from(tenants)
      .where(eq(tenants.email, request.email))
      .limit(1);

    if (existingTenantByEmail.length > 0) {
      return { success: false, message: "A tenant with this email already exists" };
    }

    const existingTenantBySlug = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (existingTenantBySlug.length > 0) {
      return { success: false, message: "A tenant with this business name already exists" };
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, request.email))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, message: "A user with this email already exists" };
    }

    // Create default password
    const emailPrefix = request.email.split('@')[0];
    const defaultPassword = `${emailPrefix}@#$405`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Create tenant
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug,
          businessName: request.businessName,
          email: request.email,
          businessAddress: request.businessAddress,
          city: request.city,
          state: request.state,
          pincode: request.pincode,
          panNumber: request.panNumber,
          gstNumber: request.gstNumber,
          industryType: request.industryType,
          planType: request.planType,
          subscriptionPlanId: plan.id,
          allowedModules: plan.allowedModules, // Copy plan's modules to tenant
          existingAccountingSoftware: request.existingAccountingSoftware,
          status: "active",
          isActive: true,
          activatedAt: new Date(),
        })
        .returning();

      // Generate subscription-based permissions from allowed modules
      const subscriptionPermissions = getPermissionsForModules(plan.allowedModules);
      
      // Dashboard cards available to all plans
      const allDashboardCards = [
        "Total Revenue", "Total Collections", "Total Outstanding", "Total Opening Balance",
        "Upcoming Invoices", "Due Today", "In Grace", "Overdue", "Paid On Time", "Paid Late",
        "Outstanding by Category", "Top 5 Customers by Revenue", "Top 5 Customers by Outstanding",
        "Overdue Invoices", "Recent Invoices", "Recent Receipts", "Customer Analytics",
        "Alpha", "Beta", "Gamma", "Delta",
        "High Risk", "Medium Risk", "Low Risk",
        "Pending Tasks", "Overdue Tasks", "Priority Customers", "Collection Progress",
      ];
      
      const [adminRole] = await tx
        .insert(roles)
        .values({
          tenantId: tenant.id,
          name: "Admin",
          description: `Full system access based on ${plan.name} subscription`,
          permissions: subscriptionPermissions,
          canViewGP: true,
          canSendEmail: true,
          canSendWhatsApp: true,
          canSendSMS: true,
          canTriggerCall: true,
          canSendReminder: true,
          canShareDocuments: true,
          allowedDashboardCards: allDashboardCards,
        })
        .returning();

      // Create first admin user with locked permissions
      const [user] = await tx
        .insert(users)
        .values({
          tenantId: tenant.id,
          name: request.businessName + " Admin",
          email: request.email,
          password: hashedPassword,
          roleId: adminRole.id,
          status: "Active",
          isAdmin: true, // Mark as admin with locked full permissions
        })
        .returning();

      // Create company profile
      await tx
        .insert(companyProfile)
        .values({
          tenantId: tenant.id,
          legalName: request.businessName,
          entityType: "Private Limited",
          gstin: request.gstNumber || null,
          pan: request.panNumber || null,
          regAddressLine1: request.businessAddress,
          regCity: request.city,
          regState: request.state || "",
          regPincode: request.pincode,
          primaryContactName: request.businessName + " Admin",
          primaryContactEmail: request.email,
          primaryContactMobile: request.mobileNumber || "0000000000",
          email: request.email,
          industryType: request.industryType || null,
          planType: request.planType,
        });

      // Update registration request
      await tx
        .update(registrationRequests)
        .set({
          status: "approved",
          tenantId: tenant.id,
          reviewedAt: new Date(),
        })
        .where(eq(registrationRequests.id, requestId));

      return { tenant, user, adminRole, defaultPassword };
    });

    // Send credentials email
    const emailResult = await sendTenantCredentials(
      result.tenant.businessName,
      result.user.email,
      result.defaultPassword,
      baseUrl
    );

    // Send payment receipt email
    const paymentDate = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    const receiptResult = await sendPaymentReceipt(
      request.businessName,
      request.email,
      request.transactionId || request.paymentId || 'N/A',
      request.paymentAmount || '0',
      plan.name,
      plan.billingCycle,
      paymentDate,
      plan.name === "Starter"
    );

    console.log("📧 Credentials email:", emailResult.message);
    console.log("📧 Receipt email:", receiptResult.message);

    return {
      success: true,
      message: "Tenant provisioned successfully",
      tenant: result.tenant
    };

  } catch (error: any) {
    console.error("Auto-provision error:", error);
    return {
      success: false,
      message: error.message || "Failed to provision tenant"
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Public endpoints (BEFORE middleware)
  // Public API for pricing page - Get active subscription plans
  app.get("/api/public/plans", async (req, res) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Failed to fetch active subscription plans:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Email validation endpoint - check if email is already registered
  app.post("/api/validate-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check in tenants table
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.email, email))
        .limit(1);

      if (existingTenant.length > 0) {
        return res.status(200).json({ 
          available: false, 
          message: "This email is already registered. Please use a different email or contact support." 
        });
      }

      // Check in users table
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(200).json({ 
          available: false, 
          message: "This email is already registered. Please use a different email or contact support." 
        });
      }

      // Check in pending registration requests
      const pendingRequest = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.email, email))
        .limit(1);

      if (pendingRequest.length > 0) {
        return res.status(200).json({ 
          available: false, 
          message: "A registration request with this email already exists. Please check your email or contact support." 
        });
      }

      res.status(200).json({ available: true, message: "Email is available" });
    } catch (error: any) {
      console.error("Email validation error:", error);
      res.status(500).json({ message: "Failed to validate email" });
    }
  });

  // Public tenant registration endpoint
  app.post("/api/register-tenant", async (req, res) => {
    try {
      const registrationData = req.body;

      const result = insertRegistrationRequestSchema.safeParse(registrationData);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ message: error.message });
      }

      // Get selected subscription plan to determine amount
      const [selectedPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, result.data.selectedPlanId))
        .limit(1);

      if (!selectedPlan) {
        return res.status(400).json({ message: "Invalid subscription plan selected" });
      }

      // Generate unique transaction ID
      const txnid = `TXN${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      // Payment amount (convert to string for PayU)
      const amount = parseFloat(selectedPlan.price).toFixed(2);

      // Create registration request with payment details
      const [request] = await db
        .insert(registrationRequests)
        .values({
          ...result.data,
          paymentStatus: 'pending',
          paymentId: txnid,
          transactionId: txnid,
          paymentAmount: amount,
        })
        .returning();

      // Get PayU credentials from environment
      const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY;
      const PAYU_SALT_KEY = process.env.PAYU_SALT_KEY;
      const PAYU_MODE = (process.env.PAYU_MODE || 'test').toLowerCase(); // 'test' or 'live'

      if (!PAYU_MERCHANT_KEY || !PAYU_SALT_KEY) {
        return res.status(500).json({ 
          message: "Payment gateway is not configured. Please contact support." 
        });
      }

      // PayU URLs
      const payuUrl = PAYU_MODE === 'live' 
        ? 'https://secure.payu.in/_payment' 
        : 'https://test.payu.in/_payment';
      
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const surl = `${baseUrl}/api/payment/payu/success`;
      const furl = `${baseUrl}/api/payment/payu/failure`;

      // Prepare PayU payment data
      const paymentData = {
        key: PAYU_MERCHANT_KEY,
        txnid: txnid,
        amount: amount,
        productinfo: `${selectedPlan.name} Subscription - RECOV.`,
        firstname: result.data.businessName.split(' ')[0] || result.data.businessName,
        email: result.data.email,
        phone: result.data.mobileNumber,
        surl: surl,
        furl: furl,
        udf1: request.id, // Store registration request ID for reference
        udf2: selectedPlan.id,
        udf3: selectedPlan.name,
        udf4: '',
        udf5: '',
      };

      // Generate hash
      const hash = generatePayUHash(paymentData, PAYU_SALT_KEY);

      // Debug: Log hash calculation details
      const hashStringForDebug = `${paymentData.key}|${paymentData.txnid}|${paymentData.amount}|${paymentData.productinfo}|${paymentData.firstname}|${paymentData.email}|${paymentData.udf1}|${paymentData.udf2}|${paymentData.udf3}|${paymentData.udf4}|${paymentData.udf5}||||||SALT`;
      console.log('PayU Payment Data:', {
        key: paymentData.key,
        txnid: paymentData.txnid,
        amount: paymentData.amount,
        productinfo: paymentData.productinfo,
        firstname: paymentData.firstname,
        email: paymentData.email,
        phone: paymentData.phone,
        udf1: paymentData.udf1,
        udf2: paymentData.udf2,
        udf3: paymentData.udf3,
        udf4: paymentData.udf4,
        udf5: paymentData.udf5,
        mode: PAYU_MODE,
        url: payuUrl
      });
      console.log('Hash String (with SALT hidden):', hashStringForDebug);
      console.log('Generated Hash:', hash);

      // Create HTML form that auto-submits to PayU
      const paymentFormHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting to Payment Gateway...</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .loader {
      text-align: center;
      color: white;
    }
    .spinner {
      border: 4px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top: 4px solid white;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <h2>Redirecting to secure payment gateway...</h2>
    <p>Please wait while we redirect you to PayU</p>
  </div>
  <form id="payuForm" method="post" action="${payuUrl}">
    <input type="hidden" name="key" value="${paymentData.key}" />
    <input type="hidden" name="txnid" value="${paymentData.txnid}" />
    <input type="hidden" name="amount" value="${paymentData.amount}" />
    <input type="hidden" name="productinfo" value="${paymentData.productinfo}" />
    <input type="hidden" name="firstname" value="${paymentData.firstname}" />
    <input type="hidden" name="email" value="${paymentData.email}" />
    <input type="hidden" name="phone" value="${paymentData.phone}" />
    <input type="hidden" name="surl" value="${paymentData.surl}" />
    <input type="hidden" name="furl" value="${paymentData.furl}" />
    <input type="hidden" name="hash" value="${hash}" />
    <input type="hidden" name="udf1" value="${paymentData.udf1}" />
    <input type="hidden" name="udf2" value="${paymentData.udf2}" />
    <input type="hidden" name="udf3" value="${paymentData.udf3}" />
    <input type="hidden" name="udf4" value="${paymentData.udf4}" />
    <input type="hidden" name="udf5" value="${paymentData.udf5}" />
  </form>
  <script>
    document.getElementById('payuForm').submit();
  </script>
</body>
</html>`;

      // Return the HTML form that will auto-submit
      res.setHeader('Content-Type', 'text/html');
      res.send(paymentFormHtml);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  // PayU Success Callback
  app.post("/api/payment/payu/success", async (req, res) => {
    try {
      const payuData = req.body;
      console.log("PayU Success Callback Data:", payuData);

      const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY!;
      const PAYU_SALT_KEY = process.env.PAYU_SALT_KEY!;

      // Verify hash
      const verificationData = {
        key: PAYU_MERCHANT_KEY,
        status: payuData.status,
        email: payuData.email,
        firstname: payuData.firstname,
        productinfo: payuData.productinfo,
        amount: payuData.amount,
        txnid: payuData.txnid,
        udf1: payuData.udf1 || '',
        udf2: payuData.udf2 || '',
        udf3: payuData.udf3 || '',
        udf4: payuData.udf4 || '',
        udf5: payuData.udf5 || '',
      };

      const receivedHash = payuData.hash;
      const isValid = verifyPayUHash(verificationData, PAYU_SALT_KEY, receivedHash);

      if (!isValid) {
        console.error("Invalid PayU hash received");
        return res.redirect('/payment-failed?reason=invalid_hash');
      }

      // Get registration request ID from udf1
      const registrationRequestId = payuData.udf1;

      if (!registrationRequestId) {
        console.error("No registration request ID found in PayU callback");
        return res.redirect('/payment-failed?reason=missing_registration_id');
      }

      // Update registration request with payment details
      await db
        .update(registrationRequests)
        .set({
          paymentStatus: payuData.status === 'success' ? 'success' : 'failed',
          transactionId: payuData.mihpayid || payuData.txnid,
          paymentAmount: payuData.amount,
          paymentTimestamp: new Date(),
        })
        .where(eq(registrationRequests.id, registrationRequestId));

      if (payuData.status === 'success') {
        // Trigger auto-tenant provisioning
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const provisionResult = await autoProvisionTenant(registrationRequestId, baseUrl);
        
        if (provisionResult.success) {
          console.log("✅ Tenant auto-provisioned successfully:", provisionResult.tenant?.businessName);
          return res.redirect(`/payment-success?txnid=${payuData.txnid}&requestId=${registrationRequestId}`);
        } else {
          console.error("❌ Auto-provision failed:", provisionResult.message);
          // Still redirect to success page but log the error
          return res.redirect(`/payment-success?txnid=${payuData.txnid}&requestId=${registrationRequestId}&warning=provisioning_delayed`);
        }
      } else {
        return res.redirect(`/payment-failed?txnid=${payuData.txnid}&reason=${payuData.error_Message || 'payment_failed'}`);
      }
      
    } catch (error: any) {
      console.error("PayU success callback error:", error);
      return res.redirect('/payment-failed?reason=server_error');
    }
  });

  // PayU Failure Callback
  app.post("/api/payment/payu/failure", async (req, res) => {
    try {
      const payuData = req.body;
      console.log("PayU Failure Callback Data:", payuData);

      // Get registration request ID from udf1
      const registrationRequestId = payuData.udf1;

      if (registrationRequestId) {
        // Update registration request status
        await db
          .update(registrationRequests)
          .set({
            paymentStatus: 'failed',
            transactionId: payuData.mihpayid || payuData.txnid,
          })
          .where(eq(registrationRequests.id, registrationRequestId));
      }

      return res.redirect(`/payment-failed?txnid=${payuData.txnid}&reason=${payuData.error_Message || 'payment_failed'}`);
      
    } catch (error: any) {
      console.error("PayU failure callback error:", error);
      return res.redirect('/payment-failed?reason=server_error');
    }
  });

  // Get registration status
  app.get("/api/registration-status/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;

      const [request] = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Registration request not found" });
      }

      res.json({
        status: request.status,
        businessName: request.businessName,
        email: request.email,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
        rejectionReason: request.rejectionReason,
      });
    } catch (error: any) {
      console.error("Status check error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all registration requests (admin only)
  // Shows pending, approved, and rejected requests
  app.get("/api/registration-requests", adminOnlyMiddleware, async (req, res) => {
    try {
      const requests = await db
        .select()
        .from(registrationRequests)
        .orderBy(desc(registrationRequests.createdAt));

      res.json(requests);
    } catch (error: any) {
      console.error("Failed to fetch registration requests:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Approve registration request and create tenant with first admin user
  app.post("/api/registration-requests/:requestId/approve", adminOnlyMiddleware, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { planId } = req.body;

      // Validate planId is provided
      if (!planId) {
        return res.status(400).json({ message: "Subscription plan ID is required" });
      }

      // Verify subscription plan exists
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId))
        .limit(1);

      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Get the registration request
      const [request] = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Registration request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Registration request has already been processed" });
      }

      // Generate slug from business name
      const slug = request.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Check for duplicate tenant email
      const existingTenantByEmail = await db
        .select()
        .from(tenants)
        .where(eq(tenants.email, request.email))
        .limit(1);

      if (existingTenantByEmail.length > 0) {
        return res.status(400).json({ 
          message: "A tenant with this email already exists" 
        });
      }

      // Check for duplicate tenant slug
      const existingTenantBySlug = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (existingTenantBySlug.length > 0) {
        return res.status(400).json({ 
          message: "A tenant with this business name already exists" 
        });
      }

      // Check for duplicate user email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, request.email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ 
          message: "A user with this email already exists" 
        });
      }

      // Create default password (email prefix + @#$405)
      const emailPrefix = request.email.split('@')[0];
      const defaultPassword = `${emailPrefix}@#$405`;
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Use transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Create tenant
        const [tenant] = await tx
          .insert(tenants)
          .values({
            slug,
            businessName: request.businessName,
            email: request.email,
            businessAddress: request.businessAddress,
            city: request.city,
            state: request.state,
            pincode: request.pincode,
            panNumber: request.panNumber,
            gstNumber: request.gstNumber,
            industryType: request.industryType,
            planType: request.planType,
            subscriptionPlanId: planId,
            allowedModules: plan.allowedModules, // Copy plan's modules to tenant
            existingAccountingSoftware: request.existingAccountingSoftware,
            status: "active",
            isActive: true,
            activatedAt: new Date(),
          })
          .returning();

        // Generate subscription-based permissions from allowed modules
        const subscriptionPermissions = getPermissionsForModules(plan.allowedModules);
        
        // Dashboard cards available to all plans
        const allDashboardCards = [
          "Total Revenue", "Total Collections", "Total Outstanding", "Total Opening Balance",
          "Upcoming Invoices", "Due Today", "In Grace", "Overdue", "Paid On Time", "Paid Late",
          "Outstanding by Category", "Top 5 Customers by Revenue", "Top 5 Customers by Outstanding",
          "Overdue Invoices", "Recent Invoices", "Recent Receipts", "Customer Analytics",
          "Alpha", "Beta", "Gamma", "Delta",
          "High Risk", "Medium Risk", "Low Risk",
          "Pending Tasks", "Overdue Tasks", "Priority Customers", "Collection Progress",
        ];
        
        const [adminRole] = await tx
          .insert(roles)
          .values({
            tenantId: tenant.id,
            name: "Admin",
            description: `Full system access based on ${plan.name} subscription`,
            permissions: subscriptionPermissions,
            canViewGP: true,
            canSendEmail: true,
            canSendWhatsApp: true,
            canSendSMS: true,
            canTriggerCall: true,
            canSendReminder: true,
            canShareDocuments: true,
            allowedDashboardCards: allDashboardCards,
          })
          .returning();

        // Create first admin user with locked permissions
        const [user] = await tx
          .insert(users)
          .values({
            tenantId: tenant.id,
            name: request.businessName + " Admin",
            email: request.email,
            password: hashedPassword,
            roleId: adminRole.id,
            status: "Active",
            isAdmin: true, // Mark as admin with locked full permissions
          })
          .returning();

        // Create company profile with registration data
        await tx
          .insert(companyProfile)
          .values({
            tenantId: tenant.id,
            legalName: request.businessName,
            entityType: "Private Limited", // Default
            gstin: request.gstNumber || null,
            pan: request.panNumber || null,
            regAddressLine1: request.businessAddress,
            regCity: request.city,
            regState: request.state || "",
            regPincode: request.pincode,
            primaryContactName: request.businessName + " Admin",
            primaryContactEmail: request.email,
            primaryContactMobile: "0000000000", // Placeholder
            email: request.email,
            industryType: request.industryType || null,
            planType: request.planType,
          });

        // Update registration request
        await tx
          .update(registrationRequests)
          .set({
            status: "approved",
            tenantId: tenant.id,
            reviewedAt: new Date(),
          })
          .where(eq(registrationRequests.id, requestId));

        return { tenant, user, adminRole };
      });

      // Send welcome email with credentials automatically (non-blocking)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://recov.wizoneit.com'
        : `${req.protocol}://${req.get('host')}`;
      const emailResult = await sendTenantCredentials(
        result.tenant.businessName,
        result.user.email,
        defaultPassword,
        baseUrl
      );

      res.json({
        success: true,
        tenant: result.tenant,
        user: {
          id: result.user.id,
          email: result.user.email,
        },
        message: emailResult.success 
          ? "Registration approved successfully. Welcome email sent to the tenant." 
          : `Registration approved successfully. ${emailResult.message}`,
      });
    } catch (error: any) {
      console.error("Approval error:", error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        const constraintName = error.constraint || "";
        
        if (constraintName.includes("email")) {
          if (constraintName.includes("users")) {
            return res.status(400).json({ 
              message: "A user with this email already exists" 
            });
          } else if (constraintName.includes("tenants")) {
            return res.status(400).json({ 
              message: "A tenant with this email already exists" 
            });
          }
        } else if (constraintName.includes("slug")) {
          return res.status(400).json({ 
            message: "A tenant with this business name already exists" 
          });
        } else if (constraintName.includes("role")) {
          return res.status(400).json({ 
            message: "Role conflict detected. Please try again." 
          });
        }
        
        return res.status(400).json({ 
          message: "A duplicate record exists. Please check your input." 
        });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Delete registration request (admin only)
  app.delete("/api/registration-requests/:requestId", adminOnlyMiddleware, async (req, res) => {
    try {
      const { requestId } = req.params;

      // Check if request exists
      const [request] = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.id, requestId));

      if (!request) {
        return res.status(404).json({ message: "Registration request not found" });
      }

      // Delete the registration request
      await db
        .delete(registrationRequests)
        .where(eq(registrationRequests.id, requestId));

      res.json({
        success: true,
        message: `Registration request deleted successfully`,
      });
    } catch (error: any) {
      console.error("Failed to delete registration request:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Toggle tenant active status (admin only)
  app.post("/api/tenants/:tenantId/toggle-status", adminOnlyMiddleware, async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Toggle the status
      const newStatus = !tenant.isActive;

      // Update tenant status
      await db
        .update(tenants)
        .set({ isActive: newStatus })
        .where(eq(tenants.id, tenantId));

      res.json({
        success: true,
        message: `Tenant ${newStatus ? 'activated' : 'deactivated'} successfully`,
        isActive: newStatus,
      });
    } catch (error: any) {
      console.error("Toggle status error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reset tenant admin password (admin only)
  app.post("/api/tenants/:tenantId/reset-password", adminOnlyMiddleware, async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Get tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Get tenant admin user
      const [adminUser] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.tenantId, tenantId),
          eq(users.email, tenant.email)
        ));

      if (!adminUser) {
        return res.status(404).json({ message: "Tenant admin user not found" });
      }

      // Create default password (company name without spaces)
      const defaultPassword = tenant.businessName.replace(/\s+/g, "");
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, adminUser.id));

      res.json({
        success: true,
        message: "Password reset successfully to default",
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send credentials email to tenant admin (admin only)
  app.post("/api/tenants/:tenantId/send-credentials", adminOnlyMiddleware, async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Get tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Generate default password using standard format: emailPrefix@#$405
      const emailPrefix = tenant.email.split('@')[0];
      const defaultPassword = `${emailPrefix}@#$405`;

      // Send credentials email using platform admin's email config
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://recov.wizoneit.com'
        : `${req.protocol}://${req.get('host')}`;
      const emailResult = await sendTenantCredentials(
        tenant.businessName,
        tenant.email,
        defaultPassword,
        baseUrl
      );

      if (!emailResult.success) {
        return res.status(400).json({ 
          message: emailResult.message 
        });
      }

      res.json({
        success: true,
        message: emailResult.message,
      });
    } catch (error: any) {
      console.error("Send credentials error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update tenant mobile number (admin only)
  app.put("/api/platform-admin/tenants/:id/mobile", adminOnlyMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { mobileNumber } = req.body;

      // Validate mobile number
      if (!mobileNumber || typeof mobileNumber !== 'string') {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      const trimmedMobile = mobileNumber.trim();
      if (!/^\d{10}$/.test(trimmedMobile)) {
        return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
      }

      // Check if tenant exists
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id));

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Update mobile number
      await db
        .update(tenants)
        .set({ mobileNumber: trimmedMobile })
        .where(eq(tenants.id, id));

      res.json({
        success: true,
        message: "Mobile number updated successfully",
        mobileNumber: trimmedMobile,
      });
    } catch (error: any) {
      console.error("Update mobile error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update registration request mobile number (admin only)
  app.put("/api/platform-admin/registration-requests/:id/mobile", adminOnlyMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { mobileNumber } = req.body;

      // Validate mobile number
      if (!mobileNumber || typeof mobileNumber !== 'string') {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      const trimmedMobile = mobileNumber.trim();
      if (!/^\d{10}$/.test(trimmedMobile)) {
        return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
      }

      // Check if registration request exists
      const [request] = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.id, id));

      if (!request) {
        return res.status(404).json({ message: "Registration request not found" });
      }

      // Update mobile number
      await db
        .update(registrationRequests)
        .set({ mobileNumber: trimmedMobile })
        .where(eq(registrationRequests.id, id));

      res.json({
        success: true,
        message: "Mobile number updated successfully",
        mobileNumber: trimmedMobile,
      });
    } catch (error: any) {
      console.error("Update mobile error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Forgot password - send reset link
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Don't reveal whether email exists
        return res.json({
          success: true,
          message: "If your email is registered, you will receive a password reset link shortly.",
        });
      }

      // Generate reset token
      const resetToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token
      await db.insert(passwordResetTokens).values({
        email,
        token: resetToken,
        expiresAt,
        used: false,
      });

      // Get platform admin's email configuration (tenantId = null)
      const platformEmailConfig = await storage.getEmailConfig(null);

      if (!platformEmailConfig) {
        console.warn("⚠️  Platform email configuration not found. Password reset email cannot be sent.");
        console.warn("⚠️  Please configure platform email at /email-config with tenantId = null");
      } else {
        try {
          // Use production URL in production, development URL otherwise
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://recov.wizoneit.com'
            : `${req.protocol}://${req.get('host')}`;
          const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
          const emailBody = renderTemplate(
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              <p style="color: #666; font-size: 16px;">Hello,</p>
              <p style="color: #666; font-size: 16px;">We received a request to reset your password. Click the button below to set a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              </div>
              
              <p style="color: #666; font-size: 16px;">Or copy and paste this link into your browser:</p>
              <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; color: #444;">{resetUrl}</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <strong>Important:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
              </div>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="margin: 5px 0; color: #333;">Best regards,</p>
                <p style="margin: 5px 0; color: #333;"><strong>Team RECOV.</strong></p>
                <p style="margin: 15px 0; color: #666;"><strong>WIZONE IT NETWORK INDIA PVT LTD</strong></p>
                <p style="margin: 5px 0; color: #666;">📞 7500 22 33 55</p>
                <p style="margin: 5px 0; color: #666;">📞 9258 299 527</p>
                <p style="margin: 5px 0; color: #666;">📞 9258 299 518</p>
              </div>
            </div>
            `,
            {
              resetUrl,
            }
          );

          await sendEmail(
            platformEmailConfig,
            email,
            "Password Reset Request - RECOV.",
            emailBody
          );
          
          console.log(`✓ Password reset email sent to ${email}`);
        } catch (emailError: any) {
          console.error("Failed to send password reset email:", emailError.message);
        }
      }

      res.json({
        success: true,
        message: "If your email is registered, you will receive a password reset link shortly.",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find the reset token
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      // Check if token is expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "Reset link has expired" });
      }

      // Check if token has been used
      if (resetToken.used) {
        return res.status(400).json({ message: "Reset link has already been used" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(resetToken.email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and mark token as used
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));

        await tx
          .update(passwordResetTokens)
          .set({ used: true })
          .where(eq(passwordResetTokens.id, resetToken.id));
      });

      res.json({
        success: true,
        message: "Password reset successfully. You can now login with your new password.",
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Validate reset token
  app.get("/api/auth/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      if (!resetToken) {
        return res.json({ valid: false, message: "Invalid reset link" });
      }

      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.json({ valid: false, message: "Reset link has expired" });
      }

      if (resetToken.used) {
        return res.json({ valid: false, message: "Reset link has already been used" });
      }

      res.json({ valid: true });
    } catch (error: any) {
      console.error("Validate token error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current tenant with subscription plan (for tenant users)
  app.get("/api/tenants/current", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Platform admins don't have a tenant
      if (!sessionUser.tenantId) {
        return res.json(null);
      }

      // Fetch tenant with subscription plan
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, sessionUser.tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Fetch subscription plan if assigned
      let subscriptionPlan = null;
      if (tenant.subscriptionPlanId) {
        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, tenant.subscriptionPlanId))
          .limit(1);
        subscriptionPlan = plan || null;
      }

      res.json({
        ...tenant,
        subscriptionPlan,
      });
    } catch (error: any) {
      console.error("Failed to fetch current tenant:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get current tenant profile for settings page
  app.get("/api/tenant/me", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!sessionUser.tenantId) {
        return res.status(403).json({ message: "No tenant associated with your account" });
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, sessionUser.tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error: any) {
      console.error("Failed to fetch tenant profile:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update current tenant profile
  app.put("/api/tenant/me", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!sessionUser.tenantId) {
        return res.status(403).json({ message: "No tenant associated with your account" });
      }

      const validatedData = updateTenantProfileSchema.parse(req.body);

      const [updatedTenant] = await db
        .update(tenants)
        .set({
          businessName: validatedData.businessName,
          mobileNumber: validatedData.mobileNumber || null,
          businessAddress: validatedData.businessAddress,
          city: validatedData.city,
          state: validatedData.state || null,
          pincode: validatedData.pincode,
          panNumber: validatedData.panNumber || null,
          gstNumber: validatedData.gstNumber || null,
          industryType: validatedData.industryType || null,
        })
        .where(eq(tenants.id, sessionUser.tenantId))
        .returning();

      if (!updatedTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      res.json(updatedTenant);
    } catch (error: any) {
      console.error("Failed to update tenant profile:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Get allowed modules for current tenant (based on subscription plan or custom override)
  app.get("/api/tenants/allowed-modules", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Platform admins have access to all modules
      if (!sessionUser.tenantId) {
        return res.json([
          "Business Overview",
          "Customer Analytics",
          "Leads",
          "Quotations",
          "Proforma Invoices",
          "Invoices",
          "Receipts",
          "Payment Tracking",
          "Action Center",
          "Team Performance",
          "Risk & Recovery",
          "Credit Control",
          "Masters",
          "Settings",
          "Integrations"
        ]);
      }

      // Fetch tenant with subscription plan
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, sessionUser.tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Strict subscription enforcement: ONLY use subscription plan's allowed modules
      if (tenant.subscriptionPlanId) {
        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, tenant.subscriptionPlanId))
          .limit(1);

        if (plan && plan.allowedModules) {
          return res.json(plan.allowedModules);
        }
      }

      // Default: return empty array if no plan assigned
      res.json([]);
    } catch (error: any) {
      console.error("Failed to fetch allowed modules:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all tenants (admin only)
  app.get("/api/tenants", adminOnlyMiddleware, async (req, res) => {
    try {
      const allTenants = await db
        .select()
        .from(tenants)
        .orderBy(desc(tenants.createdAt));

      res.json(allTenants);
    } catch (error: any) {
      console.error("Failed to fetch tenants:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete tenant (admin only) - Deletes tenant and all related data
  app.delete("/api/tenants/:tenantId", adminOnlyMiddleware, async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Check if tenant exists
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Explicitly delete users belonging to this tenant (makes email reusable)
      await db
        .delete(users)
        .where(eq(users.tenantId, tenantId));

      // Delete any registration requests linked to this tenant
      await db
        .delete(registrationRequests)
        .where(eq(registrationRequests.tenantId, tenantId));

      // Delete tenant (CASCADE will delete remaining related data: roles, customers, etc.)
      await db
        .delete(tenants)
        .where(eq(tenants.id, tenantId));

      res.json({ 
        success: true,
        message: `Tenant "${tenant.businessName}" and all associated data deleted successfully` 
      });
    } catch (error: any) {
      console.error("Failed to delete tenant:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========== PLATFORM STATISTICS API (Platform Admin Only) ==========
  
  // Get platform-wide statistics (aggregated across all tenants)
  app.get("/api/platform/statistics", adminOnlyMiddleware, async (req, res) => {
    try {
      // Get total customers across all tenants
      const totalCustomers = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers);
      
      // Get total invoices and their sum across all tenants
      const invoiceStats = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`COALESCE(SUM(${invoices.invoiceAmount}), 0)`
        })
        .from(invoices);
      
      // Get total receipts and their sum across all tenants
      const receiptStats = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`
        })
        .from(receipts);
      
      res.json({
        customers: {
          total: totalCustomers[0]?.count || 0
        },
        invoices: {
          count: invoiceStats[0]?.count || 0,
          totalAmount: invoiceStats[0]?.total || "0"
        },
        receipts: {
          count: receiptStats[0]?.count || 0,
          totalAmount: receiptStats[0]?.total || "0"
        }
      });
    } catch (error: any) {
      console.error("Failed to fetch platform statistics:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get today's active users (users who logged in today)
  app.get("/api/platform/active-users", adminOnlyMiddleware, async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeUsers = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            sql`${users.tenantId} IS NOT NULL`, // Exclude platform admins
            sql`${users.lastLoginAt} >= ${today}`
          )
        );
      
      res.json({
        activeToday: activeUsers[0]?.count || 0
      });
    } catch (error: any) {
      console.error("Failed to fetch active users:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========== PUBLIC ROUTES (Before tenant middleware) ==========
  
  // Get active subscription plans only (public route for landing page)
  app.get("/api/subscription-plans/active", async (req, res) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Failed to fetch active subscription plans:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Apply tenant-aware middleware to all API routes EXCEPT public endpoints
  app.use('/api', tenantMiddleware);

  // ========== SUBSCRIPTION PLANS API (Platform Admin Only) ==========

  // Get all subscription plans
  app.get("/api/subscription-plans", adminOnlyMiddleware, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Failed to fetch subscription plans:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get plan usage statistics
  app.get("/api/subscription-plans/stats", adminOnlyMiddleware, async (req, res) => {
    try {
      const stats = await storage.getPlanUsageStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Failed to fetch plan stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get single subscription plan
  app.get("/api/subscription-plans/:id", adminOnlyMiddleware, async (req, res) => {
    try {
      const plan = await storage.getSubscriptionPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      res.json(plan);
    } catch (error: any) {
      console.error("Failed to fetch subscription plan:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create subscription plan
  app.post("/api/subscription-plans", adminOnlyMiddleware, async (req, res) => {
    try {
      const validated = insertSubscriptionPlanSchema.parse(req.body);
      const plan = await storage.createSubscriptionPlan(validated);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("Failed to create subscription plan:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Update subscription plan
  app.put("/api/subscription-plans/:id", adminOnlyMiddleware, async (req, res) => {
    try {
      const validated = insertSubscriptionPlanSchema.partial().parse(req.body);
      const plan = await storage.updateSubscriptionPlan(req.params.id, validated);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // If modules were updated, propagate changes to all tenants using this plan
      if (validated.allowedModules && plan.allowedModules) {
        // Find all tenants using this plan
        const affectedTenants = await db
          .select()
          .from(tenants)
          .where(eq(tenants.subscriptionPlanId, req.params.id));
        
        if (affectedTenants.length > 0) {
          console.log(`🔄 Propagating module changes to ${affectedTenants.length} tenant(s)...`);
          
          // Generate new permissions based on updated modules
          const newPermissions = getPermissionsForModules(plan.allowedModules);
          
          // Track successfully updated tenants
          const successfullyUpdatedTenantIds: string[] = [];
          
          // Update each tenant atomically using transactions
          for (const tenant of affectedTenants) {
            try {
              // Use transaction to ensure atomicity - tenant and role update together or not at all
              await db.transaction(async (tx) => {
                // 1. Update tenant's allowed modules
                await tx
                  .update(tenants)
                  .set({ allowedModules: plan.allowedModules })
                  .where(eq(tenants.id, tenant.id));
                
                // 2. Update Admin role permissions
                const [adminRole] = await tx
                  .select()
                  .from(roles)
                  .where(and(
                    eq(roles.tenantId, tenant.id),
                    eq(roles.name, "Admin")
                  ))
                  .limit(1);
                
                if (adminRole) {
                  await tx
                    .update(roles)
                    .set({ permissions: newPermissions })
                    .where(eq(roles.id, adminRole.id));
                  
                  console.log(`  ✓ Updated ${tenant.businessName}`);
                } else {
                  console.warn(`  ⚠ ${tenant.businessName} has no Admin role`);
                }
              });
              
              // Transaction successful - track for broadcast
              successfullyUpdatedTenantIds.push(tenant.id);
            } catch (txError: any) {
              console.error(`  ❌ Failed to update ${tenant.businessName}:`, txError.message);
              // Continue with other tenants even if one fails
            }
          }
          
          // Only broadcast to successfully updated tenants after all transactions commit
          if (successfullyUpdatedTenantIds.length > 0) {
            try {
              for (const tenantId of successfullyUpdatedTenantIds) {
                wsManager.broadcastToTenant(tenantId, {
                  type: 'PERMISSIONS_UPDATED',
                  payload: {
                    message: `Your subscription plan "${plan.name}" has been updated`,
                    newPlan: plan.name,
                    modules: plan.allowedModules
                  }
                });
              }
              console.log(`✅ Successfully propagated changes to ${successfullyUpdatedTenantIds.length}/${affectedTenants.length} tenant(s)`);
              console.log(`📡 Broadcasted real-time updates via WebSocket`);
            } catch (wsError: any) {
              console.error('⚠ WebSocket broadcast failed (updates still applied):', wsError.message);
            }
          }
        }
      }

      res.json(plan);
    } catch (error: any) {
      console.error("Failed to update subscription plan:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Delete subscription plan
  app.delete("/api/subscription-plans/:id", adminOnlyMiddleware, async (req, res) => {
    try {
      // Check if any tenants are using this plan
      const allTenants = await db.select().from(tenants);
      const tenantsUsingPlan = allTenants.filter(t => t.subscriptionPlanId === req.params.id);
      
      if (tenantsUsingPlan.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete plan. ${tenantsUsingPlan.length} tenant(s) are currently using this plan.`,
          tenantsCount: tenantsUsingPlan.length
        });
      }

      const success = await storage.deleteSubscriptionPlan(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      res.json({ success: true, message: "Plan deleted successfully" });
    } catch (error: any) {
      console.error("Failed to delete subscription plan:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk update tenants' subscription plan
  app.post("/api/subscription-plans/:planId/assign-tenants", adminOnlyMiddleware, async (req, res) => {
    try {
      const { planId } = req.params;
      const { tenantIds } = req.body;

      if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
        return res.status(400).json({ message: "tenantIds must be a non-empty array" });
      }

      // Verify plan exists
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Generate permissions for the new plan's modules
      const newPermissions = getPermissionsForModules(plan.allowedModules);

      // Update all tenants with new plan using atomic transactions
      let updated = 0;
      const affectedTenantIds: string[] = [];
      
      for (const tenantId of tenantIds) {
        try {
          // Use transaction to ensure atomicity - tenant and role update together or not at all
          await db.transaction(async (tx) => {
            // 1. Update tenant's subscription plan and allowed modules
            const result = await tx
              .update(tenants)
              .set({ 
                subscriptionPlanId: planId, 
                customModules: null,
                allowedModules: plan.allowedModules
              })
              .where(eq(tenants.id, tenantId))
              .returning();
            
            if (result.length === 0) {
              throw new Error(`Tenant ${tenantId} not found`);
            }
            
            // 2. Update Admin role permissions for this tenant
            const [adminRole] = await tx
              .select()
              .from(roles)
              .where(and(
                eq(roles.tenantId, tenantId),
                eq(roles.name, "Admin")
              ))
              .limit(1);
            
            if (adminRole) {
              await tx
                .update(roles)
                .set({ permissions: newPermissions })
                .where(eq(roles.id, adminRole.id));
              
              console.log(`✓ Updated Admin role permissions for tenant ${tenantId} to ${plan.name} plan`);
            } else {
              console.warn(`⚠ Tenant ${tenantId} has no Admin role - only tenant updated`);
            }
          });
          
          // Transaction successful - track affected tenant
          updated++;
          affectedTenantIds.push(tenantId);
        } catch (txError: any) {
          console.error(`❌ Failed to update tenant ${tenantId}:`, txError.message);
          // Continue with other tenants even if one fails
        }
      }

      // Only broadcast after ALL successful transactions are committed
      if (affectedTenantIds.length > 0) {
        try {
          for (const tenantId of affectedTenantIds) {
            wsManager.broadcastToTenant(tenantId, {
              type: 'PERMISSIONS_UPDATED',
              payload: {
                message: `Your subscription plan has been updated to "${plan.name}"`,
                newPlan: plan.name,
                modules: plan.allowedModules
              }
            });
          }
          console.log(`📡 Broadcasted permission updates to ${affectedTenantIds.length} tenant(s)`);
        } catch (wsError: any) {
          console.error('⚠ WebSocket broadcast failed (updates still applied):', wsError.message);
        }
      }

      res.json({ 
        success: true, 
        message: `${updated} tenant(s) updated to plan "${plan.name}" with immediate effect`,
        updatedCount: updated,
        totalRequested: tenantIds.length
      });
    } catch (error: any) {
      console.error("Failed to assign plan to tenants:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========== END SUBSCRIPTION PLANS API ==========

  // ========== WHISPER VOICE AI API ==========
  
  // Platform Admin - Get Whisper Configuration
  app.get("/api/whisper/config", adminOnlyMiddleware, async (req, res) => {
    try {
      const config = await storage.getWhisperConfig();
      
      if (!config) {
        return res.json({
          exists: false,
          message: "Whisper configuration not set up yet"
        });
      }
      
      // Never return the decrypted API key to the client
      const { encryptedApiKey, ...safeConfig } = config;
      
      res.json({
        exists: true,
        config: {
          ...safeConfig,
          hasApiKey: !!encryptedApiKey
        }
      });
    } catch (error: any) {
      console.error("Failed to fetch Whisper config:", error);
      res.status(500).json({ code: "FETCH_ERROR", message: error.message });
    }
  });
  
  // Platform Admin - Create/Update Whisper Configuration
  app.post("/api/whisper/config", adminOnlyMiddleware, async (req, res) => {
    try {
      const {
        apiKey,
        isEnabled,
        planAllocations,
        addonPricingTiers
      } = req.body;
      
      // Check if config already exists
      const existingConfig = await storage.getWhisperConfig();
      
      // Validate API key: Required for new config, optional for updates
      if (!existingConfig && (!apiKey || typeof apiKey !== "string")) {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: "API key is required when creating new configuration" 
        });
      }
      
      // If apiKey is provided during update, validate it
      if (existingConfig && apiKey && typeof apiKey !== "string") {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: "API key must be a string" 
        });
      }
      
      let result;
      if (existingConfig) {
        // Update existing config - only include apiKey if provided
        const updateData: any = {
          isEnabled: isEnabled ?? true,
          addonPricingTiers: addonPricingTiers ?? '[{"minutes":100,"price":50},{"minutes":500,"price":200},{"minutes":1000,"price":350}]'
        };
        
        // Only update API key if a new one is provided
        if (apiKey) {
          updateData.apiKey = apiKey;
        }
        
        result = await storage.updateWhisperConfig(existingConfig.id, updateData);
      } else {
        // Create new config - apiKey is required here (validated above)
        result = await storage.createWhisperConfig({
          apiKey,
          isEnabled: isEnabled ?? true,
          addonPricingTiers: addonPricingTiers ?? '[{"minutes":100,"price":50},{"minutes":500,"price":200},{"minutes":1000,"price":350}]'
        });
      }
      
      if (!result) {
        return res.status(500).json({ 
          code: "SAVE_ERROR", 
          message: "Failed to save Whisper configuration" 
        });
      }

      // Update plan allocations if provided
      if (planAllocations && typeof planAllocations === 'object') {
        for (const [planId, minutes] of Object.entries(planAllocations)) {
          await db
            .update(subscriptionPlans)
            .set({ whisperDefaultMinutes: minutes as number })
            .where(eq(subscriptionPlans.id, planId));
        }
      }
      
      // Return safe config without decrypted key
      const { encryptedApiKey, ...safeConfig } = result;
      
      res.json({
        success: true,
        message: existingConfig ? "Configuration updated successfully" : "Configuration created successfully",
        config: {
          ...safeConfig,
          hasApiKey: !!encryptedApiKey
        }
      });
    } catch (error: any) {
      console.error("Failed to save Whisper config:", error);
      res.status(500).json({ code: "SAVE_ERROR", message: error.message });
    }
  });
  
  // Platform Admin - Get All Tenant Usage Analytics
  app.get("/api/whisper/usage/platform", adminOnlyMiddleware, async (req, res) => {
    try {
      // TODO: Implement cross-tenant usage aggregation
      // For now, return placeholder
      res.json({
        message: "Platform-wide usage analytics - Coming soon",
        totalTenants: 0,
        totalMinutesUsed: 0,
        totalCost: 0
      });
    } catch (error: any) {
      console.error("Failed to fetch platform usage:", error);
      res.status(500).json({ code: "FETCH_ERROR", message: error.message });
    }
  });
  
  // Tenant - Get Credit Balance
  app.get("/api/whisper/credits", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      
      const tenantId = sessionUser.tenantId;
      if (!tenantId) {
        return res.status(403).json({ code: "FORBIDDEN", message: "Platform admins cannot access tenant credits" });
      }
      
      let credits = await storage.getWhisperCredits(tenantId);
      
      if (!credits) {
        // Initialize credits for new tenant
        const nextReset = new Date();
        nextReset.setMonth(nextReset.getMonth() + 1);
        
        credits = await storage.createWhisperCredits(tenantId, {
          planMinutesCurrent: 0,
          addonMinutesBalance: 0,
          usedPlanMinutes: 0,
          usedAddonMinutes: 0,
          rolloverAddonMinutes: 0,
          nextResetAt: nextReset,
          enabled: true
        });
      }
      
      // Calculate remaining minutes
      const remainingMinutes = credits.planMinutesCurrent + credits.addonMinutesBalance;
      
      res.json({
        ...credits,
        remainingMinutes,
        totalAllocated: credits.planMinutesAllocated || 0
      });
    } catch (error: any) {
      console.error("Failed to fetch credits:", error);
      res.status(500).json({ code: "FETCH_ERROR", message: error.message });
    }
  });
  
  // Tenant - Get Usage History
  app.get("/api/whisper/usage", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      
      const tenantId = sessionUser.tenantId;
      if (!tenantId) {
        return res.status(403).json({ code: "FORBIDDEN", message: "Platform admins cannot access tenant usage" });
      }
      
      const { operation, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (operation) filters.operation = operation;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const usage = await storage.getWhisperUsage(tenantId, filters);
      const stats = await storage.getWhisperUsageStats(tenantId);
      
      res.json({
        usage,
        stats
      });
    } catch (error: any) {
      console.error("Failed to fetch usage:", error);
      res.status(500).json({ code: "FETCH_ERROR", message: error.message });
    }
  });
  
  // Tenant - Get Transaction History
  app.get("/api/whisper/transactions", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      
      const tenantId = sessionUser.tenantId;
      if (!tenantId) {
        return res.status(403).json({ code: "FORBIDDEN", message: "Platform admins cannot access tenant transactions" });
      }
      
      const transactions = await storage.getWhisperTransactions(tenantId);
      
      res.json({
        transactions
      });
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error);
      res.status(500).json({ code: "FETCH_ERROR", message: error.message });
    }
  });
  
  // Tenant - Get Available Addon Packages
  app.get("/api/whisper/addon-packages", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const tenantId = sessionUser.tenantId;
      if (!tenantId) {
        return res.status(403).json({ code: "FORBIDDEN", message: "Platform admins cannot purchase addons" });
      }

      const packages = await storage.getWhisperAddonPackages();
      
      res.json({
        success: true,
        packages
      });
    } catch (error: any) {
      console.error("[Whisper] Failed to get addon packages:", error);
      res.status(500).json({ code: "FETCH_ERROR", message: error.message });
    }
  });

  // Tenant - Purchase Addon Credits
  app.post("/api/whisper/purchase-addon", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const tenantId = sessionUser.tenantId;
      const userId = sessionUser.id;

      if (!tenantId) {
        return res.status(403).json({ code: "FORBIDDEN", message: "Platform admins cannot purchase addons" });
      }

      const schema = z.object({
        packageMinutes: z.number().int().positive(),
        packagePrice: z.number().positive(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional()
      });

      const validated = schema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: validated.error.errors[0].message 
        });
      }

      const { packageMinutes, packagePrice, paymentMethod, paymentReference } = validated.data;

      const packages = await storage.getWhisperAddonPackages();
      const validPackage = packages.find(
        p => p.minutes === packageMinutes && p.price === packagePrice
      );

      if (!validPackage) {
        return res.status(400).json({
          code: "INVALID_PACKAGE",
          message: "Invalid package selection. Please choose a valid addon package."
        });
      }

      const success = await storage.addWhisperAddonCredits(tenantId, packageMinutes, {
        amount: packagePrice,
        description: `Purchased ${packageMinutes} minutes addon package`,
        paymentMethod,
        paymentReference,
        purchasedBy: userId,
        purchasedAt: new Date().toISOString()
      });

      if (!success) {
        return res.status(500).json({
          code: "PURCHASE_FAILED",
          message: "Failed to add addon credits. Please try again."
        });
      }

      const updatedCredits = await storage.getWhisperCredits(tenantId);
      const remainingMinutes = updatedCredits
        ? (updatedCredits.planMinutes || 0) + (updatedCredits.addonMinutes || 0) - (updatedCredits.usedMinutes || 0)
        : 0;

      res.json({
        success: true,
        message: `Successfully added ${packageMinutes} minutes to your account`,
        creditsRemaining: remainingMinutes.toFixed(2)
      });
    } catch (error: any) {
      console.error("[Whisper] Addon purchase error:", error);
      res.status(500).json({ code: "PURCHASE_ERROR", message: error.message });
    }
  });

  // Tenant - Transcribe Audio
  app.post("/api/whisper/transcribe", audioUpload.single("audio"), async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const tenantId = sessionUser.tenantId;
      const userId = sessionUser.id;

      if (!tenantId) {
        return res.status(403).json({ code: "FORBIDDEN", message: "Platform admins cannot use transcription" });
      }

      if (!req.file) {
        return res.status(400).json({ code: "NO_FILE", message: "No audio file provided" });
      }

      const { WhisperService } = await import("./services/whisper");
      const { parseVoiceCommand } = await import("./services/commandParser");

      const whisperService = new WhisperService(storage);

      const result = await whisperService.transcribeWithCreditDeduction(
        req.file.buffer,
        req.file.originalname,
        tenantId,
        userId,
        req.body.feature || "voice_command",
        {
          language: req.body.language,
          prompt: req.body.prompt
        }
      );

      const command = parseVoiceCommand(result.text);

      // If it's a report command, fetch the report data
      let reportData = null;
      if (command.type !== "unknown" && command.type !== "create_lead" && 
          command.type !== "create_quotation" && command.type !== "create_customer" && 
          command.type !== "create_invoice") {
        try {
          const { ReportService } = await import("./services/reportService");
          const reportService = new ReportService(storage);
          reportData = await reportService.generateReport(
            command.type, 
            tenantId, 
            command.entities.limit || 5
          );
        } catch (reportError: any) {
          console.error("[Whisper] Report generation error:", reportError);
          // Don't fail the transcription, just log the error
        }
      }

      res.json({
        success: true,
        transcript: result.text,
        language: result.language,
        duration: result.duration,
        cost: result.cost,
        command: command.type !== "unknown" ? command : null,
        report: reportData
      });
    } catch (error: any) {
      console.error("[Whisper] Transcription error:", error);
      
      // Sanitized error responses - don't leak internal details
      if (error.message?.includes("Insufficient") || error.message?.includes("credits")) {
        return res.status(402).json({ 
          code: "INSUFFICIENT_CREDITS", 
          message: "Insufficient Voice AI credits. Please purchase addon credits."
        });
      }
      
      if (error.message?.includes("not enabled") || error.message?.includes("not initialized")) {
        return res.status(403).json({ 
          code: "SERVICE_DISABLED", 
          message: "Voice AI service is not available for your account"
        });
      }

      if (error.message?.includes("configuration error")) {
        return res.status(500).json({ 
          code: "SERVICE_ERROR", 
          message: "Voice AI service configuration error. Please contact support."
        });
      }

      // Generic error - don't expose internals
      res.status(500).json({ 
        code: "TRANSCRIPTION_ERROR", 
        message: "Transcription failed. Please try again or contact support if the issue persists."
      });
    }
  });

  // ========== END WHISPER VOICE AI API ==========

  // Cleanup orphaned users (admin only) - Deletes users whose tenant no longer exists
  app.post("/api/cleanup-orphaned-users", adminOnlyMiddleware, async (req, res) => {
    try {
      // Get all users with a tenantId (exclude platform admins who have null tenantId)
      const allUsers = await db
        .select()
        .from(users)
        .where(sql`${users.tenantId} IS NOT NULL`);

      // Get all existing tenant IDs
      const existingTenants = await db
        .select({ id: tenants.id })
        .from(tenants);
      
      const existingTenantIds = new Set(existingTenants.map(t => t.id));

      // Find orphaned users (users whose tenantId doesn't exist in tenants table)
      const orphanedUsers = allUsers.filter(user => !existingTenantIds.has(user.tenantId!));

      if (orphanedUsers.length === 0) {
        return res.json({ 
          success: true,
          message: "No orphaned users found",
          deletedCount: 0
        });
      }

      // Delete orphaned users
      const orphanedUserIds = orphanedUsers.map(u => u.id);
      await db
        .delete(users)
        .where(sql`${users.id} IN (${sql.join(orphanedUserIds.map(id => sql`${id}`), sql`, `)})`);

      res.json({ 
        success: true,
        message: `Deleted ${orphanedUsers.length} orphaned user(s)`,
        deletedCount: orphanedUsers.length,
        deletedEmails: orphanedUsers.map(u => u.email)
      });
    } catch (error: any) {
      console.error("Failed to cleanup orphaned users:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Check if email exists (for duplicate validation on registration form)
  app.get("/api/check-email-exists", async (req, res) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check in users table
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Check in tenants table
      const existingTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.email, email))
        .limit(1);

      // Check in pending registration requests
      const existingRequest = await db
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.email, email))
        .limit(1);

      const exists = existingUser.length > 0 || existingTenant.length > 0 || existingRequest.length > 0;

      res.json({ exists });
    } catch (error: any) {
      console.error("Email check error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get tenant/company name by email for login page
  app.get("/api/tenant-by-email", async (req, res) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      // First check if user exists
      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.tenantId) {
        return res.json({ found: false });
      }

      // Get tenant details
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, user.tenantId));

      if (!tenant) {
        return res.json({ found: false });
      }

      res.json({
        found: true,
        companyName: tenant.businessName,
        tenantId: tenant.id,
      });
    } catch (error: any) {
      console.error("Tenant lookup error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      });

      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ message: error.message });
      }

      const { email, password } = result.data;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if tenant is active (if user has a tenant)
      if (user.tenantId) {
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, user.tenantId));

        if (!tenant) {
          return res.status(401).json({ message: "Tenant not found" });
        }

        if (!tenant.isActive) {
          return res.status(401).json({ message: "Your organization's account is inactive. Please contact support." });
        }
      }

      if (user.status !== "Active") {
        return res.status(401).json({ message: "Your account is inactive. Please contact administrator." });
      }

      if (!user.password) {
        return res.status(401).json({ message: "Password not set for this account" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Update last login timestamp for activity tracking
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Fetch role permissions if user has a role
      let permissions: string[] = [];
      if (user.roleId && user.tenantId) {
        const role = await storage.getRole(user.tenantId, user.roleId);
        if (role) {
          permissions = role.permissions || [];
        }
      }

      // FALLBACK: If user has no role but has a tenantId, grant full permissions (tenant admin safety net)
      // This ensures existing tenant admins and new users without roles can still manage everything
      if (!user.roleId && user.tenantId) {
        permissions = [
          // Business Overview
          "Business Overview - View",
          // Customer Analytics
          "Customer Analytics - View",
          // Leads
          "Leads - View", "Leads - Create", "Leads - Edit", "Leads - Delete", "Leads - Export", "Leads - Import", "Leads - Print",
          // Quotations
          "Quotations - View", "Quotations - Create", "Quotations - Edit", "Quotations - Delete", "Quotations - Export", "Quotations - Import", "Quotations - Print",
          // Proforma Invoices
          "Proforma Invoices - View", "Proforma Invoices - Create", "Proforma Invoices - Edit", "Proforma Invoices - Delete", "Proforma Invoices - Export", "Proforma Invoices - Import", "Proforma Invoices - Print",
          // Invoices
          "Invoices - View", "Invoices - Create", "Invoices - Edit", "Invoices - Delete", "Invoices - Export", "Invoices - Import", "Invoices - Print",
          // Receipts
          "Receipts - View", "Receipts - Create", "Receipts - Edit", "Receipts - Delete", "Receipts - Export", "Receipts - Import", "Receipts - Print",
          // Debtors
          "Debtors - View", "Debtors - Export", "Debtors - Print",
          // Masters - Customers
          "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print",
          // Masters - Items
          "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print",
          // Risk Management
          "Risk Management - Client Risk Thermometer - View",
          "Risk Management - Payment Risk Forecaster - View",
          "Risk Management - Recovery Health Test - View",
          // Company Settings
          "Company Settings - View", "Company Settings - Edit",
          // User Management
          "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", "User Management - Export", "User Management - Import", "User Management - Print",
          // Roles Management
          "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", "Roles Management - Export", "Roles Management - Import", "Roles Management - Print",
          // Reports
          "Reports - View", "Reports - Export", "Reports - Print",
        ];
      }

      // Store user and tenantId in session
      (req.session as any).user = {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: user.roleName,
        tenantId: user.tenantId,
        isAdmin: user.isAdmin,
        permissions,
      };

      // Save session before responding
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to save session" });
        }
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Fetch fresh user data (tenantId can be null for platform admins)
      const user = await storage.getUser(sessionUser.tenantId || null, sessionUser.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.status !== "Active") {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Initialize permissions
      let permissions: string[] = [];
      let canViewGP = true;
      let allowedDashboardCards: string[] = [];
      let actionPermissions = {
        canEmail: true,
        canWhatsApp: true,
        canSMS: true,
        canCall: true,
        canReminder: true,
        canShare: true,
      };
      let isAdminLocked = false; // Flag to indicate locked admin permissions

      // ADMIN USERS: Fetch permissions from Admin role (always up-to-date with subscription plan)
      // Admin users get their permissions from the Admin role which is automatically synced with subscription plan
      if (user.isAdmin && user.tenantId && user.roleId) {
        isAdminLocked = true;
        const adminRole = await storage.getRole(user.tenantId, user.roleId);
        if (adminRole) {
          permissions = adminRole.permissions || [];
          canViewGP = true; // Admin always has GP access
          allowedDashboardCards = adminRole.allowedDashboardCards || [];
          actionPermissions = {
            canEmail: true,
            canWhatsApp: true,
            canSMS: true,
            canCall: true,
            canReminder: true,
            canShare: true,
          }; // Admin has all action permissions
        }
      }

      // NON-ADMIN USERS: Use role-based permissions
      if (!isAdminLocked && user.roleId && user.tenantId) {
        const role = await storage.getRole(user.tenantId, user.roleId);
        if (role) {
          permissions = role.permissions || [];
          canViewGP = role.canViewGP !== undefined ? role.canViewGP : true;
          allowedDashboardCards = role.allowedDashboardCards || [];
          actionPermissions = role.actionPermissions || actionPermissions;
        }
      }

      // Return user without password, including all role data
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        ...userWithoutPassword,
        permissions,
        canViewGP,
        allowedDashboardCards,
        actionPermissions,
        isAdminLocked, // Indicates if this user has locked admin permissions
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer Dashboard Analytics
  app.get("/api/customers/:id/dashboard-analytics", async (req, res) => {
    try {
      const customerId = req.params.id;
      
      // Get customer details
      const customer = await storage.getMasterCustomer(req.tenantId!, customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get all invoices, receipts, and master customers for calculations
      const [allInvoices, allReceipts, allMasterCustomers] = await Promise.all([
        storage.getInvoices(req.tenantId!),
        storage.getReceipts(req.tenantId!),
        storage.getMasterCustomers(req.tenantId!)
      ]);

      // Filter customer's invoices and receipts
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);

      // Calculate invoice summary
      const invoiceCount = customerInvoices.length;
      const invoiceAmount = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);

      // Calculate receipt summary
      const receiptCount = customerReceipts.length;
      const receiptAmount = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
      
      // Calculate TDS and Credit Note amounts
      const tdsReceipts = customerReceipts.filter(rec => rec.voucherType === 'TDS');
      const cnReceipts = customerReceipts.filter(rec => rec.voucherType === 'CN');
      const tdsAmount = tdsReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
      const cnAmount = cnReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);

      // Calculate interest amount for each invoice (sum of interest amounts)
      let totalInterestAmount = 0;
      const today = new Date();
      
      console.log(`[Interest Calculation] Customer: ${customer.clientName}, Total Invoices: ${customerInvoices.length}`);
      
      for (const invoice of customerInvoices) {
        const interestRate = parseFloat(invoice.interestRate || "0");
        const invoiceAmt = parseFloat(invoice.invoiceAmount);
        const paymentTerms = parseInt(String(invoice.paymentTerms || "0"));
        
        console.log(`[Invoice] #${invoice.invoiceNumber}: Rate=${interestRate}%, Amount=${invoiceAmt}, PaymentTerms=${paymentTerms} days, ApplicableFrom=${invoice.interestApplicableFrom}`);
        
        if (interestRate > 0 && invoice.interestApplicableFrom) {
          let applicableDate: Date | null = null;
          
          // If "Due Date", calculate from invoice date + payment terms
          if (invoice.interestApplicableFrom.toLowerCase() === 'due date') {
            applicableDate = new Date(invoice.invoiceDate);
            applicableDate.setDate(applicableDate.getDate() + paymentTerms);
          } else {
            // Try to parse as actual date
            applicableDate = new Date(invoice.interestApplicableFrom);
          }
          
          // Check if date is valid
          if (applicableDate && !isNaN(applicableDate.getTime())) {
            const diffTime = today.getTime() - applicableDate.getTime();
            const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (daysOverdue > 0) {
              const interestAmount = (invoiceAmt * interestRate * daysOverdue) / (100 * 365);
              totalInterestAmount += interestAmount;
              console.log(`[Interest] Due Date: ${applicableDate.toISOString().split('T')[0]}, Days Overdue: ${daysOverdue}, Interest Amount: ${interestAmount.toFixed(2)}`);
            } else {
              console.log(`[Interest] Not yet overdue. Due Date: ${applicableDate.toISOString().split('T')[0]}, Days until due: ${Math.abs(daysOverdue)}`);
            }
          } else {
            console.log(`[Interest] Invalid applicable date for invoice ${invoice.invoiceNumber}`);
          }
        }
      }
      
      console.log(`[Total Interest] Customer: ${customer.clientName}, Total Interest: ${totalInterestAmount.toFixed(2)}`);

      // Calculate debtor amount and opening balance for customer's category
      const categoryCustomers = allMasterCustomers.filter(c => c.category === customer.category);
      let categoryOpeningBalance = 0;
      let categoryDebtorAmount = 0;
      
      categoryCustomers.forEach((c) => {
        const custInvoices = allInvoices.filter(inv => inv.customerName === c.clientName);
        const custReceipts = allReceipts.filter(rec => rec.customerName === c.clientName);
        const custInvoiceTotal = custInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);
        const custReceiptTotal = custReceipts.reduce((s, rec) => s + parseFloat(rec.amount), 0);
        const openingBalance = parseFloat(c.openingBalance || "0");
        
        categoryOpeningBalance += openingBalance;
        categoryDebtorAmount += (openingBalance + custInvoiceTotal - custReceiptTotal);
      });

      // Calculate credit details - include opening balance in utilized credit
      const openingBalance = parseFloat(customer.openingBalance || "0");
      const creditLimit = parseFloat(customer.creditLimit || "0");
      const utilizedCredit = openingBalance + invoiceAmount - receiptAmount;
      const availableCredit = creditLimit - utilizedCredit;
      const utilizationPercentage = creditLimit > 0 ? (utilizedCredit / creditLimit) * 100 : 0;

      // Calculate customer's debtor amount
      const customerDebtorAmount = openingBalance + invoiceAmount - receiptAmount;

      // Calculate opening balance interest (if applicable)
      const openingBalanceInterestRate = parseFloat(customer.interestRate || "0");
      let openingBalanceInterest = 0;
      
      if (openingBalanceInterestRate > 0 && openingBalance > 0) {
        // Calculate interest from customer creation date
        const openingBalanceDate = new Date(customer.createdAt);
        const diffTime = today.getTime() - openingBalanceDate.getTime();
        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysPassed > 0) {
          openingBalanceInterest = (openingBalance * openingBalanceInterestRate * daysPassed) / (100 * 365);
        }
      }

      res.json({
        customer: {
          id: customer.id,
          clientName: customer.clientName,
          category: customer.category,
          status: customer.isActive,
          primaryMobile: customer.primaryMobile,
          primaryEmail: customer.primaryEmail,
          createdAt: customer.createdAt,
        },
        invoiceSummary: {
          count: invoiceCount,
          totalAmount: invoiceAmount.toFixed(2),
          avgAmount: invoiceCount > 0 ? (invoiceAmount / invoiceCount).toFixed(2) : "0.00",
        },
        receiptSummary: {
          count: receiptCount,
          totalAmount: receiptAmount.toFixed(2),
          lastPaymentDate: customerReceipts.length > 0 ? customerReceipts[0].date : null,
          tdsAmount: tdsAmount.toFixed(2),
          cnAmount: cnAmount.toFixed(2),
        },
        categoryInfo: {
          category: customer.category,
          totalDebtorAmount: categoryDebtorAmount.toFixed(2),
          categoryOpeningBalance: categoryOpeningBalance.toFixed(2),
          customerOpeningBalance: openingBalance.toFixed(2),
        },
        debtorAmount: customerDebtorAmount.toFixed(2),
        interestAmount: (totalInterestAmount + openingBalanceInterest).toFixed(2),
        interestBreakdown: {
          invoiceInterest: totalInterestAmount.toFixed(2),
          openingBalanceInterest: openingBalanceInterest.toFixed(2),
          totalInterest: (totalInterestAmount + openingBalanceInterest).toFixed(2),
        },
        creditInfo: {
          creditLimit: creditLimit.toFixed(2),
          utilizedCredit: utilizedCredit.toFixed(2),
          availableCredit: availableCredit.toFixed(2),
          utilizationPercentage: utilizationPercentage.toFixed(2),
        },
        status: {
          isActive: customer.isActive === "Active",
          customerSince: customer.createdAt,
          totalTransactions: invoiceCount + receiptCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Business Overview Dashboard Analytics
  app.get("/api/dashboard/business-overview", tenantMiddleware, async (req, res) => {
    try {
      const [allInvoices, allReceipts, allMasterCustomers] = await Promise.all([
        storage.getInvoices(req.tenantId!),
        storage.getReceipts(req.tenantId!),
        storage.getMasterCustomers(req.tenantId!)
      ]);

      // Financial Snapshot
      const totalRevenue = allInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
      const totalCollections = allReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount), 0);
      
      // Calculate total outstanding (opening balance + invoices - receipts)
      let totalOutstanding = 0;
      let totalInterest = 0;
      const today = new Date();

      allMasterCustomers.forEach((customer) => {
        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
        
        const invoiceTotal = customerInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);
        const receiptTotal = customerReceipts.reduce((s, rec) => s + parseFloat(rec.amount), 0);
        const openingBalance = parseFloat(customer.openingBalance || "0");
        
        totalOutstanding += (openingBalance + invoiceTotal - receiptTotal);

        // Calculate interest for this customer
        customerInvoices.forEach((invoice) => {
          const interestRate = parseFloat(invoice.interestRate || "0");
          const invoiceAmt = parseFloat(invoice.invoiceAmount);
          const paymentTerms = parseInt(String(invoice.paymentTerms || "0"));
          
          if (interestRate > 0 && invoice.interestApplicableFrom) {
            let applicableDate: Date | null = null;
            
            if (invoice.interestApplicableFrom.toLowerCase() === 'due date') {
              applicableDate = new Date(invoice.invoiceDate);
              applicableDate.setDate(applicableDate.getDate() + paymentTerms);
            } else {
              applicableDate = new Date(invoice.interestApplicableFrom);
            }
            
            if (applicableDate && !isNaN(applicableDate.getTime())) {
              const diffTime = today.getTime() - applicableDate.getTime();
              const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

              if (daysOverdue > 0) {
                const interestAmount = (invoiceAmt * interestRate * daysOverdue) / (100 * 365);
                totalInterest += interestAmount;
              }
            }
          }
        });
      });

      // Module Statistics
      const activeCustomers = allMasterCustomers.filter(c => c.isActive === "Active").length;
      const tdsAmount = allReceipts.filter(r => r.voucherType === 'TDS').reduce((s, r) => s + parseFloat(r.amount), 0);
      const cnAmount = allReceipts.filter(r => r.voucherType === 'CN').reduce((s, r) => s + parseFloat(r.amount), 0);
      
      const debtorsCount = allMasterCustomers.filter((customer) => {
        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
        const invoiceTotal = customerInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);
        const receiptTotal = customerReceipts.reduce((s, rec) => s + parseFloat(rec.amount), 0);
        const openingBalance = parseFloat(customer.openingBalance || "0");
        const outstanding = openingBalance + invoiceTotal - receiptTotal;
        return outstanding > 0;
      }).length;

      // Top 5 Customers by Revenue
      const customerRevenue = allMasterCustomers.map((customer) => {
        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const revenue = customerInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
        const receiptTotal = customerReceipts.reduce((s, rec) => s + parseFloat(rec.amount), 0);
        const openingBalance = parseFloat(customer.openingBalance || "0");
        const outstanding = openingBalance + revenue - receiptTotal;
        
        return {
          id: customer.id,
          name: customer.clientName,
          category: customer.category,
          revenue: revenue,
          outstanding: outstanding,
          transactionCount: customerInvoices.length + customerReceipts.length
        };
      });

      const top5ByRevenue = customerRevenue
        .filter(c => c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const top5ByOutstanding = customerRevenue
        .filter(c => c.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 5);

      // Recent Activity
      const recentInvoices = allInvoices
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          amount: inv.invoiceAmount,
          date: inv.invoiceDate,
          status: inv.status
        }));

      const recentReceipts = allReceipts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(rec => ({
          id: rec.id,
          voucherNumber: rec.voucherNumber,
          customerName: rec.customerName,
          amount: rec.amount,
          date: rec.date,
          voucherType: rec.voucherType
        }));

      // Overdue Invoices
      const overdueInvoices = allInvoices
        .filter(inv => {
          if (inv.status === 'Paid') return false;
          const paymentTerms = parseInt(String(inv.paymentTerms || "0"));
          const dueDate = new Date(inv.invoiceDate);
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          return dueDate < today;
        })
        .sort((a, b) => {
          const dateA = new Date(a.invoiceDate);
          const dateB = new Date(b.invoiceDate);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 5)
        .map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          amount: inv.invoiceAmount,
          date: inv.invoiceDate,
          daysOverdue: Math.floor((today.getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24))
        }));

      // Category-wise outstanding
      const categoryStats: { [key: string]: number } = {};
      allMasterCustomers.forEach((customer) => {
        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
        const invoiceTotal = customerInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);
        const receiptTotal = customerReceipts.reduce((s, rec) => s + parseFloat(rec.amount), 0);
        const openingBalance = parseFloat(customer.openingBalance || "0");
        const outstanding = openingBalance + invoiceTotal - receiptTotal;
        
        if (outstanding > 0) {
          const category = customer.category || 'Uncategorized';
          categoryStats[category] = (categoryStats[category] || 0) + outstanding;
        }
      });

      const categoryOutstanding = Object.entries(categoryStats).map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2))
      }));

      // Total Opening Balance (sum of all customers' opening balances)
      const totalOpeningBalance = allMasterCustomers.reduce((sum, c) => 
        sum + parseFloat(c.openingBalance || "0"), 0
      );

      res.json({
        financialSnapshot: {
          totalRevenue: totalRevenue.toFixed(2),
          totalCollections: totalCollections.toFixed(2),
          totalOutstanding: totalOutstanding.toFixed(2),
          totalInterest: totalInterest.toFixed(2),
          totalOpeningBalance: totalOpeningBalance.toFixed(2)
        },
        moduleStats: {
          invoices: {
            count: allInvoices.length,
            totalAmount: totalRevenue.toFixed(2)
          },
          receipts: {
            count: allReceipts.length,
            totalAmount: totalCollections.toFixed(2),
            tdsAmount: tdsAmount.toFixed(2),
            cnAmount: cnAmount.toFixed(2)
          },
          customers: {
            total: allMasterCustomers.length,
            active: activeCustomers
          },
          debtors: {
            count: debtorsCount,
            totalOutstanding: totalOutstanding.toFixed(2)
          }
        },
        topCustomers: {
          byRevenue: top5ByRevenue.map(c => ({
            ...c,
            revenue: c.revenue.toFixed(2),
            outstanding: c.outstanding.toFixed(2)
          })),
          byOutstanding: top5ByOutstanding.map(c => ({
            ...c,
            revenue: c.revenue.toFixed(2),
            outstanding: c.outstanding.toFixed(2)
          }))
        },
        recentActivity: {
          invoices: recentInvoices,
          receipts: recentReceipts,
          overdueInvoices: overdueInvoices
        },
        charts: {
          categoryOutstanding: categoryOutstanding
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoice Status Cards (6 categories based on grace period logic)
  app.get("/api/dashboard/invoice-status-cards", tenantMiddleware, async (req, res) => {
    try {
      const stats = await storage.getInvoiceStatusCards(req.tenantId!);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Risk Management: Client Risk Thermometer
  app.get("/api/risk/client-thermometer", async (req, res) => {
    try {
      const [allInvoices, allReceipts, allMasterCustomers] = await Promise.all([
        storage.getInvoices(req.tenantId!),
        storage.getReceipts(req.tenantId!),
        storage.getMasterCustomers(req.tenantId!)
      ]);

      const today = new Date();
      const customerRisks = allMasterCustomers.map((customer) => {
        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
        
        const invoiceTotal = customerInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);
        const receiptTotal = customerReceipts.reduce((s, rec) => s + parseFloat(rec.amount), 0);
        const openingBalance = parseFloat(customer.openingBalance || "0");
        const outstanding = openingBalance + invoiceTotal - receiptTotal;
        const creditLimit = parseFloat(customer.creditLimit || "0");

        // Calculate payment delays
        let totalDelays = 0;
        let delayedPayments = 0;
        let overdueInvoices = 0;
        
        customerInvoices.forEach((invoice) => {
          const paymentTerms = parseInt(String(invoice.paymentTerms || "30"));
          const dueDate = new Date(invoice.invoiceDate);
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          
          if (invoice.status !== 'Paid' && dueDate < today) {
            overdueInvoices++;
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            totalDelays += daysOverdue;
            delayedPayments++;
          }
        });

        const avgDelay = delayedPayments > 0 ? totalDelays / delayedPayments : 0;
        const creditUtilization = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;

        // Risk score calculation (0-100)
        let riskScore = 0;
        
        // Factor 1: Credit Utilization (40 points)
        if (creditUtilization > 80) riskScore += 40;
        else if (creditUtilization > 50) riskScore += 25;
        else if (creditUtilization > 30) riskScore += 15;
        
        // Factor 2: Average Payment Delay (30 points)
        if (avgDelay > 30) riskScore += 30;
        else if (avgDelay > 15) riskScore += 20;
        else if (avgDelay > 5) riskScore += 10;
        
        // Factor 3: Overdue Invoices Count (30 points)
        if (overdueInvoices > 5) riskScore += 30;
        else if (overdueInvoices > 3) riskScore += 20;
        else if (overdueInvoices > 0) riskScore += 10;

        // Risk Level
        let riskLevel = 'Low';
        if (riskScore >= 70) riskLevel = 'High';
        else if (riskScore >= 30) riskLevel = 'Medium';

        return {
          customerId: customer.id,
          customerName: customer.clientName,
          category: customer.category,
          riskScore: Math.min(riskScore, 100),
          riskLevel,
          factors: {
            creditUtilization: creditUtilization.toFixed(2),
            avgPaymentDelay: avgDelay.toFixed(0),
            overdueInvoices,
            outstanding: outstanding.toFixed(2),
            creditLimit: creditLimit.toFixed(2)
          }
        };
      });

      // Sort by risk score descending
      customerRisks.sort((a, b) => b.riskScore - a.riskScore);

      res.json({
        customers: customerRisks,
        summary: {
          highRisk: customerRisks.filter(c => c.riskLevel === 'High').length,
          mediumRisk: customerRisks.filter(c => c.riskLevel === 'Medium').length,
          lowRisk: customerRisks.filter(c => c.riskLevel === 'Low').length,
          totalCustomers: customerRisks.length
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Risk Management: Payment Risk Forecaster
  app.get("/api/risk/payment-forecaster", async (req, res) => {
    try {
      const [allInvoices, allReceipts, allMasterCustomers] = await Promise.all([
        storage.getInvoices(req.tenantId!),
        storage.getReceipts(req.tenantId!),
        storage.getMasterCustomers(req.tenantId!)
      ]);

      const today = new Date();
      const forecasts = allMasterCustomers.map((customer) => {
        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);
        
        // Calculate historical payment pattern
        let onTimePayments = 0;
        let latePayments = 0;
        let totalPaymentDays = 0;

        customerInvoices.forEach((invoice) => {
          if (invoice.status === 'Paid') {
            const paymentTerms = parseInt(String(invoice.paymentTerms || "30"));
            const dueDate = new Date(invoice.invoiceDate);
            dueDate.setDate(dueDate.getDate() + paymentTerms);
            
            // Find receipt for this invoice (simplified matching)
            const receipt = customerReceipts.find(r => 
              new Date(r.date) >= new Date(invoice.invoiceDate) &&
              parseFloat(r.amount) === parseFloat(invoice.invoiceAmount)
            );
            
            if (receipt) {
              const paymentDate = new Date(receipt.date);
              const daysDiff = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              totalPaymentDays += Math.max(daysDiff, 0);
              
              if (daysDiff <= 0) onTimePayments++;
              else latePayments++;
            }
          }
        });

        const totalPaidInvoices = onTimePayments + latePayments;
        const onTimeRate = totalPaidInvoices > 0 ? (onTimePayments / totalPaidInvoices) * 100 : 50;
        const avgDelayDays = totalPaidInvoices > 0 ? totalPaymentDays / totalPaidInvoices : 0;

        // Unpaid invoices
        const unpaidInvoices = customerInvoices.filter(inv => inv.status !== 'Paid');
        const unpaidAmount = unpaidInvoices.reduce((s, inv) => s + parseFloat(inv.invoiceAmount), 0);

        // Forecast risk probability
        let stuckProbability = 0;
        
        if (onTimeRate < 50) stuckProbability += 40;
        else if (onTimeRate < 70) stuckProbability += 25;
        else if (onTimeRate < 85) stuckProbability += 10;
        
        if (avgDelayDays > 20) stuckProbability += 30;
        else if (avgDelayDays > 10) stuckProbability += 15;
        else if (avgDelayDays > 5) stuckProbability += 5;
        
        if (unpaidInvoices.length > 5) stuckProbability += 30;
        else if (unpaidInvoices.length > 2) stuckProbability += 15;

        stuckProbability = Math.min(stuckProbability, 100);

        // Predict expected payment date (for next unpaid invoice)
        let expectedPaymentDate = null;
        if (unpaidInvoices.length > 0) {
          const nextInvoice = unpaidInvoices[0];
          const paymentTerms = parseInt(String(nextInvoice.paymentTerms || "30"));
          const predicted = new Date(nextInvoice.invoiceDate);
          predicted.setDate(predicted.getDate() + paymentTerms + Math.round(avgDelayDays));
          expectedPaymentDate = predicted;
        }

        return {
          customerId: customer.id,
          customerName: customer.clientName,
          category: customer.category,
          stuckProbability: stuckProbability.toFixed(0),
          expectedPaymentDate,
          metrics: {
            onTimeRate: onTimeRate.toFixed(1),
            avgDelayDays: avgDelayDays.toFixed(0),
            unpaidInvoices: unpaidInvoices.length,
            unpaidAmount: unpaidAmount.toFixed(2)
          }
        };
      });

      // Sort by stuck probability descending
      forecasts.sort((a, b) => parseFloat(b.stuckProbability) - parseFloat(a.stuckProbability));

      res.json({
        forecasts: forecasts.filter(f => parseFloat(f.stuckProbability) > 0),
        summary: {
          highRisk: forecasts.filter(f => parseFloat(f.stuckProbability) >= 70).length,
          mediumRisk: forecasts.filter(f => parseFloat(f.stuckProbability) >= 30 && parseFloat(f.stuckProbability) < 70).length,
          lowRisk: forecasts.filter(f => parseFloat(f.stuckProbability) > 0 && parseFloat(f.stuckProbability) < 30).length
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Risk Management: Recovery System Health Test
  app.get("/api/risk/recovery-health", async (req, res) => {
    try {
      const [allInvoices, allReceipts, allMasterCustomers] = await Promise.all([
        storage.getInvoices(req.tenantId!),
        storage.getReceipts(req.tenantId!),
        storage.getMasterCustomers(req.tenantId!)
      ]);

      const today = new Date();
      
      // Calculate recovery metrics
      const paidInvoices = allInvoices.filter(inv => inv.status === 'Paid');
      const unpaidInvoices = allInvoices.filter(inv => inv.status !== 'Paid');
      
      // Average collection time
      let totalCollectionDays = 0;
      let collectionCount = 0;

      paidInvoices.forEach((invoice) => {
        const receipt = allReceipts.find(r => 
          new Date(r.date) >= new Date(invoice.invoiceDate) &&
          r.customerName === invoice.customerName
        );
        
        if (receipt) {
          const collectionDays = Math.floor(
            (new Date(receipt.date).getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          totalCollectionDays += collectionDays;
          collectionCount++;
        }
      });

      const avgCollectionDays = collectionCount > 0 ? totalCollectionDays / collectionCount : 0;

      // Recovery rate by age bucket
      const buckets = {
        '0-30': { total: 0, recovered: 0 },
        '31-60': { total: 0, recovered: 0 },
        '61-90': { total: 0, recovered: 0 },
        '90+': { total: 0, recovered: 0 }
      };

      allInvoices.forEach((invoice) => {
        const invoiceAge = Math.floor((today.getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
        let bucket: '0-30' | '31-60' | '61-90' | '90+' = '90+';
        if (invoiceAge <= 30) bucket = '0-30';
        else if (invoiceAge <= 60) bucket = '31-60';
        else if (invoiceAge <= 90) bucket = '61-90';

        buckets[bucket].total++;
        if (invoice.status === 'Paid') buckets[bucket].recovered++;
      });

      const recoveryRates = Object.entries(buckets).map(([age, data]) => ({
        ageBucket: age,
        total: data.total,
        recovered: data.recovered,
        rate: data.total > 0 ? ((data.recovered / data.total) * 100).toFixed(1) : '0.0'
      }));

      // Overall recovery rate
      const totalInvoices = allInvoices.length;
      const recoveredInvoices = paidInvoices.length;
      const overallRecoveryRate = totalInvoices > 0 ? (recoveredInvoices / totalInvoices) * 100 : 0;

      // Calculate health score
      let healthScore = 0;
      
      // Factor 1: Average collection time (40 points)
      if (avgCollectionDays < 30) healthScore += 40;
      else if (avgCollectionDays < 60) healthScore += 25;
      else if (avgCollectionDays < 90) healthScore += 10;
      
      // Factor 2: Overall recovery rate (40 points)
      if (overallRecoveryRate > 85) healthScore += 40;
      else if (overallRecoveryRate > 70) healthScore += 25;
      else if (overallRecoveryRate > 50) healthScore += 15;
      
      // Factor 3: Recent recovery trend (20 points) - simplified
      const recentInvoices = allInvoices.filter(inv => {
        const age = Math.floor((today.getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
        return age <= 60;
      });
      const recentRecoveryRate = recentInvoices.length > 0 ? 
        (recentInvoices.filter(inv => inv.status === 'Paid').length / recentInvoices.length) * 100 : 0;
      
      if (recentRecoveryRate > 80) healthScore += 20;
      else if (recentRecoveryRate > 60) healthScore += 12;
      else if (recentRecoveryRate > 40) healthScore += 5;

      // Health level
      let healthLevel = 'Weak';
      if (healthScore >= 80) healthLevel = 'Strong';
      else if (healthScore >= 50) healthLevel = 'Moderate';

      // Recommendations
      const recommendations = [];
      if (avgCollectionDays > 45) {
        recommendations.push('Increase follow-up frequency - average collection time is high');
      }
      if (overallRecoveryRate < 70) {
        recommendations.push('Improve recovery process - recovery rate below target');
      }
      if (unpaidInvoices.length > 20) {
        recommendations.push('Focus on high-value overdue invoices first');
      }
      if (buckets['90+'].total - buckets['90+'].recovered > 5) {
        recommendations.push('Consider legal action for invoices overdue >90 days');
      }

      res.json({
        healthScore,
        healthLevel,
        metrics: {
          avgCollectionDays: avgCollectionDays.toFixed(0),
          overallRecoveryRate: overallRecoveryRate.toFixed(1),
          recentRecoveryRate: recentRecoveryRate.toFixed(1),
          totalInvoices,
          recoveredInvoices,
          pendingInvoices: unpaidInvoices.length
        },
        recoveryRates,
        recommendations
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all customers
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers(req.tenantId!);
      
      // Fetch the most recent past and next future follow-ups for each customer
      const customersWithFollowUps = await Promise.all(
        customers.map(async (customer) => {
          const followUps = await storage.getFollowUpsByCustomer(req.tenantId!, customer.id);
          const now = new Date();
          
          // Split follow-ups into past and future
          const pastFollowUps = followUps.filter(f => new Date(f.followUpDateTime) < now);
          const futureFollowUps = followUps.filter(f => new Date(f.followUpDateTime) >= now);
          
          // Get the most recent past follow-up (first in DESC sorted array)
          const lastFollowUp = pastFollowUps.length > 0 ? pastFollowUps[0] : null;
          
          // Get the nearest future follow-up (last in DESC sorted array)
          const nextFollowUp = futureFollowUps.length > 0 ? futureFollowUps[futureFollowUps.length - 1] : null;
          
          return {
            ...customer,
            lastFollowUpRemarks: lastFollowUp?.remarks || null,
            lastFollowUpDate: lastFollowUp?.followUpDateTime || null,
            lastFollowUpType: lastFollowUp?.type || null,
            nextFollowUpDate: nextFollowUp?.followUpDateTime || null,
            nextFollowUpType: nextFollowUp?.type || null,
          };
        })
      );
      
      res.json(customersWithFollowUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample import template (must be before :id route)
  app.get("/api/customers/sample-template", async (_req, res) => {
    try {
      const sampleData = [
        {
          Name: "John Doe",
          "Amount Owed": "15000.00",
          Category: "Alpha",
          "Assigned User": "Manpreet Bedi",
          Mobile: "+919876543210",
          Email: "john.doe@example.com",
        },
        {
          Name: "Jane Smith",
          "Amount Owed": "25000.50",
          Category: "Beta",
          "Assigned User": "Bilal Ahamad",
          Mobile: "+918765432109",
          Email: "jane.smith@example.com",
        },
        {
          Name: "Robert Johnson",
          "Amount Owed": "10500.75",
          Category: "Gamma",
          "Assigned User": "Anjali Dhiman",
          Mobile: "+917654321098",
          Email: "robert.j@example.com",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Data");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=customer_import_template.xlsx");
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.tenantId!, req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const result = insertCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const customer = await storage.createCustomer(req.tenantId!, result.data);
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const result = insertCustomerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const customer = await storage.updateCustomer(req.tenantId!, req.params.id, result.data);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const success = await storage.deleteCustomer(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk assign sales person to customers
  app.post("/api/customers/bulk-assign-salesperson", async (req, res) => {
    try {
      const { customerIds, salesPerson } = req.body;
      
      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({ message: "customerIds array is required" });
      }
      
      if (!salesPerson || typeof salesPerson !== 'string') {
        return res.status(400).json({ message: "salesPerson is required" });
      }

      let updatedCount = 0;
      for (const customerId of customerIds) {
        const customer = await storage.getMasterCustomer(req.tenantId!, customerId);
        if (customer) {
          await storage.updateMasterCustomer(req.tenantId!, customerId, { salesPerson });
          updatedCount++;
        }
      }

      res.json({ 
        message: `Successfully assigned ${updatedCount} customer(s) to ${salesPerson}`,
        updatedCount
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get payments for a customer
  app.get("/api/customers/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByCustomer(req.tenantId!, req.params.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create payment
  app.post("/api/payments", async (req, res) => {
    try {
      const result = insertPaymentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const payment = await storage.createPayment(req.tenantId!, result.data);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update payment
  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const result = insertPaymentSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const payment = await storage.updatePayment(req.tenantId!, req.params.id, result.data);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete payment
  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const success = await storage.deletePayment(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get follow-ups for a customer
  app.get("/api/customers/:id/followups", async (req, res) => {
    try {
      const followUps = await storage.getFollowUpsByCustomer(req.tenantId!, req.params.id);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create follow-up
  app.post("/api/followups", async (req, res) => {
    try {
      const result = insertFollowUpSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const followUp = await storage.createFollowUp(req.tenantId!, result.data);
      res.status(201).json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update follow-up
  app.patch("/api/followups/:id", async (req, res) => {
    try {
      const result = insertFollowUpSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const followUp = await storage.updateFollowUp(req.tenantId!, req.params.id, result.data);
      if (!followUp) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete follow-up
  app.delete("/api/followups/:id", async (req, res) => {
    try {
      const success = await storage.deleteFollowUp(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete customers
  app.post("/api/customers/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid request: ids array required" });
      }

      const count = await storage.deleteCustomers(req.tenantId!, ids);
      res.json({ deleted: count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Excel import
  app.post("/api/customers/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const customers = data.map((row: any) => ({
        name: row.name || row.Name || "",
        amountOwed: String(row.amountOwed || row["Amount Owed"] || row.amount || 0),
        category: row.category || row.Category || "Alpha",
        assignedUser: row.assignedUser || row["Assigned User"] || undefined,
        mobile: row.mobile || row.Mobile || row.phone || "",
        email: row.email || row.Email || "",
      }));

      const results = [];
      const errors = [];

      for (let i = 0; i < customers.length; i++) {
        const result = insertCustomerSchema.safeParse(customers[i]);
        if (result.success) {
          const customer = await storage.createCustomer(req.tenantId!, result.data);
          results.push(customer);
        } else {
          errors.push({ row: i + 1, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        customers: results,
        errorDetails: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Excel export
  app.get("/api/customers/export", async (req, res) => {
    try {
      const customers = await storage.getCustomers(req.tenantId!);
      
      const data = customers.map(customer => ({
        Name: customer.name,
        "Amount Owed": customer.amountOwed,
        Category: customer.category,
        "Assigned User": customer.assignedUser || "",
        Mobile: customer.mobile,
        Email: customer.email,
        "Created At": customer.createdAt.toISOString(),
      }));

      sendSecureExcelFile(res, data, {
        filename: "customers.xlsx",
        sheetName: "Customers",
        title: "Customers Data Export",
        subject: "Customer Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== MASTER CUSTOMERS ROUTES ====================
  
  // Get all master customers
  app.get("/api/masters/customers", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      let customers = await storage.getMasterCustomers(req.tenantId!);
      
      // For non-admin users, filter customers to show only those assigned to them
      if (sessionUser && !sessionUser.isAdmin) {
        const userDetails = await storage.getUser(req.tenantId!, sessionUser.id);
        if (userDetails) {
          const userName = userDetails.name;
          customers = customers.filter(
            (customer: any) => customer.salesPerson === userName
          );
        }
      }
      
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get customer details by client name (for invoice dropdown auto-populate)
  app.get("/api/masters/customers/by-name/:clientName", async (req, res) => {
    try {
      const clientName = decodeURIComponent(req.params.clientName);
      const customers = await storage.getMasterCustomers(req.tenantId!);
      const customer = customers.find(c => c.clientName.toLowerCase().trim() === clientName.toLowerCase().trim());
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample import template for master customers (MUST BE BEFORE /:id)
  app.get("/api/masters/customers/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          "CLIENT NAME": "ABC Corporation Pvt Ltd",
          "CATEGORY": "Alpha",
          "PRIMARY CONTACT": "Rajesh Kumar",
          "PRIMARY MOBILE": "9876543210",
          "PRIMARY EMAIL": "rajesh@abccorp.com",
          "SECONDARY CONTACT": "Priya Sharma",
          "SECONDARY MOBILE": "9876543211",
          "SECONDARY EMAIL": "priya@abccorp.com",
          "GSTIN": "27AABCU9603R1ZM",
          "BILLING ADDRESS": "123 Business Park, MG Road",
          "CITY": "Mumbai",
          "STATE": "Maharashtra",
          "PINCODE": "400001",
          "PAYMENT TERMS (DAYS)": "30",
          "CREDIT LIMIT": "500000",
          "OPENING BALANCE": "50000",
          "INTEREST APPLICABLE FROM": "Invoice Date",
          "INTEREST RATE": "18",
          "SALES PERSON": "John Doe",
          "STATUS": "Active",
        },
        {
          "CLIENT NAME": "XYZ Industries Limited",
          "CATEGORY": "Beta",
          "PRIMARY CONTACT": "Amit Patel",
          "PRIMARY MOBILE": "9123456789",
          "PRIMARY EMAIL": "amit@xyzindustries.com",
          "SECONDARY CONTACT": "",
          "SECONDARY MOBILE": "",
          "SECONDARY EMAIL": "",
          "GSTIN": "29AAFCD5862R1Z5",
          "BILLING ADDRESS": "456 Industrial Estate, Sector 5",
          "CITY": "Bangalore",
          "STATE": "Karnataka",
          "PINCODE": "560001",
          "PAYMENT TERMS (DAYS)": "45",
          "CREDIT LIMIT": "1000000",
          "OPENING BALANCE": "",
          "INTEREST APPLICABLE FROM": "Due Date",
          "INTEREST RATE": "15",
          "SALES PERSON": "Jane Smith",
          "STATUS": "Active",
        },
        {
          "CLIENT NAME": "Tech Solutions India",
          "CATEGORY": "Gamma",
          "PRIMARY CONTACT": "Suresh Menon",
          "PRIMARY MOBILE": "9988776655",
          "PRIMARY EMAIL": "suresh@techsolutions.in",
          "SECONDARY CONTACT": "",
          "SECONDARY MOBILE": "",
          "SECONDARY EMAIL": "",
          "GSTIN": "27AACCT1234E1Z1",
          "BILLING ADDRESS": "789 IT Park, Phase 2",
          "CITY": "Pune",
          "STATE": "Maharashtra",
          "PINCODE": "411001",
          "PAYMENT TERMS (DAYS)": "60",
          "CREDIT LIMIT": "250000",
          "OPENING BALANCE": "25000",
          "INTEREST APPLICABLE FROM": "",
          "INTEREST RATE": "12",
          "SALES PERSON": "",
          "STATUS": "Active",
        },
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "master_customers_template.xlsx",
        sheetName: "Sample Data",
        title: "Master Customers Import Template",
        subject: "Customer Master Data Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export all master customers to Excel (MUST BE BEFORE /:id)
  app.get("/api/masters/customers/export", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      let customers = await storage.getMasterCustomers(req.tenantId!);
      
      // For non-admin users, filter customers to show only those assigned to them
      if (sessionUser && !sessionUser.isAdmin) {
        const userDetails = await storage.getUser(req.tenantId!, sessionUser.id);
        if (userDetails) {
          const userName = userDetails.name;
          customers = customers.filter(
            (customer: any) => customer.salesPerson === userName
          );
        }
      }
      
      const data = customers.map(customer => ({
        "CLIENT NAME": customer.clientName,
        "CATEGORY": customer.category,
        "PRIMARY CONTACT": customer.primaryContactName || "",
        "PRIMARY MOBILE": customer.primaryMobile || "",
        "PRIMARY EMAIL": customer.primaryEmail || "",
        "SECONDARY CONTACT": customer.secondaryContactName || "",
        "SECONDARY MOBILE": customer.secondaryMobile || "",
        "SECONDARY EMAIL": customer.secondaryEmail || "",
        "GSTIN": customer.gstNumber || "",
        "BILLING ADDRESS": customer.billingAddress || "",
        "CITY": customer.city || "",
        "STATE": customer.state || "",
        "PINCODE": customer.pincode || "",
        "PAYMENT TERMS (DAYS)": customer.paymentTermsDays,
        "CREDIT LIMIT": customer.creditLimit || "",
        "OPENING BALANCE": customer.openingBalance || "",
        "INTEREST APPLICABLE FROM": customer.interestApplicableFrom || "",
        "INTEREST RATE": customer.interestRate || "",
        "SALES PERSON": customer.salesPerson || "",
        "STATUS": customer.isActive,
      }));

      sendSecureExcelFile(res, data, {
        filename: "master_customers_export.xlsx",
        sheetName: "Master Customers",
        title: "Master Customers Data Export",
        subject: "Customer Master Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import master customers from Excel (MUST BE BEFORE /:id)
  app.post("/api/masters/customers/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if flexible import is enabled
      const flexibleImport = req.body.flexibleImport === "true";

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const customers = data.map((row: any) => ({
        clientName: String(row["CLIENT NAME"] || row["Client Name"] || row.clientName || row.ClientName || "").trim(),
        category: String(row["CATEGORY"] || row["Category"] || row.category || "").trim(),
        primaryContactName: String(row["PRIMARY CONTACT"] || row["Primary Contact"] || row.primaryContactName || row.PrimaryContactName || "").trim() || undefined,
        primaryMobile: String(row["PRIMARY MOBILE"] || row["Primary Mobile"] || row.primaryMobile || row.PrimaryMobile || "").trim(),
        primaryEmail: String(row["PRIMARY EMAIL"] || row["Primary Email"] || row.primaryEmail || row.PrimaryEmail || "").trim(),
        secondaryContactName: String(row["SECONDARY CONTACT"] || row["Secondary Contact"] || row.secondaryContactName || row.SecondaryContactName || "").trim() || undefined,
        secondaryMobile: String(row["SECONDARY MOBILE"] || row["Secondary Mobile"] || row.secondaryMobile || row.SecondaryMobile || "").trim() || undefined,
        secondaryEmail: String(row["SECONDARY EMAIL"] || row["Secondary Email"] || row.secondaryEmail || row.SecondaryEmail || "").trim() || undefined,
        gstNumber: String(row["GSTIN"] || row["GST Number"] || row.gstNumber || row.GSTNumber || row.GST || "").trim(),
        billingAddress: String(row["BILLING ADDRESS"] || row["Billing Address"] || row.billingAddress || row.BillingAddress || "").trim(),
        city: String(row["CITY"] || row["City"] || row.city || "").trim(),
        state: String(row["STATE"] || row["State"] || row.state || "").trim() || undefined,
        pincode: String(row["PINCODE"] || row["Pin Code"] || row["Pincode"] || row.pincode || "").trim() || undefined,
        paymentTermsDays: String(row["PAYMENT TERMS (DAYS)"] || row["Payment Terms (Days)"] || row["Payment Terms"] || row.paymentTermsDays || row.PaymentTerms || "").trim(),
        creditLimit: String(row["CREDIT LIMIT"] || row["Credit Limit"] || row.creditLimit || row.CreditLimit || "").trim(),
        openingBalance: String(row["OPENING BALANCE"] || row["Opening Balance"] || row.openingBalance || row.OpeningBalance || "").trim() || undefined,
        interestApplicableFrom: String(row["INTEREST APPLICABLE FROM"] || row["Interest Applicable From"] || row.interestApplicableFrom || row.InterestApplicableFrom || "").trim() || undefined,
        interestRate: String(row["INTEREST RATE"] || row["Interest Rate (%)"] || row["Interest Rate"] || row.interestRate || row.InterestRate || "").trim(),
        salesPerson: String(row["SALES PERSON"] || row["Sales Person"] || row.salesPerson || row.SalesPerson || "").trim() || undefined,
        isActive: (() => {
          const value = row["STATUS"] || row["Status"] || row["Is Active"] || row.isActive || row.status;
          if (value === undefined || value === null) return "Active";
          if (typeof value === 'boolean') return value ? "Active" : "Inactive";
          const strValue = String(value).trim().toLowerCase();
          if (strValue === 'true' || strValue === 'active' || strValue === '1') return "Active";
          if (strValue === 'false' || strValue === 'inactive' || strValue === '0') return "Inactive";
          return "Active";
        })(),
      }));

      const results = [];
      const errors = [];
      
      // Get existing customers to check for duplicates
      const existingCustomers = await storage.getMasterCustomers(req.tenantId!);
      const existingNames = new Set(
        existingCustomers.map(c => c.clientName.toLowerCase().trim())
      );

      for (let i = 0; i < customers.length; i++) {
        // Use flexible or strict schema based on import mode
        const schema = flexibleImport ? insertMasterCustomerSchemaFlexible : insertMasterCustomerSchema;
        const result = schema.safeParse(customers[i]);
        
        if (result.success) {
          // Check for duplicate name
          const normalizedName = result.data.clientName.toLowerCase().trim();
          if (existingNames.has(normalizedName)) {
            errors.push({ 
              row: i + 2, 
              error: `Duplicate customer name: "${result.data.clientName}" already exists in database`
            });
          } else {
            // For flexible import, provide defaults for required fields
            const customerData: any = flexibleImport ? {
              ...result.data,
              category: result.data.category || "Alpha",
              primaryMobile: result.data.primaryMobile || "",
              primaryEmail: result.data.primaryEmail || "",
              gstNumber: result.data.gstNumber || "",
              billingAddress: result.data.billingAddress || "",
              city: result.data.city || "",
              pincode: result.data.pincode || "",
              paymentTermsDays: result.data.paymentTermsDays || "0",
              creditLimit: result.data.creditLimit || "0",
              interestRate: result.data.interestRate || "0",
            } : result.data;
            
            const customer = await storage.createMasterCustomer(req.tenantId!, customerData);
            results.push(customer);
            // Add to existing names to prevent duplicates within the import batch
            existingNames.add(normalizedName);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        customers: results,
        errorDetails: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete master customers (MUST BE BEFORE /:id)
  app.post("/api/masters/customers/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteMasterCustomers(req.tenantId!, ids);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'customers',
        action: 'delete',
        data: { ids }
      });
      
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk update interest rate for all customers
  app.post("/api/masters/customers/bulk-update-interest", async (req, res) => {
    try {
      const { interestRate } = req.body;
      if (interestRate === undefined || interestRate === null) {
        return res.status(400).json({ message: "Interest rate is required" });
      }
      const customers = await storage.getMasterCustomers(req.tenantId!);
      const updates = await Promise.all(
        customers.map(customer => 
          storage.updateMasterCustomer(req.tenantId!, customer.id, { interestRate: interestRate.toString() })
        )
      );
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'customers',
        action: 'update',
        data: { bulkUpdate: true }
      });
      
      res.json({ updated: updates.length, message: "Interest rate updated for all customers" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create master customer
  app.post("/api/masters/customers", async (req, res) => {
    try {
      const result = insertMasterCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // Check for duplicate customer name
      const existingCustomers = await storage.getMasterCustomers(req.tenantId!);
      const normalizedName = result.data.clientName.toLowerCase().trim();
      const duplicate = existingCustomers.find(
        c => c.clientName.toLowerCase().trim() === normalizedName
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: `Customer with name "${result.data.clientName}" already exists` 
        });
      }
      
      const customer = await storage.createMasterCustomer(req.tenantId!, result.data);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'customers',
        action: 'create',
        data: { id: customer.id }
      });
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update master customer
  app.put("/api/masters/customers/:id", async (req, res) => {
    try {
      const result = insertMasterCustomerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // If updating clientName, check for duplicates
      if (result.data.clientName) {
        const existingCustomers = await storage.getMasterCustomers(req.tenantId!);
        const normalizedName = result.data.clientName.toLowerCase().trim();
        const duplicate = existingCustomers.find(
          c => c.id !== req.params.id && c.clientName.toLowerCase().trim() === normalizedName
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: `Customer with name "${result.data.clientName}" already exists` 
          });
        }
      }
      
      const customer = await storage.updateMasterCustomer(req.tenantId!, req.params.id, result.data);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'customers',
        action: 'update',
        data: { id: customer.id }
      });
      
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete master customer
  app.delete("/api/masters/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMasterCustomer(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'customers',
        action: 'delete',
        data: { id: req.params.id }
      });
      
      res.json({ message: "Customer deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single master customer (MUST BE AFTER specific routes)
  app.get("/api/masters/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getMasterCustomer(req.tenantId!, req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== MASTER ITEMS ROUTES =====

  // Get all master items
  app.get("/api/masters/items", async (req, res) => {
    try {
      const items = await storage.getMasterItems(req.tenantId!);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample template for import (MUST BE BEFORE /:id)
  app.get("/api/masters/items/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          "Item Type": "product",
          "Name": "Laptop - Dell XPS 15",
          "Description": "High-performance laptop for professionals",
          "Unit": "PCS",
          "Tax": "18%",
          "SKU": "LAP-DEL-001",
          "Sale Unit Price": "85000",
          "Buy Unit Price": "70000",
          "Opening Quantity": "10",
          "HSN": "8471",
          "SAC": ""
        },
        {
          "Item Type": "service",
          "Name": "IT Consulting",
          "Description": "Professional IT consultation services",
          "Unit": "Hour",
          "Tax": "18%",
          "SKU": "SRV-IT-001",
          "Sale Unit Price": "2500",
          "Buy Unit Price": "",
          "Opening Quantity": "",
          "HSN": "",
          "SAC": "998314"
        }
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "master_items_template.xlsx",
        sheetName: "Master Items Template",
        title: "Master Items Import Template",
        subject: "Items Master Data Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export master items (MUST BE BEFORE /:id)
  app.get("/api/masters/items/export", async (req, res) => {
    try {
      const items = await storage.getMasterItems(req.tenantId!);
      
      const data = items.map(item => ({
        "Item Type": item.itemType,
        "Name": item.name,
        "Description": item.description || "",
        "Unit": item.unit,
        "Tax": item.tax,
        "SKU": item.sku,
        "Sale Unit Price": item.saleUnitPrice,
        "Buy Unit Price": item.buyUnitPrice || "",
        "Opening Quantity": item.openingQuantity || "",
        "HSN": item.hsn || "",
        "SAC": item.sac || "",
        "Status": item.isActive,
        "Created At": item.createdAt.toISOString(),
      }));

      sendSecureExcelFile(res, data, {
        filename: "master_items_export.xlsx",
        sheetName: "Master Items",
        title: "Master Items Data Export",
        subject: "Items Master Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import master items from Excel (MUST BE BEFORE /:id)
  app.post("/api/masters/items/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const items = data.map((row: any) => ({
        itemType: String(row["Item Type"] || row.itemType || row.ItemType || "").trim().toLowerCase(),
        name: String(row["Name"] || row.name || "").trim(),
        description: String(row["Description"] || row.description || "").trim() || undefined,
        unit: String(row["Unit"] || row.unit || "").trim(),
        tax: String(row["Tax"] || row.tax || "").trim(),
        sku: String(row["SKU"] || row.sku || "").trim(),
        saleUnitPrice: String(row["Sale Unit Price"] || row.saleUnitPrice || row.SaleUnitPrice || "").trim(),
        buyUnitPrice: String(row["Buy Unit Price"] || row.buyUnitPrice || row.BuyUnitPrice || "").trim() || undefined,
        openingQuantity: String(row["Opening Quantity"] || row.openingQuantity || row.OpeningQuantity || "").trim() || undefined,
        hsn: String(row["HSN"] || row.hsn || "").trim() || undefined,
        sac: String(row["SAC"] || row.sac || "").trim() || undefined,
      }));

      const results = [];
      const errors = [];
      
      // Get existing items to check for duplicates
      const existingItems = await storage.getMasterItems(req.tenantId!);
      const existingNames = new Set(
        existingItems.map(item => item.name.toLowerCase().trim())
      );

      for (let i = 0; i < items.length; i++) {
        const result = insertMasterItemSchema.safeParse(items[i]);
        if (result.success) {
          // Check for duplicate name
          const normalizedName = result.data.name.toLowerCase().trim();
          if (existingNames.has(normalizedName)) {
            errors.push({ 
              row: i + 2, 
              error: `Duplicate item name: "${result.data.name}" already exists in database`
            });
          } else {
            const item = await storage.createMasterItem(req.tenantId!, result.data);
            results.push(item);
            // Add to existing names to prevent duplicates within the import batch
            existingNames.add(normalizedName);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        items: results,
        errorDetails: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete master items (MUST BE BEFORE /:id)
  app.post("/api/masters/items/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteMasterItems(req.tenantId!, ids);
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create master item
  app.post("/api/masters/items", async (req, res) => {
    try {
      const result = insertMasterItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // Check for duplicate item name
      const existingItems = await storage.getMasterItems(req.tenantId!);
      const normalizedName = result.data.name.toLowerCase().trim();
      const duplicate = existingItems.find(
        item => item.name.toLowerCase().trim() === normalizedName
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: `Item with name "${result.data.name}" already exists` 
        });
      }
      
      const item = await storage.createMasterItem(req.tenantId!, result.data);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update master item
  app.put("/api/masters/items/:id", async (req, res) => {
    try {
      const result = insertMasterItemSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // If updating name, check for duplicates
      if (result.data.name) {
        const existingItems = await storage.getMasterItems(req.tenantId!);
        const normalizedName = result.data.name.toLowerCase().trim();
        const duplicate = existingItems.find(
          item => item.id !== req.params.id && item.name.toLowerCase().trim() === normalizedName
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: `Item with name "${result.data.name}" already exists` 
          });
        }
      }
      
      const item = await storage.updateMasterItem(req.tenantId!, req.params.id, result.data);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete master item
  app.delete("/api/masters/items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMasterItem(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json({ message: "Item deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single master item (MUST BE AFTER specific routes)
  app.get("/api/masters/items/:id", async (req, res) => {
    try {
      const item = await storage.getMasterItem(req.tenantId!, req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== INVOICE ROUTES =====

  // FIFO Allocation Algorithm - Calculate invoice statuses and Final G.P. based on receipt allocation
  async function calculateInvoiceStatuses(tenantId: string, customerName: string) {
    try {
      console.log(`\n***** STARTING CALCULATION for ${customerName} *****`);
      
      // Get all invoices for the customer (ordered by invoice date - oldest first)
      const customerInvoices = await storage.getInvoicesByCustomerName(tenantId, customerName);
      console.log(`Found ${customerInvoices.length} invoices`);
      
      // Get all receipts for the customer (sorted by date - oldest first)
      const customerReceipts = await storage.getReceiptsByCustomerName(tenantId, customerName);
      const sortedReceipts = customerReceipts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      console.log(`Found ${sortedReceipts.length} receipts`);
      
      // Calculate total receipt amount
      const totalReceiptAmount = sortedReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);
      console.log(`Total Receipt Amount: ₹${totalReceiptAmount}`);
      
      // Track cumulative allocation across all invoices for proper FIFO
      let cumulativeAllocated = 0;
      let remainingReceiptAmount = totalReceiptAmount;
      
      for (const invoice of customerInvoices) {
        const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
        let status: "Paid" | "Unpaid" | "Partial";
        let paidAmount = 0;
        const invoiceStartAllocation = cumulativeAllocated;
        
        if (remainingReceiptAmount >= invoiceAmount) {
          // Fully paid
          status = "Paid";
          paidAmount = invoiceAmount;
          cumulativeAllocated += invoiceAmount;
          remainingReceiptAmount -= invoiceAmount;
        } else if (remainingReceiptAmount > 0 && remainingReceiptAmount < invoiceAmount) {
          // Partially paid
          status = "Partial";
          paidAmount = remainingReceiptAmount;
          cumulativeAllocated += remainingReceiptAmount;
          remainingReceiptAmount = 0;
        } else {
          // Unpaid
          status = "Unpaid";
          paidAmount = 0;
        }
        
        // Calculate Final G.P. using the same logic as interest breakdown report
        let finalGp: number | null = null;
        let finalGpPercentage: number | null = null;
        let totalInterest = 0;
        
        // Calculate interest if interest rate is set
        if (invoice.interestRate && parseFloat(invoice.interestRate.toString()) > 0) {
          const invoiceDate = new Date(invoice.invoiceDate);
          const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          
          // Determine interest applicable date
          let applicableDate: Date;
          if (invoice.interestApplicableFrom === "Due Date") {
            applicableDate = dueDate;
          } else if (invoice.interestApplicableFrom === "Invoice Date") {
            applicableDate = invoiceDate;
          } else {
            applicableDate = dueDate;
          }
          
          const invoiceEndAllocation = invoiceStartAllocation + paidAmount;
          let receiptCumulative = 0;
          let currentBalance = invoiceAmount;
          let previousDate = applicableDate; // Start from applicable date for period calculation
          
          // Calculate PERIOD-BASED interest for each receipt that contributes to this invoice
          for (const receipt of sortedReceipts) {
            const receiptAmount = parseFloat(receipt.amount.toString());
            const prevCumulative = receiptCumulative;
            receiptCumulative += receiptAmount;
            
            // Check if this receipt contributes to this invoice
            if (receiptCumulative > invoiceStartAllocation && prevCumulative < invoiceEndAllocation) {
              const allocatedAmount = Math.min(
                receiptAmount,
                invoiceEndAllocation - Math.max(prevCumulative, invoiceStartAllocation)
              );
              
              const receiptDate = new Date(receipt.date);
              
              // Calculate PERIOD days (days between previous date and current receipt)
              // IMPORTANT: Clamp period start to applicable date to handle early receipts correctly
              const periodStartDate = previousDate.getTime() > applicableDate.getTime() 
                ? previousDate 
                : applicableDate;
              
              const diffTime = receiptDate.getTime() - periodStartDate.getTime();
              const daysInPeriod = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              
              // Calculate interest on current balance for THIS PERIOD ONLY (including first period from applicable date)
              if (receiptDate > applicableDate && currentBalance > 0 && daysInPeriod > 0) {
                const interestRate = parseFloat(invoice.interestRate.toString());
                // Period-based interest: Balance × Rate × Days in Period / (100 × 365)
                const interestAmount = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
                totalInterest += interestAmount;
              }
              
              // Update for next iteration
              currentBalance = Math.max(currentBalance - allocatedAmount, 0);
              previousDate = receiptDate; // Next period starts from this receipt date
            }
          }
          
          // Calculate final period interest for unpaid balance (from last receipt or applicable date to today)
          if (currentBalance > 0) {
            const today = new Date();
            
            // Only calculate if we're past the applicable date
            if (today > applicableDate) {
              // IMPORTANT: Clamp start date to applicable date to handle early receipts correctly
              const periodStartDate = previousDate.getTime() > applicableDate.getTime() 
                ? previousDate 
                : applicableDate;
              
              const diffTime = today.getTime() - periodStartDate.getTime();
              const daysInPeriod = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
              
              if (daysInPeriod > 0) {
                const interestRate = parseFloat(invoice.interestRate.toString());
                // Period-based interest for unpaid balance
                const unpaidInterest = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
                totalInterest += unpaidInterest;
              }
            }
          }
          
          // Final G.P. = G.P. - Total Interest
          const gp = parseFloat(invoice.gp.toString());
          finalGp = gp - totalInterest;
          
          // Final G.P. % = Final G.P. * 100 / Invoice Amount
          if (invoiceAmount > 0) {
            finalGpPercentage = (finalGp * 100) / invoiceAmount;
          }
          
          // Debug logging
          console.log(`\n=== Final G.P. Calculation ===`);
          console.log(`Invoice: ${invoice.invoiceNumber} | Customer: ${invoice.customerName}`);
          console.log(`Status: ${status} | G.P.: ₹${gp} | Interest: ₹${totalInterest}`);
          console.log(`Formula: ${gp} - ${totalInterest} = ${finalGp}`);
          console.log(`Final G.P.: ₹${finalGp} | Final G.P. %: ${finalGpPercentage}%`);
          console.log(`================================\n`);
        } else {
          // No interest rate set, Final G.P. = G.P.
          const gp = parseFloat(invoice.gp.toString());
          finalGp = gp;
          if (invoiceAmount > 0) {
            finalGpPercentage = (finalGp * 100) / invoiceAmount;
          }
        }
        
        // Update invoice if status, interest, or Final G.P. changed
        const needsUpdate = invoice.status !== status || 
                          (totalInterest !== null && invoice.interestAmount !== totalInterest.toString()) ||
                          (finalGp !== null && invoice.finalGp !== finalGp.toString()) ||
                          (finalGpPercentage !== null && invoice.finalGpPercentage !== finalGpPercentage.toString());
        
        if (needsUpdate) {
          const updateData: any = { status };
          if (totalInterest !== null) {
            updateData.interestAmount = totalInterest.toFixed(2);
          }
          if (finalGp !== null) {
            updateData.finalGp = finalGp.toFixed(2);
          }
          if (finalGpPercentage !== null) {
            updateData.finalGpPercentage = finalGpPercentage.toFixed(2);
          }
          
          // Update directly in database
          await db.update(invoices).set(updateData).where(eq(invoices.id, invoice.id));
        }
      }
    } catch (error) {
      console.error("Error calculating invoice statuses:", error);
      throw error;
    }
  }

  // Get all invoices
  app.get("/api/invoices", requirePermission("Invoices", "view"), async (req, res) => {
    try {
      const invoices = await storage.getInvoices(req.tenantId!);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get dashboard stats for invoices (MUST BE BEFORE /:id)
  app.get("/api/invoices/dashboard-stats", async (req, res) => {
    try {
      const { dateFilterMode, selectedYear, selectedMonth, dateRangeFrom, dateRangeTo, globalFilter, columnFilters } = req.query;
      
      let allInvoices = await storage.getInvoices(req.tenantId!);
      
      // Apply date filtering based on query parameters
      if (dateFilterMode === "month" && selectedYear && selectedMonth !== undefined) {
        const year = parseInt(selectedYear as string);
        const month = parseInt(selectedMonth as string);
        allInvoices = allInvoices.filter(invoice => {
          const invoiceDate = new Date(invoice.invoiceDate);
          return invoiceDate.getFullYear() === year && invoiceDate.getMonth() === month;
        });
      } else if (dateFilterMode === "dateRange") {
        const fromDate = dateRangeFrom ? new Date(dateRangeFrom as string) : null;
        const toDate = dateRangeTo ? new Date(dateRangeTo as string) : null;
        
        allInvoices = allInvoices.filter(invoice => {
          const invoiceDate = new Date(invoice.invoiceDate);
          
          if (fromDate && toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            return invoiceDate >= fromDate && invoiceDate <= endOfDay;
          } else if (fromDate) {
            return invoiceDate >= fromDate;
          } else if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            return invoiceDate <= endOfDay;
          }
          
          return true;
        });
      }

      // Apply global filter
      if (globalFilter && typeof globalFilter === 'string' && globalFilter.trim() !== '') {
        const filterText = globalFilter.toLowerCase().trim();
        allInvoices = allInvoices.filter(invoice => {
          const searchableFields = [
            invoice.customerName,
            invoice.invoiceNumber,
            invoice.category,
            invoice.city,
            invoice.pincode,
            invoice.primaryMobile,
            invoice.salesPerson
          ];
          
          return searchableFields.some(field => 
            field && field.toString().toLowerCase().includes(filterText)
          );
        });
      }

      // Apply column filters
      if (columnFilters && typeof columnFilters === 'string') {
        try {
          const parsedFilters = JSON.parse(columnFilters);
          if (Array.isArray(parsedFilters)) {
            parsedFilters.forEach((filter: { id: string; value: any }) => {
              if (filter.value && filter.value.toString().trim() !== '') {
                const filterValue = filter.value.toString().toLowerCase().trim();
                allInvoices = allInvoices.filter(invoice => {
                  const fieldValue = (invoice as any)[filter.id];
                  return fieldValue && fieldValue.toString().toLowerCase().includes(filterValue);
                });
              }
            });
          }
        } catch (e) {
          console.error('Error parsing columnFilters:', e);
        }
      }
      
      const invoices = allInvoices;
      const receipts = await storage.getReceipts(req.tenantId!);

      // Group receipts by customer
      const receiptsByCustomer = new Map<string, typeof receipts>();
      receipts.forEach(receipt => {
        const existing = receiptsByCustomer.get(receipt.customerName) || [];
        existing.push(receipt);
        receiptsByCustomer.set(receipt.customerName, existing);
      });

      // Group invoices by customer
      const invoicesByCustomer = new Map<string, typeof invoices>();
      invoices.forEach(invoice => {
        const existing = invoicesByCustomer.get(invoice.customerName) || [];
        existing.push(invoice);
        invoicesByCustomer.set(invoice.customerName, existing);
      });

      let totalInvoicesAmount = 0;
      let paidInvoicesAmount = 0;
      let partialPaidAmount = 0;
      let partialBalanceAmount = 0;
      let unpaidInvoicesAmount = 0;
      let totalPaidAmount = 0;
      let totalInterestAmount = 0;
      let interestApplicableInvoicesCount = 0;
      
      // Add counts
      let totalInvoicesCount = 0;
      let paidInvoicesCount = 0;
      let partialInvoicesCount = 0;
      let unpaidInvoicesCount = 0;

      // Calculate total paid amount (sum of all receipts)
      totalPaidAmount = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);

      // Process each customer's invoices with FIFO logic
      for (const [customerName, customerInvoices] of Array.from(invoicesByCustomer.entries())) {
        const customerReceipts = receiptsByCustomer.get(customerName) || [];
        const totalReceiptAmount = customerReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);
        
        // Sort invoices by date (oldest first) for FIFO
        const sortedInvoices = [...customerInvoices].sort((a, b) => 
          new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
        );

        let remainingReceiptAmount = totalReceiptAmount;

        for (const invoice of sortedInvoices) {
          const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
          totalInvoicesAmount += invoiceAmount;
          totalInvoicesCount++;

          let allocatedPayment = 0;
          let status: "Paid" | "Unpaid" | "Partial";

          if (remainingReceiptAmount >= invoiceAmount) {
            // Fully paid
            status = "Paid";
            allocatedPayment = invoiceAmount;
            remainingReceiptAmount -= invoiceAmount;
            paidInvoicesAmount += invoiceAmount;
            paidInvoicesCount++;
          } else if (remainingReceiptAmount > 0 && remainingReceiptAmount < invoiceAmount) {
            // Partially paid
            status = "Partial";
            allocatedPayment = remainingReceiptAmount;
            const balance = invoiceAmount - allocatedPayment;
            partialPaidAmount += allocatedPayment; // FIX: Only count the amount that's been paid
            partialBalanceAmount += balance;
            partialInvoicesCount++;
            remainingReceiptAmount = 0;
          } else {
            // Unpaid
            status = "Unpaid";
            allocatedPayment = 0;
            unpaidInvoicesAmount += invoiceAmount;
            unpaidInvoicesCount++;
          }

          // Use stored interest amount from invoice (calculated with cumulative days methodology)
          if (invoice.interestAmount) {
            const interestAmount = parseFloat(invoice.interestAmount.toString());
            if (interestAmount > 0) {
              totalInterestAmount += interestAmount;
              interestApplicableInvoicesCount++;
            }
          }
        }
      }

      // Calculate debtors balance (opening balance + invoices - receipts)
      const masterCustomers = await storage.getMasterCustomers(req.tenantId!);
      const allInvoicesForDebtors = await storage.getInvoices(req.tenantId!);
      const allReceiptsForDebtors = await storage.getReceipts(req.tenantId!);
      
      let debtorsBalance = 0;
      let debtorsCount = 0;
      
      for (const customer of masterCustomers) {
        const customerInvoicesTotal = allInvoicesForDebtors
          .filter(inv => inv.customerName === customer.clientName)
          .reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
        
        const customerReceiptsTotal = allReceiptsForDebtors
          .filter(rec => rec.customerName === customer.clientName)
          .reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
        
        const openingBalance = parseFloat(customer.openingBalance?.toString() || '0');
        const balance = openingBalance + customerInvoicesTotal - customerReceiptsTotal;
        
        if (balance > 0) {
          debtorsBalance += balance;
          debtorsCount++;
        }
      }

      res.json({
        totalInvoicesAmount,
        paidInvoicesAmount,
        partialPaidAmount,
        partialBalanceAmount,
        unpaidInvoicesAmount,
        totalPaidAmount,
        totalInterestAmount,
        interestApplicableInvoicesCount,
        debtorsBalance,
        totalInvoicesCount,
        paidInvoicesCount,
        partialInvoicesCount,
        unpaidInvoicesCount,
        debtorsCount,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download sample template for import (MUST BE BEFORE /:id)
  app.get("/api/invoices/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          "Invoice Number": "INV-2025-001",
          "Customer Name": "ABC Corporation Pvt Ltd",
          "Invoice Date": "2025-01-15",
          "Invoice Amount": "150000",
          "G.P.": "45000"
        },
        {
          "Invoice Number": "INV-2025-002",
          "Customer Name": "XYZ Industries Limited",
          "Invoice Date": "2025-01-20",
          "Invoice Amount": "250000",
          "G.P.": "75000"
        },
        {
          "Invoice Number": "INV-2025-003",
          "Customer Name": "Tech Solutions India",
          "Invoice Date": "2025-01-25",
          "Invoice Amount": "180000",
          "G.P.": ""
        }
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "invoices_template.xlsx",
        sheetName: "Invoices Template",
        title: "Invoices Import Template",
        subject: "Invoice Data Import Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export invoices (MUST BE BEFORE /:id)
  app.get("/api/invoices/export", async (req, res) => {
    try {
      const invoices = await storage.getInvoices(req.tenantId!);
      
      const data = invoices.map(invoice => ({
        "Invoice Number": invoice.invoiceNumber,
        "Customer Name": invoice.customerName,
        "Invoice Date": invoice.invoiceDate.toISOString().split('T')[0],
        "Invoice Amount": invoice.invoiceAmount,
        "G.P.": invoice.gp,
      }));

      sendSecureExcelFile(res, data, {
        filename: "invoices_export.xlsx",
        sheetName: "Invoices",
        title: "Invoices Data Export",
        subject: "Invoice Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import invoices from Excel (MUST BE BEFORE /:id)
  app.post("/api/invoices/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = [];
      const errors = [];
      const duplicates = [];

      const uniqueCustomers = new Set<string>();
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Parse date - Excel exports dates as serial numbers or formatted strings
        let dateValue = (row as any)["Invoice Date"];
        let parsedDate = "";
        
        if (typeof dateValue === 'number') {
          // Excel serial date number (days since 1/1/1900)
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
          parsedDate = date.toISOString().split('T')[0];
        } else if (dateValue) {
          // Try to parse as string
          parsedDate = String(dateValue).trim();
        }
        
        // Get G.P. value, default to "0" if empty or not provided
        const gpValue = String((row as any)["G.P."] || (row as any)["GP"] || (row as any)["Net Profit"] || "").trim();
        const gp = gpValue === "" ? "0" : gpValue;
        
        const customerName = String((row as any)["Customer Name"] || "").trim();
        
        // Auto-populate customer details from master customers
        let customerDetails = {};
        if (customerName) {
          const masterCustomers = await storage.getMasterCustomers(req.tenantId!);
          const customer = masterCustomers.find(c => c.clientName.toLowerCase().trim() === customerName.toLowerCase().trim());
          if (customer) {
            customerDetails = {
              category: customer.category || undefined,
              primaryMobile: customer.primaryMobile || undefined,
              city: customer.city || undefined,
              pincode: customer.pincode || undefined,
              paymentTerms: customer.paymentTermsDays ? parseInt(customer.paymentTermsDays) : undefined,
              creditLimit: customer.creditLimit || undefined,
              interestApplicableFrom: customer.interestApplicableFrom || undefined,
              interestRate: customer.interestRate || undefined,
              salesPerson: customer.salesPerson || undefined,
            };
          }
        }
        
        const invoiceData = {
          invoiceNumber: String((row as any)["Invoice Number"] || "").trim(),
          customerName: customerName,
          invoiceDate: parsedDate,
          invoiceAmount: String((row as any)["Invoice Amount"] || "0").trim(),
          gp: gp,
          ...customerDetails,
        };

        const result = insertInvoiceSchema.safeParse(invoiceData);
        if (result.success) {
          // Check if invoice number already exists
          const existingInvoice = await storage.getInvoiceByNumber(req.tenantId!, result.data.invoiceNumber);
          if (existingInvoice) {
            duplicates.push({ 
              row: i + 2, 
              invoiceNumber: result.data.invoiceNumber,
              error: `Duplicate invoice number: ${result.data.invoiceNumber}` 
            });
          } else {
            const invoice = await storage.createInvoice(req.tenantId!, result.data);
            results.push(invoice);
            // Track unique customer names for FIFO recalculation
            uniqueCustomers.add(invoice.customerName);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      // Recalculate invoice statuses using FIFO for all affected customers
      for (const customerName of Array.from(uniqueCustomers)) {
        await calculateInvoiceStatuses(req.tenantId!, customerName);
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        duplicates: duplicates.length,
        invoices: results,
        errorDetails: errors,
        duplicateDetails: duplicates
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete invoices (MUST BE BEFORE /:id)
  app.post("/api/invoices/bulk-delete", requirePermission("Invoices", "delete"), async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteInvoices(req.tenantId!, ids);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'invoices',
        action: 'delete',
        data: { ids }
      });
      
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create invoice
  app.post("/api/invoices", requirePermission("Invoices", "create"), async (req, res) => {
    try {
      const result = insertInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      // Set initial status to Unpaid
      const invoiceData = { ...result.data, status: "Unpaid" as const };
      const invoice = await storage.createInvoice(req.tenantId!, invoiceData);
      
      // Recalculate all invoice statuses for this customer using FIFO
      await calculateInvoiceStatuses(req.tenantId!, invoice.customerName);
      
      // Get the updated invoice with the calculated status
      const updatedInvoice = await storage.getInvoice(req.tenantId!, invoice.id);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'invoices',
        action: 'create',
        data: { id: updatedInvoice.id }
      });
      
      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update invoice
  app.put("/api/invoices/:id", requirePermission("Invoices", "edit"), async (req, res) => {
    try {
      const result = insertInvoiceSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      const invoice = await storage.updateInvoice(req.tenantId!, req.params.id, result.data);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Recalculate all invoice statuses for this customer using FIFO
      await calculateInvoiceStatuses(req.tenantId!, invoice.customerName);
      
      // Get the updated invoice with the calculated status
      const updatedInvoice = await storage.getInvoice(req.tenantId!, invoice.id);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'invoices',
        action: 'update',
        data: { id: updatedInvoice.id }
      });
      
      res.json(updatedInvoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete invoice
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'invoices',
        action: 'delete',
        data: { id: req.params.id }
      });
      
      res.json({ message: "Invoice deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get interest breakdown for an invoice (MUST BE BEFORE /:id)
  app.get("/api/invoices/:id/interest-breakdown", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.tenantId!, req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get all receipts for this customer
      const customerReceipts = await storage.getReceiptsByCustomerName(req.tenantId!, invoice.customerName);
      const sortedReceipts = customerReceipts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get all invoices for this customer to calculate FIFO allocation
      const customerInvoices = await storage.getInvoicesByCustomerName(req.tenantId!, invoice.customerName);

      // Calculate FIFO allocation for the target invoice
      const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
      const invoiceDate = new Date(invoice.invoiceDate);
      const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      // Determine interest applicable date
      let applicableDate: Date;
      if (invoice.interestApplicableFrom === "Due Date") {
        applicableDate = dueDate;
      } else if (invoice.interestApplicableFrom === "Invoice Date") {
        applicableDate = invoiceDate;
      } else {
        applicableDate = dueDate;
      }

      // Calculate total receipt amount
      const totalReceiptAmount = sortedReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);

      // Find this invoice's position in FIFO queue
      let cumulativeAllocated = 0;
      let invoiceStartAllocation = 0;
      let invoiceEndAllocation = 0;
      let paidAmount = 0;
      let status: "Paid" | "Unpaid" | "Partial" = "Unpaid";

      for (const inv of customerInvoices) {
        const invAmount = parseFloat(inv.invoiceAmount.toString());
        const remainingReceipt = totalReceiptAmount - cumulativeAllocated;

        if (inv.id === invoice.id) {
          // This is our target invoice
          invoiceStartAllocation = cumulativeAllocated;

          if (remainingReceipt >= invAmount) {
            status = "Paid";
            paidAmount = invAmount;
            invoiceEndAllocation = cumulativeAllocated + invAmount;
          } else if (remainingReceipt > 0) {
            status = "Partial";
            paidAmount = remainingReceipt;
            invoiceEndAllocation = cumulativeAllocated + remainingReceipt;
          } else {
            status = "Unpaid";
            paidAmount = 0;
            invoiceEndAllocation = cumulativeAllocated;
          }
          break;
        }

        // Allocate receipts to earlier invoices
        if (remainingReceipt >= invAmount) {
          cumulativeAllocated += invAmount;
        } else if (remainingReceipt > 0) {
          cumulativeAllocated += remainingReceipt;
        }
      }

      // Build receipt allocation breakdown with PERIOD-BASED interest
      const receiptAllocations: any[] = [];
      let receiptCumulative = 0;
      let totalInterest = 0;
      let currentBalance = invoiceAmount;
      let previousDate = applicableDate; // Start from applicable date (due date or invoice date)
      let dueDateRowAdded = false;
      let firstReceiptProcessed = false;

      for (const receipt of sortedReceipts) {
        const receiptAmount = parseFloat(receipt.amount.toString());
        const prevCumulative = receiptCumulative;
        receiptCumulative += receiptAmount;

        // Check if this receipt contributes to this invoice
        if (receiptCumulative > invoiceStartAllocation && prevCumulative < invoiceEndAllocation) {
          const allocatedAmount = Math.min(
            receiptAmount,
            invoiceEndAllocation - Math.max(prevCumulative, invoiceStartAllocation)
          );

          const receiptDate = new Date(receipt.date);
          
          // Add DUE DATE row ONCE before first receipt (if after applicable date)
          if (!dueDateRowAdded) {
            receiptAllocations.push({
              isDueDateRow: true,
              receiptDate: applicableDate.toISOString(),
              balanceAmount: currentBalance,
              message: "Interest Starts from Here",
            });
            dueDateRowAdded = true;
            previousDate = applicableDate; // Start period from applicable date
          }
          
          // Calculate PERIOD days (days between previous date and current receipt date)
          // IMPORTANT: Clamp period start to applicable date to handle early receipts correctly
          const periodStartDate = previousDate.getTime() > applicableDate.getTime() 
            ? previousDate 
            : applicableDate;
          
          const diffTime = receiptDate.getTime() - periodStartDate.getTime();
          const daysInPeriod = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
          
          // Calculate interest on current balance for THIS PERIOD ONLY
          let interestAmount = 0;
          
          // Interest only applies after applicable date
          if (receiptDate > applicableDate && invoice.interestRate && currentBalance > 0 && daysInPeriod > 0) {
            const interestRate = parseFloat(invoice.interestRate.toString());
            // Period-based interest: Balance × Rate × Days in Period / (100 × 365)
            interestAmount = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
          }

          totalInterest += interestAmount;

          // Determine status based on receipt date vs applicable date
          let receiptStatus = "On Time";
          if (receiptDate > applicableDate) {
            const delayDays = Math.floor((receiptDate.getTime() - applicableDate.getTime()) / (1000 * 60 * 60 * 24));
            if (delayDays <= 30) {
              receiptStatus = "Delayed";
            } else {
              receiptStatus = "Overdue";
            }
          }

          // Calculate new balance after this receipt
          const newBalance = Math.max(currentBalance - allocatedAmount, 0);

          receiptAllocations.push({
            receiptId: receipt.id,
            voucherNumber: receipt.voucherNumber,
            receiptDate: receipt.date,
            receiptAmount: receiptAmount,
            balanceAmount: newBalance, // Show balance AFTER this receipt (remaining balance)
            balanceBeforeReceipt: currentBalance, // Balance at start of period (used for interest calc)
            daysInPeriod: daysInPeriod, // Days between previous date and this receipt
            interestRate: invoice.interestRate ? parseFloat(invoice.interestRate.toString()) : 0,
            interestAmount: interestAmount,
            status: receiptStatus,
          });

          // Update for next iteration
          currentBalance = newBalance;
          previousDate = receiptDate; // Next period starts from this receipt date
          firstReceiptProcessed = true;
        }
      }

      // Handle unpaid balance - calculate interest from last date to today
      const unpaidAmount = invoiceAmount - paidAmount;

      if (unpaidAmount > 0 && invoice.interestRate) {
        const today = new Date();
        
        // Add DUE DATE row if no receipts were processed at all
        if (!dueDateRowAdded) {
          receiptAllocations.push({
            isDueDateRow: true,
            receiptDate: applicableDate.toISOString(),
            balanceAmount: currentBalance,
            message: "Interest Starts from Here",
          });
          dueDateRowAdded = true;
          previousDate = applicableDate;
        }
        
        // Calculate final period interest (from last receipt or applicable date to today)
        // IMPORTANT: Clamp start date to applicable date to handle early receipts correctly
        if (today > applicableDate && currentBalance > 0) {
          const periodStartDate = previousDate.getTime() > applicableDate.getTime() 
            ? previousDate 
            : applicableDate;
          
          const diffTime = today.getTime() - periodStartDate.getTime();
          const daysInPeriod = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (daysInPeriod > 0) {
            const interestRate = parseFloat(invoice.interestRate.toString());
            // Period-based interest for unpaid balance
            const unpaidInterest = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
            totalInterest += unpaidInterest;
          }
        }
      }

      const gp = parseFloat(invoice.gp.toString());
      const finalGp = gp - totalInterest;
      const finalGpPercentage = invoiceAmount > 0 ? (finalGp * 100) / invoiceAmount : 0;

      // Calculate total receipt amount that went to this invoice
      const totalReceiptAmountForInvoice = receiptAllocations
        .filter(r => !r.isDueDateRow)
        .reduce((sum, r) => sum + (r.receiptAmount || 0), 0);

      res.json({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          invoiceDate: invoice.invoiceDate,
          invoiceAmount: invoiceAmount,
          gp: gp,
          interestRate: invoice.interestRate ? parseFloat(invoice.interestRate.toString()) : 0,
          interestApplicableFrom: invoice.interestApplicableFrom,
          paymentTerms: paymentTerms,
          dueDate: dueDate,
          applicableDate: applicableDate,
          status: status,
        },
        allocation: {
          paidAmount: paidAmount,
          unpaidAmount: unpaidAmount,
          receiptAllocations: receiptAllocations,
          totalReceiptAmount: totalReceiptAmountForInvoice,
          totalInterest: totalInterest,
        },
        calculation: {
          baseGp: gp,
          totalInterest: totalInterest,
          finalGp: finalGp,
          finalGpPercentage: finalGpPercentage,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send interest report via email
  app.post("/api/invoices/:id/send-interest-email", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.tenantId!, req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get customer details from master data
      const allCustomers = await storage.getMasterCustomers(req.tenantId!);
      const customer = allCustomers.find(c => c.clientName === invoice.customerName);
      
      if (!customer) {
        return res.status(404).json({ 
          message: `Customer "${invoice.customerName}" not found in master data. Please create a customer record with email address in the Customers section.` 
        });
      }

      if (!customer.primaryEmail) {
        return res.status(400).json({ 
          message: `Customer "${invoice.customerName}" has no email address. Please add email in customer master data.` 
        });
      }

      // Get email configuration
      const emailConfig = await storage.getEmailConfig(req.tenantId!);
      if (!emailConfig || emailConfig.isActive !== "Active") {
        return res.status(400).json({ message: "Email configuration not found or inactive" });
      }

      // Get company profile
      const profile = await storage.getCompanyProfile(req.tenantId!);

      // Calculate interest (simplified - just get total interest)
      const customerReceipts = await storage.getReceiptsByCustomerName(req.tenantId!, invoice.customerName);
      const sortedReceipts = customerReceipts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const customerInvoices = await storage.getInvoicesByCustomerName(req.tenantId!, invoice.customerName);
      const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
      const invoiceDate = new Date(invoice.invoiceDate);
      const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      let applicableDate: Date;
      if (invoice.interestApplicableFrom === "Due Date") {
        applicableDate = dueDate;
      } else if (invoice.interestApplicableFrom === "Invoice Date") {
        applicableDate = invoiceDate;
      } else {
        applicableDate = dueDate;
      }

      const totalReceiptAmount = sortedReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);
      let cumulativeAllocated = 0;
      let invoiceStartAllocation = 0;
      let invoiceEndAllocation = 0;
      let paidAmount = 0;

      for (const inv of customerInvoices) {
        const invAmount = parseFloat(inv.invoiceAmount.toString());
        const remainingReceipt = totalReceiptAmount - cumulativeAllocated;

        if (inv.id === invoice.id) {
          invoiceStartAllocation = cumulativeAllocated;
          if (remainingReceipt >= invAmount) {
            paidAmount = invAmount;
            invoiceEndAllocation = cumulativeAllocated + invAmount;
          } else if (remainingReceipt > 0) {
            paidAmount = remainingReceipt;
            invoiceEndAllocation = cumulativeAllocated + remainingReceipt;
          } else {
            paidAmount = 0;
            invoiceEndAllocation = cumulativeAllocated;
          }
          break;
        }

        if (remainingReceipt >= invAmount) {
          cumulativeAllocated += invAmount;
        } else if (remainingReceipt > 0) {
          cumulativeAllocated += remainingReceipt;
        }
      }

      let receiptCumulative = 0;
      let totalInterest = 0;
      let currentBalance = invoiceAmount;
      let previousDate = applicableDate;

      for (const receipt of sortedReceipts) {
        const receiptAmount = parseFloat(receipt.amount.toString());
        const prevCumulative = receiptCumulative;
        receiptCumulative += receiptAmount;

        if (receiptCumulative > invoiceStartAllocation && prevCumulative < invoiceEndAllocation) {
          const allocatedAmount = Math.min(
            receiptAmount,
            invoiceEndAllocation - Math.max(prevCumulative, invoiceStartAllocation)
          );

          const receiptDate = new Date(receipt.date);
          const periodStartDate = previousDate.getTime() > applicableDate.getTime() ? previousDate : applicableDate;
          const diffTime = receiptDate.getTime() - periodStartDate.getTime();
          const daysInPeriod = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

          let interestAmount = 0;
          if (receiptDate > applicableDate && invoice.interestRate && currentBalance > 0 && daysInPeriod > 0) {
            const interestRate = parseFloat(invoice.interestRate.toString());
            interestAmount = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
          }

          totalInterest += interestAmount;
          const newBalance = Math.max(currentBalance - allocatedAmount, 0);
          currentBalance = newBalance;
          previousDate = receiptDate;
        }
      }

      const unpaidAmount = invoiceAmount - paidAmount;
      if (unpaidAmount > 0 && invoice.interestRate) {
        const today = new Date();
        if (today > applicableDate && currentBalance > 0) {
          const periodStartDate = previousDate.getTime() > applicableDate.getTime() ? previousDate : applicableDate;
          const diffTime = today.getTime() - periodStartDate.getTime();
          const daysInPeriod = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (daysInPeriod > 0) {
            const interestRate = parseFloat(invoice.interestRate.toString());
            const unpaidInterest = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
            totalInterest += unpaidInterest;
          }
        }
      }

      // Create email message
      const subject = `Interest Calculation Report - Invoice ${invoice.invoiceNumber}`;
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Interest Calculation Report</h2>
          <p>Dear ${customer.clientName},</p>
          <p>We would like to inform you about the interest charges on your invoice due to delayed payment.</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #444;">Invoice Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Invoice Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${dueDate.toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Invoice Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right;">₹${invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Interest Rate:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${invoice.interestRate}% p.a.</td>
              </tr>
              <tr style="border-top: 2px solid #ddd;">
                <td style="padding: 12px 0;"><strong>Total Interest Charges:</strong></td>
                <td style="padding: 12px 0; text-align: right; color: #d32f2f; font-size: 1.1em;"><strong>₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 14px;">
            Due to the delayed payment on this invoice, we had to pay ₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })} as bank interest charges on our working capital limit.
          </p>

          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>${profile?.legalName || 'Company'}</strong>
          </p>
        </div>
      `;

      await sendEmail(emailConfig, customer.primaryEmail, subject, body);

      res.json({ message: "Interest report sent via email successfully" });
    } catch (error: any) {
      console.error("Failed to send interest email:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Send interest report via WhatsApp
  app.post("/api/invoices/:id/send-interest-whatsapp", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.tenantId!, req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get mobile number from invoice or customer master
      let mobileNumber = invoice.primaryMobile;
      
      // If not in invoice, try to find in customer master
      if (!mobileNumber) {
        const allCustomers = await storage.getMasterCustomers(req.tenantId!);
        const customer = allCustomers.find(c => c.clientName === invoice.customerName);
        mobileNumber = customer?.primaryMobile;
      }

      if (!mobileNumber) {
        return res.status(400).json({ 
          message: "Customer mobile number not found. Please add mobile number in customer master data or invoice details." 
        });
      }

      // Get company profile
      const profile = await storage.getCompanyProfile(req.tenantId!);

      // Calculate interest (same logic as email)
      const customerReceipts = await storage.getReceiptsByCustomerName(req.tenantId!, invoice.customerName);
      const sortedReceipts = customerReceipts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const customerInvoices = await storage.getInvoicesByCustomerName(req.tenantId!, invoice.customerName);
      const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
      const invoiceDate = new Date(invoice.invoiceDate);
      const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      let applicableDate: Date;
      if (invoice.interestApplicableFrom === "Due Date") {
        applicableDate = dueDate;
      } else if (invoice.interestApplicableFrom === "Invoice Date") {
        applicableDate = invoiceDate;
      } else {
        applicableDate = dueDate;
      }

      const totalReceiptAmount = sortedReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);
      let cumulativeAllocated = 0;
      let invoiceStartAllocation = 0;
      let invoiceEndAllocation = 0;
      let paidAmount = 0;

      for (const inv of customerInvoices) {
        const invAmount = parseFloat(inv.invoiceAmount.toString());
        const remainingReceipt = totalReceiptAmount - cumulativeAllocated;

        if (inv.id === invoice.id) {
          invoiceStartAllocation = cumulativeAllocated;
          if (remainingReceipt >= invAmount) {
            paidAmount = invAmount;
            invoiceEndAllocation = cumulativeAllocated + invAmount;
          } else if (remainingReceipt > 0) {
            paidAmount = remainingReceipt;
            invoiceEndAllocation = cumulativeAllocated + remainingReceipt;
          } else {
            paidAmount = 0;
            invoiceEndAllocation = cumulativeAllocated;
          }
          break;
        }

        if (remainingReceipt >= invAmount) {
          cumulativeAllocated += invAmount;
        } else if (remainingReceipt > 0) {
          cumulativeAllocated += remainingReceipt;
        }
      }

      let receiptCumulative = 0;
      let totalInterest = 0;
      let currentBalance = invoiceAmount;
      let previousDate = applicableDate;

      for (const receipt of sortedReceipts) {
        const receiptAmount = parseFloat(receipt.amount.toString());
        const prevCumulative = receiptCumulative;
        receiptCumulative += receiptAmount;

        if (receiptCumulative > invoiceStartAllocation && prevCumulative < invoiceEndAllocation) {
          const allocatedAmount = Math.min(
            receiptAmount,
            invoiceEndAllocation - Math.max(prevCumulative, invoiceStartAllocation)
          );

          const receiptDate = new Date(receipt.date);
          const periodStartDate = previousDate.getTime() > applicableDate.getTime() ? previousDate : applicableDate;
          const diffTime = receiptDate.getTime() - periodStartDate.getTime();
          const daysInPeriod = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

          let interestAmount = 0;
          if (receiptDate > applicableDate && invoice.interestRate && currentBalance > 0 && daysInPeriod > 0) {
            const interestRate = parseFloat(invoice.interestRate.toString());
            interestAmount = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
          }

          totalInterest += interestAmount;
          const newBalance = Math.max(currentBalance - allocatedAmount, 0);
          currentBalance = newBalance;
          previousDate = receiptDate;
        }
      }

      const unpaidAmount = invoiceAmount - paidAmount;
      if (unpaidAmount > 0 && invoice.interestRate) {
        const today = new Date();
        if (today > applicableDate && currentBalance > 0) {
          const periodStartDate = previousDate.getTime() > applicableDate.getTime() ? previousDate : applicableDate;
          const diffTime = today.getTime() - periodStartDate.getTime();
          const daysInPeriod = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (daysInPeriod > 0) {
            const interestRate = parseFloat(invoice.interestRate.toString());
            const unpaidInterest = (currentBalance * interestRate * daysInPeriod) / (100 * 365);
            totalInterest += unpaidInterest;
          }
        }
      }

      // Create WhatsApp message
      const message = `*Interest Calculation Report*

Dear ${invoice.customerName},

We would like to inform you about the interest charges on your invoice due to delayed payment.

*Invoice Details:*
Invoice #: ${invoice.invoiceNumber}
Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
Due Date: ${dueDate.toLocaleDateString('en-IN')}
Invoice Amount: ₹${invoiceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
Interest Rate: ${invoice.interestRate}% p.a.

*Total Interest Charges: ₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*

Due to the delayed payment on this invoice, we had to pay ₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })} as bank interest charges on our working capital limit.

Best regards,
${profile?.legalName || 'Company'}`;

      // Format phone number for WhatsApp (remove non-digits, add country code if needed)
      let phoneNumber = mobileNumber.replace(/\D/g, "");
      if (!phoneNumber.startsWith("91") && phoneNumber.length === 10) {
        phoneNumber = "91" + phoneNumber;
      }

      // Create WhatsApp Click to Chat link
      const encodedMessage = encodeURIComponent(message);
      const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

      res.json({ 
        message: "WhatsApp link generated successfully",
        whatsappLink: whatsappLink
      });
    } catch (error: any) {
      console.error("Failed to send interest WhatsApp:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get single invoice (MUST BE AFTER specific routes)
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.tenantId!, req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ RECEIPT ROUTES ============

  // Get all receipts
  app.get("/api/receipts", requirePermission("Receipts", "view"), async (req, res) => {
    try {
      const receipts = await storage.getReceipts(req.tenantId!);
      res.json(receipts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download receipt template (MUST BE BEFORE /:id)
  app.get("/api/receipts/template", async (req, res) => {
    try {
      const headers = ["Voucher Number", "Voucher Type", "Customer Name", "Date", "Amount", "Remarks"];
      const sampleData = [
        {
          "Voucher Number": "RCPT001",
          "Voucher Type": "Cash",
          "Customer Name": "ABC Company",
          "Date": "2024-01-15",
          "Amount": "50000",
          "Remarks": "Payment received"
        }
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "receipts_template.xlsx",
        sheetName: "Receipts Template",
        title: "Receipts Import Template",
        subject: "Receipt Data Import Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export receipts to Excel (MUST BE BEFORE /:id)
  app.get("/api/receipts/export", async (req, res) => {
    try {
      const receipts = await storage.getReceipts(req.tenantId!);
      
      const data = receipts.map((receipt) => ({
        "Voucher Number": receipt.voucherNumber,
        "Voucher Type": receipt.voucherType,
        "Customer Name": receipt.customerName,
        "Date": receipt.date.toISOString().split('T')[0],
        "Amount": receipt.amount,
        "Remarks": receipt.remarks || "",
        "Created At": receipt.createdAt.toISOString(),
      }));

      sendSecureExcelFile(res, data, {
        filename: "receipts_export.xlsx",
        sheetName: "Receipts",
        title: "Receipts Data Export",
        subject: "Receipt Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import receipts from Excel (MUST BE BEFORE /:id)
  app.post("/api/receipts/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = [];
      const errors = [];
      const duplicates = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Parse date - Excel exports dates as serial numbers or formatted strings
        let dateValue = (row as any)["Date"];
        let parsedDate = "";
        
        if (typeof dateValue === 'number') {
          // Excel serial date number (days since 1/1/1900)
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
          parsedDate = date.toISOString().split('T')[0];
        } else if (dateValue) {
          // Try to parse as string
          parsedDate = String(dateValue).trim();
        }
        
        const receiptData = {
          voucherNumber: String((row as any)["Voucher Number"] || "").trim(),
          voucherType: String((row as any)["Voucher Type"] || "").trim(),
          customerName: String((row as any)["Customer Name"] || "").trim(),
          date: parsedDate,
          amount: String((row as any)["Amount"] || "0").trim(),
          remarks: String((row as any)["Remarks"] || "").trim() || undefined,
        };

        const result = insertReceiptSchema.safeParse(receiptData);
        if (result.success) {
          // Check if combination of voucherType and voucherNumber already exists
          const existingReceipt = await storage.getReceiptByVoucherNumber(req.tenantId!, result.data.voucherType, result.data.voucherNumber);
          if (existingReceipt) {
            duplicates.push({ 
              row: i + 2, 
              voucherType: result.data.voucherType,
              voucherNumber: result.data.voucherNumber,
              error: `Duplicate: ${result.data.voucherType} - ${result.data.voucherNumber}` 
            });
          } else {
            const receipt = await storage.createReceipt(req.tenantId!, result.data);
            results.push(receipt);
          }
        } else {
          errors.push({ row: i + 2, error: fromZodError(result.error).message });
        }
      }

      res.json({ 
        success: results.length, 
        errors: errors.length,
        duplicates: duplicates.length,
        receipts: results,
        errorDetails: errors,
        duplicateDetails: duplicates
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete receipts (MUST BE BEFORE /:id)
  app.post("/api/receipts/bulk-delete", requirePermission("Receipts", "delete"), async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteReceipts(req.tenantId!, ids);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'receipts',
        action: 'delete',
        data: { ids }
      });
      
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create receipt
  app.post("/api/receipts", requirePermission("Receipts", "create"), async (req, res) => {
    try {
      const result = insertReceiptSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const receipt = await storage.createReceipt(req.tenantId!, result.data);
      
      // Recalculate all invoice statuses for this customer using FIFO
      await calculateInvoiceStatuses(req.tenantId!, receipt.customerName);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'receipts',
        action: 'create',
        data: { id: receipt.id }
      });
      
      res.json(receipt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update receipt
  app.put("/api/receipts/:id", requirePermission("Receipts", "edit"), async (req, res) => {
    try {
      const result = insertReceiptSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const receipt = await storage.updateReceipt(req.tenantId!, req.params.id, result.data);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      // Recalculate all invoice statuses for this customer using FIFO
      await calculateInvoiceStatuses(req.tenantId!, receipt.customerName);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'receipts',
        action: 'update',
        data: { id: receipt.id }
      });
      
      res.json(receipt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete receipt
  app.delete("/api/receipts/:id", requirePermission("Receipts", "delete"), async (req, res) => {
    try {
      // Get the receipt first to know the customer name
      const receipt = await storage.getReceipt(req.tenantId!, req.params.id);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      const customerName = receipt.customerName;
      const deleted = await storage.deleteReceipt(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      // Recalculate all invoice statuses for this customer using FIFO
      await calculateInvoiceStatuses(req.tenantId!, customerName);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'receipts',
        action: 'delete',
        data: { id: req.params.id }
      });
      
      res.json({ message: "Receipt deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single receipt (MUST BE AFTER specific routes)
  app.get("/api/receipts/:id", async (req, res) => {
    try {
      const receipt = await storage.getReceipt(req.tenantId!, req.params.id);
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      res.json(receipt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ LEAD ROUTES ============

  // Get all leads
  app.get("/api/leads", requirePermission("Leads", "view"), async (req, res) => {
    try {
      const leads = await storage.getLeads(req.tenantId!);
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download lead template (MUST BE BEFORE /:id)
  app.get("/api/leads/template", async (req, res) => {
    try {
      const sampleData = [
        {
          "Company Name": "Tech Solutions Pvt Ltd",
          "Contact Person": "Rajesh Kumar",
          "Mobile": "9876543210",
          "Email": "rajesh@techsolutions.com",
          "Lead Source": "Website",
          "Lead Status": "New Lead",
          "Estimated Deal Amount": "150000",
          "Address": "123 Business Park, Sector 18",
          "City": "Noida",
          "State": "Uttar Pradesh",
          "Pincode": "201301",
          "Remarks": "Interested in web development services",
          "Industry": "IT Services",
          "Priority": "High",
          "Assigned User": "Manpreet Bedi",
          "Date Created": "2024-01-15",
          "Last Follow Up": "2024-01-20",
          "Next Follow Up": "2024-01-25"
        },
        {
          "Company Name": "Digital Marketing Hub",
          "Contact Person": "Priya Sharma",
          "Mobile": "8765432109",
          "Email": "priya@digitalmarketing.com",
          "Lead Source": "Instagram",
          "Lead Status": "In Progress",
          "Estimated Deal Amount": "75000",
          "Address": "456 Tower B, Cyber City",
          "City": "Gurgaon",
          "State": "Haryana",
          "Pincode": "122002",
          "Remarks": "Needs social media management",
          "Industry": "Marketing",
          "Priority": "Medium",
          "Assigned User": "Bilal Ahamad",
          "Date Created": "2024-01-10",
          "Last Follow Up": "2024-01-18",
          "Next Follow Up": "2024-01-22"
        },
        {
          "Company Name": "E-commerce Solutions",
          "Contact Person": "Amit Patel",
          "Mobile": "7654321098",
          "Email": "amit@ecommerce.com",
          "Lead Source": "Reference",
          "Lead Status": "Quotation Sent",
          "Estimated Deal Amount": "250000",
          "Address": "789 Business Center, MG Road",
          "City": "Bangalore",
          "State": "Karnataka",
          "Pincode": "560001",
          "Remarks": "Looking for complete e-commerce platform",
          "Industry": "Retail",
          "Priority": "High",
          "Assigned User": "Anjali Dhiman",
          "Date Created": "2024-01-05",
          "Last Follow Up": "2024-01-19",
          "Next Follow Up": "2024-01-26"
        }
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "leads_template.xlsx",
        sheetName: "Leads Template",
        title: "Leads Import Template",
        subject: "Lead Data Import Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export leads to Excel (MUST BE BEFORE /:id)
  app.get("/api/leads/export", async (req, res) => {
    try {
      const leads = await storage.getLeads(req.tenantId!);
      
      const data = leads.map((lead) => ({
        "Company Name": lead.companyName,
        "Contact Person": lead.contactPerson,
        "Mobile": lead.mobile,
        "Email": lead.email,
        "Lead Source": lead.leadSource,
        "Lead Status": lead.leadStatus,
        "Estimated Deal Amount": lead.estimatedDealAmount || "",
        "Address": lead.address || "",
        "City": lead.city || "",
        "State": lead.state || "",
        "Pincode": lead.pincode || "",
        "Remarks": lead.remarks || "",
        "Industry": lead.industry || "",
        "Priority": lead.priority || "",
        "Assigned User": lead.assignedUser || "",
        "Date Created": lead.dateCreated ? lead.dateCreated.toISOString().split('T')[0] : "",
        "Last Follow Up": lead.lastFollowUp ? lead.lastFollowUp.toISOString().split('T')[0] : "",
        "Next Follow Up": lead.nextFollowUp ? lead.nextFollowUp.toISOString().split('T')[0] : "",
        "Created At": lead.createdAt.toISOString(),
      }));

      sendSecureExcelFile(res, data, {
        filename: "leads_export.xlsx",
        sheetName: "Leads",
        title: "Leads Data Export",
        subject: "Lead Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import leads from Excel (MUST BE BEFORE /:id)
  app.post("/api/leads/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = [];
      const errors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Parse dates - Excel exports dates as serial numbers or formatted strings
        const parseDateField = (dateValue: any): string | undefined => {
          if (!dateValue) return undefined;
          
          if (typeof dateValue === 'number') {
            // Excel serial date number (days since 1/1/1900)
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
            return date.toISOString().split('T')[0];
          } else {
            // Try to parse as string
            return String(dateValue).trim();
          }
        };
        
        const estimatedDealAmountValue = (row as any)["Estimated Deal Amount"];
        const estimatedDealAmount = estimatedDealAmountValue 
          ? String(estimatedDealAmountValue).trim() 
          : undefined;
        
        const leadData = {
          companyName: String((row as any)["Company Name"] || "").trim(),
          contactPerson: String((row as any)["Contact Person"] || "").trim(),
          mobile: String((row as any)["Mobile"] || "").trim(),
          email: String((row as any)["Email"] || "").trim(),
          leadSource: String((row as any)["Lead Source"] || "").trim(),
          leadStatus: String((row as any)["Lead Status"] || "New Lead").trim(),
          estimatedDealAmount: estimatedDealAmount,
          address: String((row as any)["Address"] || "").trim() || undefined,
          city: String((row as any)["City"] || "").trim() || undefined,
          state: String((row as any)["State"] || "").trim() || undefined,
          pincode: String((row as any)["Pincode"] || "").trim() || undefined,
          remarks: String((row as any)["Remarks"] || "").trim() || undefined,
          industry: String((row as any)["Industry"] || "").trim() || undefined,
          priority: String((row as any)["Priority"] || "").trim() || undefined,
          assignedUser: String((row as any)["Assigned User"] || "").trim() || undefined,
          dateCreated: parseDateField((row as any)["Date Created"]),
          lastFollowUp: parseDateField((row as any)["Last Follow Up"]),
          nextFollowUp: parseDateField((row as any)["Next Follow Up"]),
        };

        const result = insertLeadSchema.safeParse(leadData);
        if (result.success) {
          // Check for duplicate mobile or email
          const existingLeads = await storage.getLeads(req.tenantId!);
          const duplicateMobile = existingLeads.find(
            (existing) => existing.mobile === result.data.mobile
          );
          const duplicateEmail = existingLeads.find(
            (existing) => existing.email.toLowerCase() === result.data.email.toLowerCase()
          );

          if (duplicateMobile) {
            errors.push({
              rowNumber: i + 2,
              field: 'mobile',
              message: `Duplicate entry: Mobile number ${result.data.mobile} already exists for ${duplicateMobile.companyName}`
            });
          } else if (duplicateEmail) {
            errors.push({
              rowNumber: i + 2,
              field: 'email',
              message: `Duplicate entry: Email ${result.data.email} already exists for ${duplicateEmail.companyName}`
            });
          } else {
            const lead = await storage.createLead(req.tenantId!, result.data);
            results.push(lead);
          }
        } else {
          // Extract field and message from Zod error
          const zodError = result.error;
          const firstError = zodError.errors[0];
          errors.push({ 
            rowNumber: i + 2, 
            field: firstError.path.join('.') || 'unknown',
            message: firstError.message 
          });
        }
      }

      res.json({ 
        imported: results.length,
        errors: errors
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete leads (MUST BE BEFORE /:id)
  app.post("/api/leads/bulk-delete", requirePermission("Leads", "delete"), async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "ids must be an array" });
      }
      const deleted = await storage.deleteLeads(req.tenantId!, ids);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'leads',
        action: 'delete',
        data: { ids }
      });
      
      res.json({ deleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create lead
  app.post("/api/leads", requirePermission("Leads", "create"), async (req, res) => {
    try {
      const result = insertLeadSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const lead = await storage.createLead(req.tenantId!, result.data);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'leads',
        action: 'create',
        data: { id: lead.id }
      });
      
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update lead
  app.put("/api/leads/:id", requirePermission("Leads", "edit"), async (req, res) => {
    try {
      const result = insertLeadSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const lead = await storage.updateLead(req.tenantId!, req.params.id, result.data);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'leads',
        action: 'update',
        data: { id: lead.id }
      });
      
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Partial update lead (for inline editing)
  app.patch("/api/leads/:id", requirePermission("Leads", "edit"), async (req, res) => {
    try {
      const result = insertLeadSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const lead = await storage.updateLead(req.tenantId!, req.params.id, result.data);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'leads',
        action: 'update',
        data: { id: lead.id }
      });
      
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", requirePermission("Leads", "delete"), async (req, res) => {
    try {
      const deleted = await storage.deleteLead(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'leads',
        action: 'delete',
        data: { id: req.params.id }
      });
      
      res.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single lead (MUST BE AFTER specific routes)
  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.tenantId!, req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lead Follow-up Routes
  
  // Get follow-ups for a specific lead
  app.get("/api/leads/:id/followups", async (req, res) => {
    try {
      const followUps = await storage.getLeadFollowUpsByLead(req.tenantId!, req.params.id);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new lead follow-up
  app.post("/api/leads/followups", async (req, res) => {
    try {
      const result = insertLeadFollowUpSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const followUp = await storage.createLeadFollowUp(req.tenantId!, result.data);
      res.json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update a lead follow-up
  app.put("/api/leads/followups/:id", async (req, res) => {
    try {
      const result = insertLeadFollowUpSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const followUp = await storage.updateLeadFollowUp(req.tenantId!, req.params.id, result.data);
      if (!followUp) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a lead follow-up
  app.delete("/api/leads/followups/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLeadFollowUp(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Follow-up not found" });
      }
      res.json({ message: "Follow-up deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Company Profile Routes
  
  // Upload company logo
  app.post("/api/company-profile/upload-logo", upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Store as base64 data URL for simplicity
      const base64Logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      res.json({ logoUrl: base64Logo });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get company profile
  app.get("/api/company-profile", async (req, res) => {
    try {
      const profile = await storage.getCompanyProfile(req.tenantId!);
      res.json(profile || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update/Create company profile
  app.post("/api/company-profile", async (req, res) => {
    try {
      const result = insertCompanyProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const profile = await storage.updateCompanyProfile(req.tenantId!, result.data);
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ QUOTATION ROUTES ============

  // Get all quotations
  app.get("/api/quotations", async (req, res) => {
    try {
      const quotations = await storage.getQuotations(req.tenantId!);
      res.json(quotations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get next quotation number (must be before :id route)
  app.get("/api/quotations/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextQuotationNumber(req.tenantId!);
      res.json({ quotationNumber: nextNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export quotations to Excel
  app.get("/api/quotations/export", async (req, res) => {
    try {
      const quotations = await storage.getQuotations(req.tenantId!);
      
      const exportData = quotations.map((q: any) => ({
        "Quotation Number": q.quotationNumber,
        "Date": new Date(q.quotationDate).toLocaleDateString(),
        "Valid Until": new Date(q.validUntil).toLocaleDateString(),
        "Lead Name": q.leadName,
        "Lead Email": q.leadEmail,
        "Lead Mobile": q.leadMobile,
        "Subtotal": parseFloat(q.subtotal || "0").toFixed(2),
        "Discount": parseFloat(q.totalDiscount || "0").toFixed(2),
        "Tax": parseFloat(q.totalTax || "0").toFixed(2),
        "Grand Total": parseFloat(q.grandTotal || "0").toFixed(2),
        "Created At": new Date(q.createdAt).toLocaleDateString(),
      }));

      sendSecureExcelFile(res, exportData, {
        filename: "quotations.xlsx",
        sheetName: "Quotations",
        title: "Quotations Data Export",
        subject: "Quotation Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single quotation
  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const quotation = await storage.getQuotation(req.tenantId!, req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get quotation items
  app.get("/api/quotations/:id/items", async (req, res) => {
    try {
      const items = await storage.getQuotationItems(req.tenantId!, req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new quotation
  app.post("/api/quotations", async (req, res) => {
    try {
      const result = insertQuotationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const quotation = await storage.createQuotation(req.tenantId!, result.data);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'quotations',
        action: 'create',
        data: { id: quotation.id }
      });
      
      res.status(201).json(quotation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create quotation item
  app.post("/api/quotations/:id/items", async (req, res) => {
    try {
      const result = insertQuotationItemSchema.safeParse({
        ...req.body,
        quotationId: req.params.id,
      });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const item = await storage.createQuotationItem(req.tenantId!, result.data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update quotation
  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const result = insertQuotationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const quotation = await storage.updateQuotation(req.tenantId!, req.params.id, result.data);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'quotations',
        action: 'update',
        data: { id: quotation.id }
      });
      
      res.json(quotation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete quotation
  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      const success = await storage.deleteQuotation(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'quotations',
        action: 'delete',
        data: { id: req.params.id }
      });
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete quotations
  app.post("/api/quotations/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "Invalid request: ids array required" });
      }
      const count = await storage.deleteQuotations(req.tenantId!, ids);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'quotations',
        action: 'delete',
        data: { ids }
      });
      
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete all items for a quotation (bulk delete)
  app.delete("/api/quotations/:quotationId/items", async (req, res) => {
    try {
      const count = await storage.deleteQuotationItems(req.tenantId!, req.params.quotationId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete quotation item
  app.delete("/api/quotations/:quotationId/items/:itemId", async (req, res) => {
    try {
      const success = await storage.deleteQuotationItem(req.tenantId!, req.params.itemId);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get quotation settings (Terms & Conditions)
  app.get("/api/quotation-settings", async (req, res) => {
    try {
      const settings = await storage.getQuotationSettings(req.tenantId!);
      res.json(settings || { termsAndConditions: "" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update quotation settings
  app.post("/api/quotation-settings", async (req, res) => {
    try {
      const result = insertQuotationSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const settings = await storage.updateQuotationSettings(req.tenantId!, result.data.termsAndConditions);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ PROFORMA INVOICE ROUTES ============

  // Generate Proforma Invoice from Quotation
  app.post("/api/quotations/:id/generate-pi", async (req, res) => {
    try {
      // Get the quotation
      const quotation = await storage.getQuotation(req.tenantId!, req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Check if a PI already exists for this quotation
      const existingPI = await storage.getProformaInvoiceByQuotationId(req.tenantId!, req.params.id);
      if (existingPI) {
        return res.status(400).json({ 
          message: "A Proforma Invoice already exists for this quotation",
          existingInvoice: existingPI
        });
      }

      // Get quotation items
      const quotationItems = await storage.getQuotationItems(req.tenantId!, req.params.id);

      // Get next PI number
      const nextNumber = await storage.getNextProformaInvoiceNumber(req.tenantId!);

      // Calculate due date (30 days from now by default)
      const invoiceDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create proforma invoice
      const piData = {
        invoiceNumber: nextNumber,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        quotationId: quotation.id,
        leadId: quotation.leadId,
        leadName: quotation.leadName,
        leadEmail: quotation.leadEmail,
        leadMobile: quotation.leadMobile,
        subtotal: quotation.subtotal,
        totalDiscount: quotation.totalDiscount,
        totalTax: quotation.totalTax,
        grandTotal: quotation.grandTotal,
        termsAndConditions: quotation.termsAndConditions || "",
      };

      const result = insertProformaInvoiceSchema.safeParse(piData);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const proformaInvoice = await storage.createProformaInvoice(req.tenantId!, result.data);

      // Copy quotation items to proforma invoice items
      for (const item of quotationItems) {
        const itemData = {
          invoiceId: proformaInvoice.id,
          itemId: item.itemId || undefined,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          amount: item.amount,
          displayOrder: item.displayOrder,
        };

        const itemResult = insertProformaInvoiceItemSchema.safeParse(itemData);
        if (itemResult.success) {
          await storage.createProformaInvoiceItem(req.tenantId!, itemResult.data);
        }
      }

      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'proforma_invoices',
        action: 'create',
        data: { id: proformaInvoice.id }
      });
      
      res.status(201).json(proformaInvoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all proforma invoices
  app.get("/api/proforma-invoices", async (req, res) => {
    try {
      const invoices = await storage.getProformaInvoices(req.tenantId!);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get next proforma invoice number
  app.get("/api/proforma-invoices/next-number", async (req, res) => {
    try {
      const nextNumber = await storage.getNextProformaInvoiceNumber(req.tenantId!);
      res.json({ invoiceNumber: nextNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single proforma invoice
  app.get("/api/proforma-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getProformaInvoice(req.tenantId!, req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Proforma invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get proforma invoice items
  app.get("/api/proforma-invoices/:id/items", async (req, res) => {
    try {
      const items = await storage.getProformaInvoiceItems(req.tenantId!, req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete proforma invoice
  app.delete("/api/proforma-invoices/:id", async (req, res) => {
    try {
      const success = await storage.deleteProformaInvoice(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Proforma invoice not found" });
      }
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'proforma_invoices',
        action: 'delete',
        data: { id: req.params.id }
      });
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete proforma invoices
  app.post("/api/proforma-invoices/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid ids array" });
      }
      const count = await storage.deleteProformaInvoices(req.tenantId!, ids);
      
      // Broadcast real-time update
      wsManager.broadcast(req.tenantId!, {
        type: 'data_change',
        module: 'proforma_invoices',
        action: 'delete',
        data: { ids }
      });
      
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export proforma invoices to Excel
  app.get("/api/proforma-invoices/export", async (req, res) => {
    try {
      const invoices = await storage.getProformaInvoices(req.tenantId!);
      
      const exportData = invoices.map((inv: any) => ({
        "PI Number": inv.invoiceNumber,
        "Invoice Date": new Date(inv.invoiceDate).toLocaleDateString(),
        "Due Date": new Date(inv.dueDate).toLocaleDateString(),
        "Customer Name": inv.leadName,
        "Customer Email": inv.leadEmail,
        "Customer Mobile": inv.leadMobile,
        "Subtotal": parseFloat(inv.subtotal || "0").toFixed(2),
        "Discount": parseFloat(inv.totalDiscount || "0").toFixed(2),
        "Tax": parseFloat(inv.totalTax || "0").toFixed(2),
        "Grand Total": parseFloat(inv.grandTotal || "0").toFixed(2),
        "Created At": new Date(inv.createdAt).toLocaleDateString(),
      }));

      sendSecureExcelFile(res, exportData, {
        filename: "proforma_invoices.xlsx",
        sheetName: "Proforma Invoices",
        title: "Proforma Invoices Data Export",
        subject: "Proforma Invoice Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export debtors (MUST BE BEFORE /api/debtors to avoid route collision)
  app.get("/api/debtors/export", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      const debtorsData = await storage.getDebtorsList(req.tenantId!);
      let allDebtors = debtorsData.allDebtors || [];
      
      // For non-admin users, filter debtors to show only those assigned to them
      if (sessionUser && !sessionUser.isAdmin) {
        const userDetails = await storage.getUser(req.tenantId!, sessionUser.id);
        if (userDetails) {
          const userName = userDetails.name;
          allDebtors = allDebtors.filter(
            (debtor: any) => debtor.salesPerson === userName
          );
        }
      }
      
      // Get company profile for header
      const companyProfile = await storage.getCompanyProfile(req.tenantId!);
      
      // Create custom worksheet with header, data, and footer
      const workbook = XLSX.utils.book_new();
      
      // Company header rows
      const headerRows = [
        [companyProfile?.companyName || "RECOV"],
        [companyProfile?.address || ""],
        [], // Empty row
        ["Debtors Report"],
        [], // Empty row
      ];
      
      // Column headers
      const columnHeaders = [
        "Customer Name",
        "Category",
        "Sales Person",
        "Mobile",
        "Email",
        "Credit Limit",
        "Opening Balance",
        "Total Invoices",
        "Total Receipts",
        "Balance Outstanding",
        "Invoice Count",
        "Receipt Count",
        "Last Invoice Date",
        "Last Payment Date",
      ];
      
      // Data rows
      const dataRows = allDebtors.map((debtor: any) => [
        debtor.name,
        debtor.category,
        debtor.salesPerson || "",
        debtor.mobile,
        debtor.email,
        debtor.creditLimit?.toFixed(2) || "0.00",
        debtor.openingBalance?.toFixed(2) || "0.00",
        debtor.totalInvoices?.toFixed(2) || "0.00",
        debtor.totalReceipts?.toFixed(2) || "0.00",
        debtor.balance?.toFixed(2) || "0.00",
        debtor.invoiceCount || 0,
        debtor.receiptCount || 0,
        debtor.lastInvoiceDate ? new Date(debtor.lastInvoiceDate).toISOString().split('T')[0] : "",
        debtor.lastPaymentDate ? new Date(debtor.lastPaymentDate).toISOString().split('T')[0] : "",
      ]);
      
      // Footer rows
      const now = new Date();
      const timestamp = now.toLocaleString();
      const footerRows = [
        [], // Empty row
        [], // Empty row
        [`This is a computer generated report - Generated on: ${timestamp}`],
      ];
      
      // Combine all rows
      const allRows = [
        ...headerRows,
        columnHeaders,
        ...dataRows,
        ...footerRows,
      ];
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);
      
      // Auto-size columns
      const columnWidths = columnHeaders.map((header, colIndex) => {
        const headerLength = header.length;
        const dataLengths = dataRows.map(row => {
          const cell = row[colIndex];
          return cell ? cell.toString().length : 0;
        });
        const maxDataLength = Math.max(...dataLengths, 0);
        return { wch: Math.max(headerLength, maxDataLength, 10) + 2 };
      });
      worksheet['!cols'] = columnWidths;
      
      // Add metadata
      workbook.Props = {
        Title: "Debtors Report",
        Subject: "Debtors Data Export",
        Author: "RECOV System",
        Company: companyProfile?.companyName || "WIZONE IT NETWORK INDIA PVT LTD",
        CreatedDate: new Date(),
        ModifiedDate: new Date(),
        Application: "Microsoft Excel",
        Manager: "RECOV Administrator",
        Category: "Business Reports",
        Keywords: "debtors, export, data",
        Comments: "Generated by RECOV - Business Management System",
      };
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Debtors");
      
      // Write buffer
      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
        bookSST: false,
      });
      
      // Set security headers and send
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="debtors_export.xlsx"');
      res.setHeader("Content-Length", buffer.length.toString());
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.setHeader("X-Frame-Options", "DENY");
      
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors list with category-wise breakdown
  app.get("/api/debtors", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      const data = await storage.getDebtorsList(req.tenantId!);
      
      // For non-admin users, filter debtors to show only those assigned to them
      if (sessionUser && !sessionUser.isAdmin) {
        const userDetails = await storage.getUser(req.tenantId!, sessionUser.id);
        if (userDetails) {
          const userName = userDetails.name;
          // Filter allDebtors to show only those assigned to this user
          if (data.allDebtors) {
            data.allDebtors = data.allDebtors.filter(
              (debtor: any) => debtor.salesPerson === userName
            );
          }
          
          // Recalculate summary stats based on filtered debtors
          if (data.allDebtors) {
            const filteredDebtors = data.allDebtors;
            data.totalOutstanding = filteredDebtors.reduce((sum: number, d: any) => sum + (d.totalOutstanding || 0), 0);
            data.totalOverdue = filteredDebtors.reduce((sum: number, d: any) => sum + (d.overdueAmount || 0), 0);
            data.totalDebtors = filteredDebtors.length;
            data.avgOutstanding = filteredDebtors.length > 0 
              ? data.totalOutstanding / filteredDebtors.length 
              : 0;
          }
        }
      }
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors follow-up statistics
  app.get("/api/debtors/followup-stats", async (req, res) => {
    try {
      const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors follow-ups by customer
  app.get("/api/debtors/followups/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      const followUps = await storage.getDebtorsFollowUpsByCustomer(req.tenantId!, customerId);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create debtors follow-up
  app.post("/api/debtors/followup", async (req, res) => {
    try {
      const validation = insertDebtorsFollowUpSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }
      const followUp = await storage.createDebtorsFollowUp(req.tenantId!, validation.data);
      res.status(201).json(followUp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get debtors follow-ups by category
  app.get("/api/debtors/followups/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const followUps = await storage.getDebtorsFollowUpsByCategory(req.tenantId!, category);
      res.json(followUps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ LEDGER ROUTES ============

  // Get customer ledger
  app.get("/api/ledgers/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      const { fromDate, toDate } = req.query;

      // Get customer details
      const customers = await storage.getMasterCustomers(req.tenantId!);
      const customer = customers.find(c => c.id === customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get all invoices and receipts for this customer
      const allInvoices = await storage.getInvoices(req.tenantId!);
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      
      const allReceipts = await storage.getReceipts(req.tenantId!);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);

      // Build ALL transactions first (to calculate correct opening balance when filtered)
      const allTransactions: any[] = [];
      
      // Add all invoices
      customerInvoices.forEach(invoice => {
        const amount = parseFloat(invoice.invoiceAmount?.toString() || '0');
        allTransactions.push({
          date: invoice.invoiceDate,
          particulars: `Invoice - ${invoice.productName || 'Sales'}`,
          refNo: invoice.invoiceNumber || '',
          voucherType: "Sales",
          voucherNo: invoice.invoiceNumber || '',
          debit: amount,
          credit: 0
        });
      });

      // Add all receipts
      customerReceipts.forEach(receipt => {
        const amount = parseFloat(receipt.amount?.toString() || '0');
        allTransactions.push({
          date: receipt.date,
          particulars: `Receipt - ${receipt.paymentMethod || 'Payment Received'}`,
          refNo: receipt.receiptNumber || '',
          voucherType: "Receipt",
          voucherNo: receipt.receiptNumber || '',
          debit: 0,
          credit: amount
        });
      });

      // Sort all transactions by date
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate opening balance for the filtered period
      const storedOpeningBalance = parseFloat(customer.openingBalance?.toString() || '0');
      let effectiveOpeningBalance = storedOpeningBalance;
      
      if (fromDate) {
        const filterFromDate = new Date(fromDate as string);
        // Add all transactions before fromDate to opening balance
        allTransactions.forEach(txn => {
          const txnDate = new Date(txn.date);
          if (txnDate < filterFromDate) {
            effectiveOpeningBalance += (txn.debit - txn.credit);
          }
        });
      }

      // Build displayed transactions (with date filter applied)
      const displayedTransactions: any[] = [];
      
      // Add opening balance row
      if (effectiveOpeningBalance !== 0 || !fromDate) {
        displayedTransactions.push({
          date: fromDate || customer.createdAt || new Date().toISOString(),
          particulars: "Opening Balance",
          refNo: "",
          voucherType: "Opening",
          voucherNo: "",
          debit: effectiveOpeningBalance > 0 ? effectiveOpeningBalance : 0,
          credit: effectiveOpeningBalance < 0 ? Math.abs(effectiveOpeningBalance) : 0,
          balance: Math.abs(effectiveOpeningBalance),
          balanceType: effectiveOpeningBalance >= 0 ? 'Dr' : 'Cr'
        });
      }

      // Add transactions within date range
      allTransactions.forEach(txn => {
        const txnDate = new Date(txn.date);
        
        // Apply date filters
        if (fromDate && txnDate < new Date(fromDate as string)) return;
        if (toDate && txnDate > new Date(toDate as string)) return;
        
        displayedTransactions.push({
          ...txn,
          balance: 0, // Will be calculated
          balanceType: 'Dr'
        });
      });

      // Calculate running balance for displayed transactions
      let runningBalance = effectiveOpeningBalance;
      let totalDebitsInPeriod = 0;
      let totalCreditsInPeriod = 0;
      
      displayedTransactions.forEach(txn => {
        if (txn.voucherType !== 'Opening') {
          totalDebitsInPeriod += txn.debit;
          totalCreditsInPeriod += txn.credit;
          runningBalance += (txn.debit - txn.credit);
        }
        // For Opening Balance, just set the balance as-is
        txn.balance = Math.abs(runningBalance);
        txn.balanceType = runningBalance >= 0 ? 'Dr' : 'Cr';
      });

      const closingBalance = runningBalance;

      res.json({
        customer: {
          name: customer.clientName || '',
          gstin: customer.gstNumber || '',
          address: customer.billingAddress || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          mobile: customer.primaryMobile || '',
          email: customer.primaryEmail || ''
        },
        transactions: displayedTransactions,
        summary: {
          openingBalance: effectiveOpeningBalance,
          totalDebits: totalDebitsInPeriod,
          totalCredits: totalCreditsInPeriod,
          closingBalance: Math.abs(closingBalance),
          closingBalanceType: closingBalance >= 0 ? 'Dr' : 'Cr'
        }
      });
    } catch (error: any) {
      console.error("Ledger error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============ CREDIT MANAGEMENT ROUTES ============

  // Get credit management data
  app.get("/api/credit-management", async (req, res) => {
    try {
      const data = await storage.getCreditManagementData(req.tenantId!);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export credit management data to Excel
  app.get("/api/credit-management/export", async (req, res) => {
    try {
      const creditData = await storage.getCreditManagementData(req.tenantId!);
      
      const exportData = creditData.map((item: any) => ({
        "Customer Name": item.customerName,
        "Category": item.category,
        "Credit Limit": item.creditLimit.toFixed(2),
        "Utilized Limit": item.utilizedLimit.toFixed(2),
        "Available Limit": item.availableLimit.toFixed(2),
        "Utilization %": item.utilizationPercentage.toFixed(2) + "%",
      }));

      sendSecureExcelFile(res, exportData, {
        filename: "credit_management.xlsx",
        sheetName: "Credit Management",
        title: "Credit Management Data Export",
        subject: "Credit Management Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ ROLES ROUTES ============
  
  // Get all roles
  app.get("/api/roles", requirePermission("Roles Management", "view"), async (req, res) => {
    try {
      const roles = await storage.getRoles(req.tenantId!);
      
      // Fetch user counts for each role
      const rolesWithCounts = await Promise.all(
        roles.map(async (role) => {
          const userCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(
              and(
                eq(users.roleId, role.id),
                eq(users.tenantId, req.tenantId!)
              )
            );
          
          return {
            ...role,
            userCount: userCount[0]?.count || 0,
          };
        })
      );
      
      res.json(rolesWithCounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get roles template
  app.get("/api/roles/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          Name: "Admin",
          Description: "Full system access",
          Permissions: "Dashboard,Leads,Quotations,Invoices,Receipts,Debtors,Masters,Settings",
        },
        {
          Name: "Sales Manager",
          Description: "Manage leads and quotations",
          Permissions: "Dashboard,Leads,Quotations",
        },
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "roles_template.xlsx",
        sheetName: "Roles",
        title: "Roles Import Template",
        subject: "Role Data Import Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export roles
  app.get("/api/roles/export", async (req, res) => {
    try {
      const roles = await storage.getRoles(req.tenantId!);
      const exportData = roles.map(role => ({
        Name: role.name,
        Description: role.description || "",
        Permissions: role.permissions.join(","),
        "Created At": new Date(role.createdAt).toLocaleDateString(),
      }));

      sendSecureExcelFile(res, exportData, {
        filename: "roles.xlsx",
        sheetName: "Roles",
        title: "Roles Data Export",
        subject: "Role Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import roles
  app.post("/api/roles/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const roles = data.map((row: any) => ({
        name: row.Name || row.name,
        description: row.Description || row.description || "",
        permissions: (row.Permissions || row.permissions || "").split(",").map((p: string) => p.trim()).filter(Boolean),
      }));

      const createdRoles = await Promise.all(
        roles.map(role => storage.createRole(req.tenantId!, role))
      );

      res.status(201).json({ 
        message: `Successfully imported ${createdRoles.length} roles`,
        count: createdRoles.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Helper: Validate role permissions against tenant's subscription plan
  async function validateRolePermissions(tenantId: string | null, permissions: string[]): Promise<{ valid: boolean; message?: string; invalidPermissions?: string[] }> {
    // Platform admins have no restrictions
    if (!tenantId) {
      return { valid: true };
    }

    // Fetch tenant with subscription plan
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant || !tenant.subscriptionPlanId) {
      return { valid: true }; // No plan = no restrictions (for backward compatibility)
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, tenant.subscriptionPlanId))
      .limit(1);

    if (!plan || !plan.allowedModules) {
      return { valid: true };
    }

    // Generate allowed permissions from subscription plan's allowed modules
    // This MUST match getPermissionsForModules exactly to avoid validation errors
    const modulePermissionsMap: Record<string, string[]> = {
      "Business Overview": ["Business Overview - View"],
      "Customer Analytics": ["Customer Analytics - View"],
      "Leads": ["Leads - View", "Leads - Create", "Leads - Edit", "Leads - Delete", "Leads - Export", "Leads - Import", "Leads - Print"],
      "Quotations": ["Quotations - View", "Quotations - Create", "Quotations - Edit", "Quotations - Delete", "Quotations - Export", "Quotations - Import", "Quotations - Print"],
      "Proforma Invoices": ["Proforma Invoices - View", "Proforma Invoices - Create", "Proforma Invoices - Edit", "Proforma Invoices - Delete", "Proforma Invoices - Export", "Proforma Invoices - Import", "Proforma Invoices - Print"],
      "Invoices": ["Invoices - View", "Invoices - Create", "Invoices - Edit", "Invoices - Delete", "Invoices - Export", "Invoices - Import", "Invoices - Print"],
      "Receipts": ["Receipts - View", "Receipts - Create", "Receipts - Edit", "Receipts - Delete", "Receipts - Export", "Receipts - Import", "Receipts - Print"],
      "Payment Tracking": [
        "Debtors - View", "Debtors - Export", "Debtors - Print",
        "Ledger - View", "Ledger - Export", "Ledger - Print",
        "Credit Management - View", "Credit Management - Export", "Credit Management - Print",
        "Payment Analytics - View", "Payment Analytics - Export", "Payment Analytics - Print",
      ],
      // Payment Tracking submodules (individual permissions for each child)
      "Debtors": ["Debtors - View", "Debtors - Export", "Debtors - Print"],
      "Ledger": ["Ledger - View", "Ledger - Export", "Ledger - Print"],
      "Credit Management": ["Credit Management - View", "Credit Management - Export", "Credit Management - Print"],
      "Payment Analytics": ["Payment Analytics - View", "Payment Analytics - Export", "Payment Analytics - Print"],
      "Action Center": ["Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete"],
      // Action Center submodules
      "Daily Dashboard": ["Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete"],
      "Task Manager": ["Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete"],
      "Call Queue": ["Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete"],
      "Activity Logs": ["Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete"],
      "Team Performance": ["Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete"],
      // Team Performance submodules
      "Leaderboard": ["Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete"],
      "Daily Targets": ["Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete"],
      "Notification Center": ["Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete"],
      "Risk & Recovery": [
        "Risk Management - Client Risk Thermometer - View",
        "Risk Management - Payment Risk Forecaster - View",
        "Risk Management - Recovery Health Test - View"
      ],
      // Risk & Recovery submodules
      "Client Risk Thermometer": ["Risk Management - Client Risk Thermometer - View"],
      "Payment Risk Forecaster": ["Risk Management - Payment Risk Forecaster - View"],
      "Recovery Health Test": ["Risk Management - Recovery Health Test - View"],
      "Credit Control": [
        "Credit Management - View", "Credit Management - Export", "Credit Management - Print",
        "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete",
        "Credit Control - Export", "Credit Control - Import", "Credit Control - Print"
      ],
      // Credit Control submodules
      "Category Management": ["Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete"],
      "Follow-up Rules": ["Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete"],
      "Category Calculation": ["Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete"],
      "Urgent Actions": ["Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete"],
      "Follow-up Automation": ["Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete"],
      "Masters": [
        "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", 
        "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print",
        "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", 
        "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print"
      ],
      // Masters submodules
      "Customers": [
        "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", 
        "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print"
      ],
      "Items": [
        "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", 
        "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print"
      ],
      "Banks": ["Settings - View", "Settings - Edit"],
      "Voucher Types": ["Settings - View", "Settings - Edit"],
      "Settings": [
        "Company Profile - View", "Company Profile - Edit",
        "Settings - View", "Settings - Edit",
        "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", 
        "User Management - Export", "User Management - Import", "User Management - Print",
        "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", 
        "Roles Management - Export", "Roles Management - Import", "Roles Management - Print",
        "Communication Schedules - View", "Communication Schedules - Create", "Communication Schedules - Edit", "Communication Schedules - Delete",
        "Backup & Restore - View", "Backup & Restore - Create", "Backup & Restore - Delete",
        "Audit Logs - View", "Audit Logs - Export", "Audit Logs - Print"
      ],
      // Settings submodules
      "Company Profile": ["Company Profile - View", "Company Profile - Edit"],
      "User Management": [
        "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", 
        "User Management - Export", "User Management - Import", "User Management - Print"
      ],
      "Roles Management": [
        "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", 
        "Roles Management - Export", "Roles Management - Import", "Roles Management - Print"
      ],
      "Communication Schedules": [
        "Communication Schedules - View", "Communication Schedules - Create", "Communication Schedules - Edit", "Communication Schedules - Delete"
      ],
      "Backup & Restore": ["Backup & Restore - View", "Backup & Restore - Create", "Backup & Restore - Delete"],
      "Audit Logs": ["Audit Logs - View", "Audit Logs - Export", "Audit Logs - Print"],
      "Email/WhatsApp/Call Integrations": ["Email/WhatsApp/Call Integrations - View", "Email/WhatsApp/Call Integrations - Edit"],
      "Reports": ["Reports - View", "Reports - Export", "Reports - Print"],
    };

    // Build complete allowed permissions set from subscription plan
    const allowedPermissions = new Set<string>();
    for (const module of plan.allowedModules) {
      const perms = modulePermissionsMap[module] || [];
      perms.forEach(p => allowedPermissions.add(p));
    }

    // Strict validation: only allow permissions explicitly in the allowedPermissions set
    const invalidPermissions = permissions.filter(p => !allowedPermissions.has(p));
    
    if (invalidPermissions.length > 0) {
      return {
        valid: false,
        message: `Some permissions are not available in your ${plan.name} plan. Please upgrade to access these features.`,
        invalidPermissions,
      };
    }

    return { valid: true };
  }

  // Get single role
  app.get("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRole(req.tenantId!, req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create role
  app.post("/api/roles", requirePermission("Roles Management", "create"), async (req, res) => {
    try {
      const validation = insertRoleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      // Validate permissions against subscription plan
      const permValidation = await validateRolePermissions(req.tenantId!, validation.data.permissions || []);
      if (!permValidation.valid) {
        return res.status(403).json({ 
          message: permValidation.message,
          invalidPermissions: permValidation.invalidPermissions
        });
      }

      const role = await storage.createRole(req.tenantId!, validation.data);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update role
  app.put("/api/roles/:id", requirePermission("Roles Management", "edit"), async (req, res) => {
    try {
      const validation = insertRoleSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      // Validate permissions against subscription plan (if permissions are being updated)
      if (validation.data.permissions) {
        const permValidation = await validateRolePermissions(req.tenantId!, validation.data.permissions);
        if (!permValidation.valid) {
          return res.status(403).json({ 
            message: permValidation.message,
            invalidPermissions: permValidation.invalidPermissions
          });
        }
      }

      const role = await storage.updateRole(req.tenantId!, req.params.id, validation.data);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete role
  app.delete("/api/roles/:id", requirePermission("Roles Management", "delete"), async (req, res) => {
    try {
      // Get role to be deleted
      const roleToDelete = await storage.getRole(req.tenantId!, req.params.id);
      if (!roleToDelete) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Check if this is an Admin role (by name or full Settings permissions)
      const isAdminRole = roleToDelete.name.toLowerCase() === "admin" || (
        roleToDelete.permissions.includes("Roles Management - View") &&
        roleToDelete.permissions.includes("Roles Management - Create") &&
        roleToDelete.permissions.includes("Roles Management - Edit") &&
        roleToDelete.permissions.includes("Roles Management - Delete") &&
        roleToDelete.permissions.includes("User Management - View") &&
        roleToDelete.permissions.includes("User Management - Create") &&
        roleToDelete.permissions.includes("User Management - Edit") &&
        roleToDelete.permissions.includes("User Management - Delete")
      );

      if (isAdminRole) {
        // Count total Admin-level roles
        const allRoles = await storage.getRoles(req.tenantId!);
        const adminLevelRoles = allRoles.filter(r => 
          r.name.toLowerCase() === "admin" || (
            r.permissions.includes("Roles Management - View") &&
            r.permissions.includes("Roles Management - Create") &&
            r.permissions.includes("Roles Management - Edit") &&
            r.permissions.includes("Roles Management - Delete") &&
            r.permissions.includes("User Management - View") &&
            r.permissions.includes("User Management - Create") &&
            r.permissions.includes("User Management - Edit") &&
            r.permissions.includes("User Management - Delete")
          )
        );
        
        if (adminLevelRoles.length === 1) {
          return res.status(403).json({ 
            message: "Cannot delete the last Admin role. At least one Admin role must exist to manage users and roles."
          });
        }
      }

      // Check if role has users assigned
      const usersWithRole = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.roleId, req.params.id),
            eq(users.tenantId, req.tenantId!)
          )
        );

      const userCount = usersWithRole[0]?.count || 0;
      if (userCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete role. ${userCount} user${userCount > 1 ? 's are' : ' is'} currently assigned to this role. Please reassign or remove the user${userCount > 1 ? 's' : ''} first.`
        });
      }

      const success = await storage.deleteRole(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json({ message: "Role deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete roles
  app.post("/api/roles/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid IDs array" });
      }

      // Get all roles to check for Admin protection
      const allRoles = await storage.getRoles(req.tenantId!);
      const rolesToDelete = allRoles.filter(r => ids.includes(r.id));
      
      // Helper to check if a role has admin-level permissions
      const hasAdminPermissions = (role: any) => {
        return role.name.toLowerCase() === "admin" || (
          role.permissions.includes("Roles Management - View") &&
          role.permissions.includes("Roles Management - Create") &&
          role.permissions.includes("Roles Management - Edit") &&
          role.permissions.includes("Roles Management - Delete") &&
          role.permissions.includes("User Management - View") &&
          role.permissions.includes("User Management - Create") &&
          role.permissions.includes("User Management - Edit") &&
          role.permissions.includes("User Management - Delete")
        );
      };

      const adminLevelRoles = allRoles.filter(hasAdminPermissions);
      const adminRolesToDelete = rolesToDelete.filter(hasAdminPermissions);

      // Prevent deletion if it would remove all Admin-level roles
      if (adminRolesToDelete.length > 0 && adminRolesToDelete.length >= adminLevelRoles.length) {
        return res.status(403).json({ 
          message: "Cannot delete all Admin roles. At least one Admin role must exist to manage users and roles."
        });
      }

      // Check if any roles have users assigned
      const rolesWithUsers: string[] = [];
      for (const roleId of ids) {
        const usersWithRole = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(
            and(
              eq(users.roleId, roleId),
              eq(users.tenantId, req.tenantId!)
            )
          );
        
        const userCount = usersWithRole[0]?.count || 0;
        if (userCount > 0) {
          const role = allRoles.find(r => r.id === roleId);
          if (role) {
            rolesWithUsers.push(`${role.name} (${userCount} user${userCount > 1 ? 's' : ''})`);
          }
        }
      }

      if (rolesWithUsers.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete roles with assigned users: ${rolesWithUsers.join(', ')}. Please reassign users first.`
        });
      }

      const count = await storage.bulkDeleteRoles(req.tenantId!, ids);
      res.json({ message: `Successfully deleted ${count} roles`, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ USERS ROUTES ============
  
  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers(req.tenantId!);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get users template
  app.get("/api/users/template", async (_req, res) => {
    try {
      const sampleData = [
        {
          Name: "John Doe",
          Email: "john.doe@example.com",
          Mobile: "9876543210",
          Role: "Admin",
          Status: "Active",
        },
        {
          Name: "Jane Smith",
          Email: "jane.smith@example.com",
          Mobile: "9876543211",
          Role: "Sales Manager",
          Status: "Active",
        },
      ];

      sendSecureExcelFile(res, sampleData, {
        filename: "users_template.xlsx",
        sheetName: "Users",
        title: "Users Import Template",
        subject: "User Data Import Template",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export users
  app.get("/api/users/export", async (req, res) => {
    try {
      const users = await storage.getUsers(req.tenantId!);
      const exportData = users.map(user => ({
        Name: user.name,
        Email: user.email,
        Mobile: user.mobile || "",
        Role: user.roleName || "",
        Status: user.status,
        "Created At": new Date(user.createdAt).toLocaleDateString(),
      }));

      sendSecureExcelFile(res, exportData, {
        filename: "users.xlsx",
        sheetName: "Users",
        title: "Users Data Export",
        subject: "User Data Export",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Import users
  app.post("/api/users/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const allRoles = await storage.getRoles(req.tenantId!);

      const users = data.map((row: any) => {
        const roleName = row.Role || row.role;
        const role = allRoles.find(r => r.name === roleName);

        return {
          name: row.Name || row.name,
          email: row.Email || row.email,
          mobile: row.Mobile || row.mobile || "",
          roleId: role?.id,
          status: row.Status || row.status || "Active",
        };
      });

      const createdUsers = await Promise.all(
        users.map(user => storage.createUser(req.tenantId!, user))
      );

      res.status(201).json({ 
        message: `Successfully imported ${createdUsers.length} users`,
        count: createdUsers.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single user
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.tenantId!, req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create user
  app.post("/api/users", requirePermission("User Management", "create"), async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const user = await storage.createUser(req.tenantId!, validation.data);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user
  app.put("/api/users/:id", requirePermission("User Management", "edit"), async (req, res) => {
    try {
      const validation = insertUserSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      // Check if user is admin before allowing role changes
      const existingUser = await storage.getUser(req.tenantId!, req.params.id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent role assignment/changes for admin users
      if (existingUser.isAdmin && validation.data.roleId !== undefined) {
        return res.status(403).json({ 
          message: "Cannot modify role for primary tenant admin. Admin users have locked full access as per subscription plan. Create a separate user account for limited access." 
        });
      }

      const user = await storage.updateUser(req.tenantId!, req.params.id, validation.data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete user
  app.delete("/api/users/:id", requirePermission("User Management", "delete"), async (req, res) => {
    try {
      const success = await storage.deleteUser(req.tenantId!, req.params.id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk delete users
  app.post("/api/users/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid IDs array" });
      }

      const count = await storage.bulkDeleteUsers(req.tenantId!, ids);
      res.json({ message: `Successfully deleted ${count} users`, count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ USER COLUMN PREFERENCES ROUTES ============

  // Get user's column preferences for a specific module
  app.get("/api/user-preferences/columns/:module", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const moduleName = req.params.module;
      
      const preference = await storage.getUserColumnPreference(sessionUser.id, moduleName);
      res.json(preference || { visibleColumns: [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save/Update user's column preferences for a module
  app.post("/api/user-preferences/columns/:module", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const moduleName = req.params.module;
      const { visibleColumns } = req.body;

      if (!Array.isArray(visibleColumns)) {
        return res.status(400).json({ message: "visibleColumns must be an array" });
      }

      const savedPreference = await storage.saveUserColumnPreference(sessionUser.id, moduleName, visibleColumns);
      res.json(savedPreference);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ EMAIL CONFIGURATION ROUTES ============

  // Get current email configuration (without sensitive data)
  app.get("/api/email-config", async (req, res) => {
    try {
      const config = await storage.getEmailConfig(req.tenantId ?? null);
      if (!config) {
        return res.json(null);
      }

      const { smtpPassword, gmailAccessToken, gmailRefreshToken, ...safeConfig } = config;
      res.json(safeConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save email configuration
  app.post("/api/email-config", async (req, res) => {
    try {
      const validation = insertEmailConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const tenantId = req.tenantId ?? null;
      const existingConfig = await storage.getEmailConfig(tenantId);
      let config;
      
      if (existingConfig) {
        config = await storage.updateEmailConfig(tenantId, existingConfig.id, validation.data);
      } else {
        config = await storage.createEmailConfig(tenantId, validation.data);
      }

      if (!config) {
        return res.status(500).json({ message: "Failed to save email configuration" });
      }

      const { smtpPassword, gmailAccessToken, gmailRefreshToken, ...safeConfig } = config;
      res.json(safeConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update email configuration
  app.put("/api/email-config/:id", async (req, res) => {
    try {
      const validation = insertEmailConfigSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const config = await storage.updateEmailConfig(req.tenantId ?? null, req.params.id, validation.data);
      if (!config) {
        return res.status(404).json({ message: "Email configuration not found" });
      }

      const { smtpPassword, gmailAccessToken, gmailRefreshToken, ...safeConfig } = config;
      res.json(safeConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test email connection
  app.post("/api/email-config/test", async (req, res) => {
    try {
      const { testEmail } = req.body;
      if (!testEmail) {
        return res.status(400).json({ message: "Test email address is required" });
      }

      const config = await storage.getEmailConfig(req.tenantId ?? null);
      if (!config) {
        return res.status(400).json({ message: "No email configuration found" });
      }

      if (config.isActive !== "Active") {
        return res.status(400).json({ message: "Email configuration is not active" });
      }

      const isValid = await testEmailConnection(config);
      if (!isValid) {
        return res.status(400).json({ message: "Failed to connect to email server. Please check your configuration." });
      }

      await sendEmail(
        config,
        testEmail,
        "Test Email",
        "<p>This is a test email from your application. If you received this, your email configuration is working correctly!</p>"
      );

      res.json({ message: "Test email sent successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ GOOGLE OAUTH ROUTES ============
  
  // Initiate Google OAuth flow
  app.get("/api/auth/google", async (req, res) => {
    try {
      const { getAuthUrl } = await import("./google-oauth");
      const authUrl = getAuthUrl();
      res.json({ url: authUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Google OAuth callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).send('<html><body><h1>Error: No authorization code received</h1><p>Please close this window and try again.</p></body></html>');
      }

      const { getTokensFromCode } = await import("./google-oauth");
      const tokens = await getTokensFromCode(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        return res.status(400).send('<html><body><h1>Error: Failed to get tokens</h1><p>Please close this window and try again.</p></body></html>');
      }

      // For OAuth callback, we need to get tenantId from state or session
      const sessionUser = (req.session as any).user;
      const tenantId = sessionUser?.tenantId || null;
      
      const existingConfig = await storage.getEmailConfig(tenantId);
      const configData: any = {
        provider: "gmail" as const,
        fromEmail: existingConfig?.fromEmail || "",
        fromName: existingConfig?.fromName || "Business Manager",
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        isActive: "Active" as const,
      };

      if (existingConfig) {
        await storage.updateEmailConfig(tenantId, existingConfig.id, configData);
      } else {
        await storage.createEmailConfig(tenantId, configData);
      }

      res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 3rem;
                border-radius: 1rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
              }
              h1 {
                color: #10b981;
                margin-bottom: 1rem;
              }
              p {
                color: #6b7280;
                margin-bottom: 2rem;
              }
              .close-btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.2s;
              }
              .close-btn:hover {
                background: #5568d3;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Authentication Successful!</h1>
              <p>Your Gmail account has been connected successfully. You can now close this window and return to the application.</p>
              <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.status(500).send(`
        <html>
          <body>
            <h1>Error</h1>
            <p>${error.message}</p>
            <button onclick="window.close()">Close Window</button>
          </body>
        </html>
      `);
    }
  });

  // ============ EMAIL TEMPLATE ROUTES ============

  // Get all email templates
  app.get("/api/email-templates", async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates(req.tenantId!);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get templates for specific module
  app.get("/api/email-templates/module/:module", async (req, res) => {
    try {
      const templates = await storage.getEmailTemplatesByModule(req.tenantId!, req.params.module);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single template
  app.get("/api/email-templates/:id", async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.tenantId!, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new template
  app.post("/api/email-templates", async (req, res) => {
    try {
      const validation = insertEmailTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const template = await storage.createEmailTemplate(req.tenantId!, validation.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update template
  app.put("/api/email-templates/:id", async (req, res) => {
    try {
      const validation = insertEmailTemplateSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const template = await storage.updateEmailTemplate(req.tenantId!, req.params.id, validation.data);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete template
  app.delete("/api/email-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmailTemplate(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json({ message: "Email template deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seed default email templates for current tenant
  app.post("/api/email-templates/seed-defaults", async (req, res) => {
    try {
      // Call the seed function which will handle the current tenant
      await seedEmailTemplates();
      res.json({ message: "Default email templates loaded successfully" });
    } catch (error: any) {
      console.error("Error seeding email templates:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SEND EMAIL ROUTE ============

  // Send email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { 
        to, 
        templateId, 
        templateData, 
        subject, 
        body, 
        quotationId, 
        invoiceId, 
        receiptId,
        leadId,
        piId,
        customerId,
        module 
      } = req.body;

      if (!to) {
        return res.status(400).json({ message: "Recipient email address is required" });
      }

      const config = await storage.getEmailConfig(req.tenantId!);
      if (!config) {
        return res.status(400).json({ message: "No email configuration found. Please configure email settings first." });
      }

      if (config.isActive !== "Active") {
        return res.status(400).json({ message: "Email configuration is not active" });
      }

      // Determine module type and data ID from request
      let moduleType = module;
      let dataId: string | undefined;

      if (!moduleType) {
        if (quotationId) {
          moduleType = 'quotations';
          dataId = quotationId;
        } else if (invoiceId) {
          moduleType = 'invoices';
          dataId = invoiceId;
        } else if (receiptId) {
          moduleType = 'receipts';
          dataId = receiptId;
        } else if (leadId) {
          moduleType = 'leads';
          dataId = leadId;
        } else if (piId) {
          moduleType = 'proforma_invoices';
          dataId = piId;
        } else if (customerId) {
          moduleType = 'debtors';
          dataId = customerId;
        }
      } else {
        // Module type is provided, determine dataId based on what's available
        if (quotationId) dataId = quotationId;
        else if (invoiceId) dataId = invoiceId;
        else if (receiptId) dataId = receiptId;
        else if (leadId) dataId = leadId;
        else if (piId) dataId = piId;
        else if (customerId) dataId = customerId;
      }

      // Get baseUrl from request origin for absolute links
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // Get enriched variables using the new email-utils system
      const enrichedData = await getEnrichedEmailVariables(
        req.tenantId!,
        moduleType || 'general',
        baseUrl,
        dataId,
        templateData
      );

      // Render email subject and body
      let emailSubject: string;
      let emailBody: string;

      if (templateId) {
        // Use template from database
        const template = await storage.getEmailTemplate(req.tenantId!, templateId);
        if (!template) {
          return res.status(404).json({ message: "Email template not found" });
        }

        emailSubject = renderTemplate(template.subject, enrichedData);
        emailBody = renderTemplate(template.body, enrichedData);
      } else if (subject && body) {
        // Use provided subject and body, apply variable substitution if data is available
        emailSubject = dataId ? renderTemplate(subject, enrichedData) : subject;
        emailBody = dataId ? renderTemplate(body, enrichedData) : body;
      } else {
        return res.status(400).json({ 
          message: "Either templateId with templateData or subject and body are required" 
        });
      }

      await sendEmail(config, to, emailSubject, emailBody);

      res.json({ 
        message: "Email sent successfully",
        to,
        subject: emailSubject
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ RINGG.AI CALLING AGENT ROUTES ============

  // Get Ringg.ai configuration
  app.get("/api/ringg-config", async (req, res) => {
    try {
      const config = await storage.getRinggConfig(req.tenantId!);
      if (!config) {
        return res.status(404).json({ message: "Ringg.ai configuration not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create or update Ringg.ai configuration
  app.post("/api/ringg-config", async (req, res) => {
    try {
      const validation = insertRinggConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const existingConfig = await storage.getRinggConfig(req.tenantId!);
      const webhookUrl = `${process.env.REPLIT_DOMAINS || 'localhost'}/api/calls/webhook`;
      
      const configData = {
        ...validation.data,
        webhookUrl,
      };

      let config;
      if (existingConfig) {
        config = await storage.updateRinggConfig(req.tenantId!, existingConfig.id, configData);
      } else {
        config = await storage.createRinggConfig(req.tenantId!, configData);
      }

      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update Ringg.ai configuration
  app.put("/api/ringg-config/:id", async (req, res) => {
    try {
      const validation = insertRinggConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const webhookUrl = `${process.env.REPLIT_DOMAINS || 'localhost'}/api/calls/webhook`;
      
      const configData = {
        ...validation.data,
        webhookUrl,
      };

      const config = await storage.updateRinggConfig(req.tenantId!, req.params.id, configData);
      if (!config) {
        return res.status(404).json({ message: "Ringg.ai configuration not found" });
      }

      return res.status(200).json(config);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Test Ringg.ai API connection
  app.post("/api/ringg-config/test", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      const result = await ringgService.testConnection(apiKey);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all call script mappings
  app.get("/api/ringg-scripts", async (req, res) => {
    try {
      const mappings = await storage.getCallScriptMappings(req.tenantId!);
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get script mappings by module
  app.get("/api/ringg-scripts/module/:module", async (req, res) => {
    try {
      const mappings = await storage.getCallScriptMappingsByModule(req.tenantId!, req.params.module);
      res.json(mappings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create script mapping
  app.post("/api/ringg-scripts", async (req, res) => {
    try {
      const validation = insertCallScriptMappingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const mapping = await storage.createCallScriptMapping(req.tenantId!, validation.data);
      res.status(201).json(mapping);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update script mapping
  app.put("/api/ringg-scripts/:id", async (req, res) => {
    try {
      const validation = insertCallScriptMappingSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const mapping = await storage.updateCallScriptMapping(req.tenantId!, req.params.id, validation.data);
      if (!mapping) {
        return res.status(404).json({ message: "Script mapping not found" });
      }
      res.json(mapping);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete script mapping
  app.delete("/api/ringg-scripts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCallScriptMapping(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Script mapping not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Trigger a call
  app.post("/api/calls", async (req, res) => {
    try {
      const { phoneNumber, scriptId, customerName, module, callContext } = req.body;

      if (!phoneNumber || !scriptId || !customerName || !module) {
        return res.status(400).json({ 
          message: "phoneNumber, scriptId, customerName, and module are required" 
        });
      }

      const config = await storage.getRinggConfig(req.tenantId!);
      if (!config) {
        return res.status(400).json({ 
          message: "Ringg.ai configuration not found. Please configure Ringg.ai settings first." 
        });
      }

      const scriptMapping = await storage.getCallScriptMapping(req.tenantId!, scriptId);
      if (!scriptMapping) {
        return res.status(400).json({ 
          message: "Script mapping not found. Please check your script configuration." 
        });
      }

      let parsedContext = {};
      if (callContext) {
        try {
          parsedContext = typeof callContext === 'string' ? JSON.parse(callContext) : callContext;
          console.log('[Call API] Parsed context:', parsedContext);
        } catch (error) {
          return res.status(400).json({ message: "Invalid callContext JSON" });
        }
      }

      const callLog = await storage.createCallLog(req.tenantId!, {
        customerName,
        phoneNumber,
        module,
        scriptId,
        status: "initiated",
        callContext: callContext || null,
      });

      const callVariables = {
        customerName,
        module,
        ...parsedContext,
      };
      console.log('[Call API] Sending variables to Ringg.ai:', callVariables);

      const callResult = await ringgService.triggerCall(config.apiKey, {
        phoneNumber,
        scriptId: scriptMapping.ringgScriptId,
        fromNumber: config.fromNumber,
        variables: callVariables,
      });

      if (!callResult.success) {
        await storage.updateCallLog(req.tenantId!, callLog.id, {
          status: "failed",
          outcome: callResult.message || "Failed to trigger call",
        });
        return res.status(500).json({ 
          message: callResult.message || "Failed to trigger call" 
        });
      }

      const updatedLog = await storage.updateCallLog(req.tenantId!, callLog.id, {
        ringgCallId: callResult.callId,
      });

      res.status(201).json(updatedLog);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook to receive call status updates from Ringg.ai
  app.post("/api/calls/webhook", async (req, res) => {
    try {
      console.log('[Ringg.ai Webhook] Received webhook data:', JSON.stringify(req.body, null, 2));
      
      const { call_id, callId, status, duration, recording_url, recordingUrl, transcript, outcome } = req.body;

      const ringgCallId = call_id || callId;
      if (!ringgCallId) {
        console.log('[Ringg.ai Webhook] Error: No call_id or callId provided');
        return res.status(400).json({ message: "call_id or callId is required" });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (duration !== undefined) updateData.duration = duration;
      if (recording_url || recordingUrl) updateData.recordingUrl = recording_url || recordingUrl;
      if (transcript) updateData.transcript = transcript;
      if (outcome) updateData.outcome = outcome;

      // Webhook doesn't have req.tenantId, so we need to handle this differently
      // For now, update by ringgCallId only (the method will need to handle cross-tenant lookup)
      const updatedLog = await storage.updateCallLogByRinggId(ringgCallId, updateData);
      
      if (!updatedLog) {
        return res.status(404).json({ message: "Call log not found" });
      }

      res.json({ success: true, message: "Webhook received successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get call history
  app.get("/api/calls/history", async (req, res) => {
    try {
      const { module, customerId } = req.query;

      let logs;
      if (module) {
        logs = await storage.getCallLogsByModule(req.tenantId!, module as string);
      } else if (customerId) {
        logs = await storage.getCallLogsByCustomer(req.tenantId!, customerId as string);
      } else {
        logs = await storage.getCallLogs(req.tenantId!);
      }

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single call log
  app.get("/api/calls/:id", async (req, res) => {
    try {
      const log = await storage.getCallLog(req.tenantId!, req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Call log not found" });
      }
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ WHATSAPP CONFIGURATION ROUTES ============

  // Get WhatsApp configuration
  app.get("/api/whatsapp-config", async (req, res) => {
    try {
      const config = await storage.getWhatsappConfig(req.tenantId!);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save or update WhatsApp configuration
  app.post("/api/whatsapp-config", async (req, res) => {
    try {
      const validation = insertWhatsappConfigSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const config = await storage.saveWhatsappConfig(req.tenantId!, validation.data);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Test WhatsApp connection
  app.post("/api/whatsapp-config/test", async (req, res) => {
    try {
      const config = await storage.getWhatsappConfig(req.tenantId!);
      if (!config) {
        return res.status(400).json({ message: "No WhatsApp configuration found" });
      }

      const { testWhatsAppConnection } = await import("./whatsapp-service");
      const result = await testWhatsAppConnection(config);
      
      if (result.success) {
        res.json({ success: true, message: "WhatsApp connection test successful" });
      } else {
        res.status(400).json({ success: false, message: result.error || "Connection test failed" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============ WHATSAPP TEMPLATES ROUTES ============

  // Get all WhatsApp templates
  app.get("/api/whatsapp-templates", async (req, res) => {
    try {
      const { module } = req.query;
      let templates;
      
      if (module) {
        templates = await storage.getWhatsappTemplatesByModule(req.tenantId!, module as string);
      } else {
        templates = await storage.getWhatsappTemplates(req.tenantId!);
      }
      
      res.json(templates);
    } catch (error: any) {
      console.error('[WhatsApp Templates] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get single WhatsApp template
  app.get("/api/whatsapp-templates/:id", async (req, res) => {
    try {
      const template = await storage.getWhatsappTemplate(req.tenantId!, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "WhatsApp template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create WhatsApp template
  app.post("/api/whatsapp-templates", async (req, res) => {
    try {
      const validation = insertWhatsappTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const template = await storage.createWhatsappTemplate(req.tenantId!, validation.data);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update WhatsApp template
  app.put("/api/whatsapp-templates/:id", async (req, res) => {
    try {
      const validation = insertWhatsappTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: fromZodError(validation.error).message });
      }

      const template = await storage.updateWhatsappTemplate(req.tenantId!, req.params.id, validation.data);
      if (!template) {
        return res.status(404).json({ message: "WhatsApp template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete WhatsApp template
  app.delete("/api/whatsapp-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWhatsappTemplate(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "WhatsApp template not found" });
      }
      res.json({ message: "WhatsApp template deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ WHATSAPP WEB ROUTES ============

  // Initialize WhatsApp Web client
  app.post("/api/whatsapp-web/initialize", async (req, res) => {
    try {
      await whatsappWebService.initializeClient(req.tenantId!);
      res.json({ message: "WhatsApp Web client initialized" });
    } catch (error: any) {
      console.error("Failed to initialize WhatsApp Web:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get WhatsApp Web status and QR code
  app.get("/api/whatsapp-web/status", async (req, res) => {
    try {
      const status = whatsappWebService.getStatus(req.tenantId!);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Disconnect WhatsApp Web
  app.post("/api/whatsapp-web/disconnect", async (req, res) => {
    try {
      await whatsappWebService.disconnect(req.tenantId!);
      res.json({ message: "WhatsApp Web disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SEND WHATSAPP MESSAGE ROUTE ============

  // Send WhatsApp message
  app.post("/api/send-whatsapp", async (req, res) => {
    try {
      const { to, templateId, templateData, message: directMessage, quotationId, invoiceId, receiptId } = req.body;

      if (!to) {
        return res.status(400).json({ message: "Recipient phone number is required" });
      }

      const config = await storage.getWhatsappConfig(req.tenantId!);
      if (!config) {
        return res.status(400).json({ message: "No WhatsApp configuration found. Please configure WhatsApp settings first." });
      }

      if (config.isActive !== "Active") {
        return res.status(400).json({ message: "WhatsApp configuration is not active" });
      }

      let enrichedData = templateData || {};

      // Enrich data for quotation WhatsApp messages
      if (quotationId) {
        const quotation = await storage.getQuotation(req.tenantId!, quotationId);
        if (!quotation) {
          return res.status(404).json({ message: "Quotation not found" });
        }

        const companyProfile = await storage.getCompanyProfile(req.tenantId!);
        
        enrichedData = {
          ...enrichedData,
          customerName: quotation.leadName,
          quotationNumber: quotation.quotationNumber,
          quotationDate: quotation.quotationDate ? new Date(quotation.quotationDate).toLocaleDateString("en-IN") : "",
          totalAmount: `₹${quotation.grandTotal}`,
          companyName: companyProfile?.legalName || "Our Company",
        };
      }

      // Enrich data for invoice WhatsApp messages
      if (invoiceId) {
        const invoice = await storage.getInvoice(req.tenantId!, invoiceId);
        if (!invoice) {
          return res.status(404).json({ message: "Invoice not found" });
        }

        const companyProfile = await storage.getCompanyProfile(req.tenantId!);
        
        enrichedData = {
          ...enrichedData,
          customerName: invoice.customerName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-IN") : "",
          totalAmount: `₹${invoice.invoiceAmount}`,
          companyName: companyProfile?.legalName || "Our Company",
        };
      }

      // Enrich data for receipt WhatsApp messages
      if (receiptId) {
        const receipt = await storage.getReceipt(req.tenantId!, receiptId);
        if (!receipt) {
          return res.status(404).json({ message: "Receipt not found" });
        }

        const companyProfile = await storage.getCompanyProfile(req.tenantId!);
        
        enrichedData = {
          ...enrichedData,
          customerName: receipt.customerName,
          voucherNumber: receipt.voucherNumber,
          voucherType: receipt.voucherType,
          receiptDate: receipt.date ? new Date(receipt.date).toLocaleDateString("en-IN") : "",
          amount: `₹${receipt.amount}`,
          companyName: companyProfile?.legalName || "Our Company",
        };
      }

      let messageToSend = directMessage;

      // If templateId is provided, get the template and render it
      if (templateId) {
        const template = await storage.getWhatsappTemplate(req.tenantId!, templateId);
        if (!template) {
          return res.status(404).json({ message: "WhatsApp template not found" });
        }

        const { renderTemplate } = await import("./whatsapp-service");
        messageToSend = renderTemplate(template.message, enrichedData);
      }

      if (!messageToSend) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Simulate successful WhatsApp sending without calling external API
      // This is useful for testing and development
      console.log(`[WhatsApp Simulation] Would send to ${to}:`, messageToSend);
      
      const simulatedMessageId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.json({ 
        message: "WhatsApp message sent successfully (simulated)", 
        messageId: simulatedMessageId,
        to,
        simulated: true
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Communication Schedules Routes
  app.get("/api/schedules", async (req, res) => {
    try {
      const { module } = req.query;
      let schedules;
      
      if (module) {
        schedules = await storage.getCommunicationSchedulesByModule(req.tenantId!, module as string);
      } else {
        schedules = await storage.getCommunicationSchedules(req.tenantId!);
      }
      
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/schedules/:id", async (req, res) => {
    try {
      const schedule = await storage.getCommunicationSchedule(req.tenantId!, req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    try {
      const schedule = await storage.createCommunicationSchedule(req.tenantId!, req.body);
      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/schedules/:id", async (req, res) => {
    try {
      const schedule = await storage.updateCommunicationSchedule(req.tenantId!, req.params.id, req.body);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCommunicationSchedule(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== CREDIT CONTROL / RECOVERY MANAGEMENT ROUTES ====================
  
  // Get Category Rules (Payment Delay Thresholds)
  app.get("/api/recovery/category-rules", async (req, res) => {
    try {
      const rules = await storage.getCategoryRules(req.tenantId!);
      // Return defaults if not configured yet
      if (!rules) {
        return res.json({
          alphaDays: 0,
          betaDays: 15,
          gammaDays: 45,
          deltaDays: 100
        });
      }
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update Category Rules
  app.put("/api/recovery/category-rules", async (req, res) => {
    try {
      const result = insertCategoryRulesSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid category rules", errors: result.error.flatten() });
      }
      const rules = await storage.updateCategoryRules(req.tenantId!, result.data);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Follow-up Rules
  app.get("/api/recovery/followup-rules", async (req, res) => {
    try {
      const rules = await storage.getFollowupRules(req.tenantId!);
      // Return defaults if not configured yet
      if (!rules) {
        return res.json({
          betaDays: 4,
          gammaDays: 8,
          deltaDays: 12
        });
      }
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update Follow-up Rules
  app.put("/api/recovery/followup-rules", async (req, res) => {
    try {
      const result = insertFollowupRulesSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid followup rules", errors: result.error.flatten() });
      }
      const rules = await storage.updateFollowupRules(req.tenantId!, result.data);
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Recovery Settings (Auto/Manual toggle)
  app.get("/api/recovery/settings", async (req, res) => {
    try {
      const settings = await storage.getRecoverySettings(req.tenantId!);
      // Return defaults if not configured yet
      if (!settings) {
        return res.json({
          autoUpgradeEnabled: false
        });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update Recovery Settings
  app.put("/api/recovery/settings", async (req, res) => {
    try {
      const result = insertRecoverySettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid recovery settings", errors: result.error.flatten() });
      }
      const settings = await storage.updateRecoverySettings(req.tenantId!, result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Follow-up Automation Settings
  app.get("/api/recovery/followup-automation", async (req, res) => {
    try {
      const settings = await storage.getFollowupAutomationSettings(req.tenantId!);
      // Return defaults if not configured yet
      if (!settings) {
        return res.json({
          schedulingMode: "after_due",
          categoryActions: JSON.stringify({
            alpha: { whatsapp: false, email: false, ivr: false },
            beta: { whatsapp: true, email: true, ivr: false },
            gamma: { whatsapp: true, email: true, ivr: true },
            delta: { whatsapp: true, email: true, ivr: true }
          }),
          enableIvrCalling: false,
          callingHoursStart: "09:00",
          callingHoursEnd: "18:00",
          maxRetriesPerDay: 3
        });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update Follow-up Automation Settings
  app.put("/api/recovery/followup-automation", async (req, res) => {
    try {
      const result = insertFollowupAutomationSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid followup automation settings", errors: result.error.flatten() });
      }
      const settings = await storage.updateFollowupAutomationSettings(req.tenantId!, result.data);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get All Follow-up Schedules
  app.get("/api/recovery/followup-schedules", async (req, res) => {
    try {
      const schedules = await storage.getFollowupSchedules(req.tenantId!);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create Follow-up Schedule
  app.post("/api/recovery/followup-schedules", async (req, res) => {
    try {
      const result = insertFollowupScheduleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid followup schedule", errors: result.error.flatten() });
      }
      const schedule = await storage.createFollowupSchedule(req.tenantId!, result.data);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update Follow-up Schedule
  app.put("/api/recovery/followup-schedules/:id", async (req, res) => {
    try {
      const result = insertFollowupScheduleSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid followup schedule", errors: result.error.flatten() });
      }
      const schedule = await storage.updateFollowupSchedule(req.tenantId!, req.params.id, result.data);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete Follow-up Schedule
  app.delete("/api/recovery/followup-schedules/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFollowupSchedule(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Category Change Logs
  app.get("/api/recovery/category-logs", async (req, res) => {
    try {
      const logs = await storage.getCategoryChangeLogs(req.tenantId!);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Run Auto-Category Upgrade (System-driven)
  app.post("/api/recovery/run-auto-upgrade", async (req, res) => {
    try {
      // Check if auto-upgrade is enabled
      const settings = await storage.getRecoverySettings(req.tenantId!);
      if (!settings?.autoUpgradeEnabled) {
        return res.status(400).json({ message: "Auto-upgrade is disabled. Please enable it in settings." });
      }

      // Get thresholds (cumulative grace periods)
      const rules = await storage.getCategoryRules(req.tenantId!) || {
        alphaDays: 5,
        betaDays: 20,
        gammaDays: 40,
        deltaDays: 100,
        partialPaymentThresholdPercent: 80
      };

      const invoices = await storage.getInvoices(req.tenantId!);
      const receipts = await storage.getReceipts(req.tenantId!);
      const customers = await storage.getMasterCustomers(req.tenantId!);
      const today = new Date();
      const upgradedCustomers: any[] = [];

      // Calculate cumulative thresholds
      const alphaEnd = rules.alphaDays;
      const betaEnd = rules.alphaDays + rules.betaDays;
      const gammaEnd = rules.alphaDays + rules.betaDays + rules.gammaDays;
      // Delta starts after gammaEnd

      // Calculate max days overdue per customer (excluding invoices with partial payments >= threshold)
      const customerOverdue = new Map<string, number>();
      
      // Group receipts by customer for calculation
      const receiptsByCustomer = new Map<string, typeof receipts>();
      receipts.forEach(receipt => {
        const customerReceipts = receiptsByCustomer.get(receipt.customerName) || [];
        customerReceipts.push(receipt);
        receiptsByCustomer.set(receipt.customerName, customerReceipts);
      });

      for (const invoice of invoices) {
        if (invoice.status === "Paid") continue;

        const invoiceDate = new Date(invoice.invoiceDate);
        const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);

        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          // Check partial payment threshold
          const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
          const customerReceipts = receiptsByCustomer.get(invoice.customerName) || [];
          
          // Calculate FIFO allocation for this invoice
          const customerInvoices = invoices.filter(inv => inv.customerName === invoice.customerName)
            .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
          
          let totalPaid = customerReceipts.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
          let cumulativeAmount = 0;
          let allocatedToThisInvoice = 0;
          
          for (const inv of customerInvoices) {
            const invAmount = parseFloat(inv.invoiceAmount.toString());
            if (inv.id === invoice.id) {
              const beforeThis = cumulativeAmount;
              if (totalPaid > beforeThis) {
                allocatedToThisInvoice = Math.min(totalPaid - beforeThis, invAmount);
              }
              break;
            }
            cumulativeAmount += invAmount;
          }

          const paymentPercent = (allocatedToThisInvoice / invoiceAmount) * 100;
          
          // Skip if payment percentage meets or exceeds threshold
          if (paymentPercent >= rules.partialPaymentThresholdPercent) {
            continue;
          }

          const current = customerOverdue.get(invoice.customerName) || 0;
          customerOverdue.set(invoice.customerName, Math.max(current, daysOverdue));
        }
      }

      // Upgrade categories based on cumulative thresholds
      for (const customer of customers) {
        const maxOverdue = customerOverdue.get(customer.clientName) || 0;
        if (maxOverdue === 0) continue; // No qualifying overdue invoices

        let newCategory = customer.category;
        
        // Determine new category using cumulative grace periods
        // Alpha: 0 to alphaDays
        // Beta: alphaDays+1 to betaEnd
        // Gamma: betaEnd+1 to gammaEnd
        // Delta: gammaEnd+1 and beyond
        if (maxOverdue > gammaEnd) {
          newCategory = "Delta";
        } else if (maxOverdue > betaEnd) {
          newCategory = "Gamma";
        } else if (maxOverdue > alphaEnd) {
          newCategory = "Beta";
        } else {
          newCategory = "Alpha";
        }

        // Upgrade if category changed
        if (newCategory !== customer.category) {
          await storage.updateMasterCustomer(req.tenantId!, customer.id, { category: newCategory });
          
          // Log the change
          await storage.logCategoryChange(req.tenantId!, {
            customerId: customer.id,
            customerName: customer.clientName,
            oldCategory: customer.category as "Alpha" | "Beta" | "Gamma" | "Delta",
            newCategory: newCategory as "Alpha" | "Beta" | "Gamma" | "Delta",
            changeType: "auto",
            changedBy: undefined,
            reason: `Auto-upgraded due to ${maxOverdue} days overdue`,
            daysOverdue: maxOverdue,
          });

          upgradedCustomers.push({
            customerName: customer.clientName,
            oldCategory: customer.category,
            newCategory,
            daysOverdue: maxOverdue,
          });
        }
      }

      res.json({ 
        message: `Auto-upgrade completed. ${upgradedCustomers.length} customer(s) upgraded.`,
        upgradedCustomers 
      });
    } catch (error: any) {
      console.error("Failed to run auto-upgrade:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Calculate Category Recommendations (preview only, does not apply changes)
  app.post("/api/recovery/calculate-categories", async (req, res) => {
    try {
      const { filterCategories } = req.body;

      // Get thresholds (cumulative grace periods)
      const rules = await storage.getCategoryRules(req.tenantId!) || {
        alphaDays: 5,
        betaDays: 20,
        gammaDays: 40,
        deltaDays: 100,
        partialPaymentThresholdPercent: 80
      };

      const invoices = await storage.getInvoices(req.tenantId!);
      const receipts = await storage.getReceipts(req.tenantId!);
      const customers = await storage.getMasterCustomers(req.tenantId!);
      const today = new Date();

      // Calculate cumulative thresholds
      const alphaEnd = rules.alphaDays;
      const betaEnd = rules.alphaDays + rules.betaDays;
      const gammaEnd = rules.alphaDays + rules.betaDays + rules.gammaDays;

      // Calculate max days overdue per customer (excluding invoices with partial payments >= threshold)
      const customerOverdue = new Map<string, { maxDays: number, oldestInvoiceDate: Date | null, totalOutstanding: number, invoiceDetails: any[] }>();
      
      // Group receipts by customer for calculation
      const receiptsByCustomer = new Map<string, typeof receipts>();
      receipts.forEach(receipt => {
        const customerReceipts = receiptsByCustomer.get(receipt.customerName) || [];
        customerReceipts.push(receipt);
        receiptsByCustomer.set(receipt.customerName, customerReceipts);
      });

      for (const invoice of invoices) {
        if (invoice.status === "Paid") continue;

        const invoiceDate = new Date(invoice.invoiceDate);
        const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);

        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          // Check partial payment threshold
          const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
          const customerReceipts = receiptsByCustomer.get(invoice.customerName) || [];
          
          // Calculate FIFO allocation for this invoice
          const customerInvoices = invoices.filter(inv => inv.customerName === invoice.customerName)
            .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
          
          let totalPaid = customerReceipts.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
          let cumulativeAmount = 0;
          let allocatedToThisInvoice = 0;
          
          for (const inv of customerInvoices) {
            const invAmount = parseFloat(inv.invoiceAmount.toString());
            if (inv.id === invoice.id) {
              const beforeThis = cumulativeAmount;
              if (totalPaid > beforeThis) {
                allocatedToThisInvoice = Math.min(totalPaid - beforeThis, invAmount);
              }
              break;
            }
            cumulativeAmount += invAmount;
          }

          const paymentPercent = (allocatedToThisInvoice / invoiceAmount) * 100;
          
          // Skip if payment percentage meets or exceeds threshold
          if (paymentPercent >= rules.partialPaymentThresholdPercent) {
            continue;
          }

          const current = customerOverdue.get(invoice.customerName) || { 
            maxDays: 0, 
            oldestInvoiceDate: null, 
            totalOutstanding: 0,
            invoiceDetails: []
          };
          
          customerOverdue.set(invoice.customerName, {
            maxDays: Math.max(current.maxDays, daysOverdue),
            oldestInvoiceDate: current.oldestInvoiceDate === null || invoiceDate < current.oldestInvoiceDate ? invoiceDate : current.oldestInvoiceDate,
            totalOutstanding: current.totalOutstanding + (invoiceAmount - allocatedToThisInvoice),
            invoiceDetails: [...current.invoiceDetails, {
              invoiceNumber: invoice.invoiceNumber,
              invoiceDate: invoice.invoiceDate,
              amount: invoiceAmount,
              daysOverdue: daysOverdue,
              paymentPercent: paymentPercent
            }]
          });
        }
      }

      // Calculate recommendations
      const recommendations: any[] = [];
      const summary = {
        totalCustomers: 0,
        willChange: 0,
        noChange: 0,
        byCategory: { alpha: 0, beta: 0, gamma: 0, delta: 0 }
      };

      for (const customer of customers) {
        // Apply category filter if specified
        if (filterCategories && filterCategories.length > 0 && !filterCategories.includes(customer.category)) {
          continue;
        }

        const overdueData = customerOverdue.get(customer.clientName);
        const maxOverdue = overdueData?.maxDays || 0;
        let recommendedCategory = customer.category;
        let changeReason = "No overdue invoices";

        if (maxOverdue > 0) {
          // Determine new category using cumulative grace periods
          if (maxOverdue > gammaEnd) {
            recommendedCategory = "Delta";
            changeReason = `Overdue ${maxOverdue} days (beyond ${gammaEnd} days)`;
          } else if (maxOverdue > betaEnd) {
            recommendedCategory = "Gamma";
            changeReason = `Overdue ${maxOverdue} days (${betaEnd+1}-${gammaEnd} days)`;
          } else if (maxOverdue > alphaEnd) {
            recommendedCategory = "Beta";
            changeReason = `Overdue ${maxOverdue} days (${alphaEnd+1}-${betaEnd} days)`;
          } else {
            recommendedCategory = "Alpha";
            changeReason = `Overdue ${maxOverdue} days (0-${alphaEnd} days)`;
          }
        }

        const willChange = recommendedCategory !== customer.category;

        recommendations.push({
          customerId: customer.id,
          customerName: customer.clientName,
          currentCategory: customer.category,
          recommendedCategory,
          maxDaysOverdue: maxOverdue,
          totalOutstanding: overdueData?.totalOutstanding || 0,
          oldestInvoiceDate: overdueData?.oldestInvoiceDate?.toISOString() || null,
          changeReason,
          willChange,
          invoiceDetails: overdueData?.invoiceDetails || []
        });

        summary.totalCustomers++;
        if (willChange) {
          summary.willChange++;
        } else {
          summary.noChange++;
        }
        
        // Count by recommended category
        if (recommendedCategory === "Alpha") summary.byCategory.alpha++;
        else if (recommendedCategory === "Beta") summary.byCategory.beta++;
        else if (recommendedCategory === "Gamma") summary.byCategory.gamma++;
        else if (recommendedCategory === "Delta") summary.byCategory.delta++;
      }

      res.json({
        recommendations,
        summary,
        rules: {
          alphaRange: `0-${alphaEnd} days`,
          betaRange: `${alphaEnd+1}-${betaEnd} days`,
          gammaRange: `${betaEnd+1}-${gammaEnd} days`,
          deltaRange: `${gammaEnd+1}+ days`,
          partialPaymentThreshold: `${rules.partialPaymentThresholdPercent}%`
        }
      });
    } catch (error: any) {
      console.error("Failed to calculate categories:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Apply Category Changes (after review)
  app.post("/api/recovery/apply-category-changes", async (req, res) => {
    try {
      const { changes } = req.body;

      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ message: "No changes to apply" });
      }

      const appliedChanges: any[] = [];

      for (const change of changes) {
        const { customerId, newCategory, reason, daysOverdue } = change;

        const customer = await storage.getMasterCustomer(req.tenantId!, customerId);
        if (!customer) {
          console.warn(`Customer ${customerId} not found, skipping`);
          continue;
        }

        if (customer.category === newCategory) {
          continue; // Already in target category
        }

        // Update category
        await storage.updateMasterCustomer(req.tenantId!, customerId, { category: newCategory });

        // Log the change
        await storage.logCategoryChange(req.tenantId!, {
          customerId,
          customerName: customer.clientName,
          oldCategory: customer.category as "Alpha" | "Beta" | "Gamma" | "Delta",
          newCategory: newCategory as "Alpha" | "Beta" | "Gamma" | "Delta",
          changeType: "manual",
          changedBy: (req as any).user?.id || "system",
          reason: reason || "Category change applied from calculation review",
          daysOverdue: daysOverdue,
        });

        appliedChanges.push({
          customerName: customer.clientName,
          oldCategory: customer.category,
          newCategory,
          daysOverdue
        });
      }

      res.json({ 
        message: `Successfully applied ${appliedChanges.length} category change(s)`,
        appliedChanges
      });
    } catch (error: any) {
      console.error("Failed to apply category changes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Manual Category Change
  app.post("/api/recovery/manual-category-change", async (req, res) => {
    try {
      const { customerId, newCategory, reason } = req.body;
      
      if (!customerId || !newCategory) {
        return res.status(400).json({ message: "Customer ID and new category are required" });
      }

      const customer = await storage.getMasterCustomer(req.tenantId!, customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (customer.category === newCategory) {
        return res.status(400).json({ message: "Customer is already in this category" });
      }

      // Update category
      await storage.updateMasterCustomer(req.tenantId!, customerId, { category: newCategory });

      // Log the change
      await storage.logCategoryChange(req.tenantId!, {
        customerId,
        customerName: customer.clientName,
        oldCategory: customer.category as "Alpha" | "Beta" | "Gamma" | "Delta",
        newCategory: newCategory as "Alpha" | "Beta" | "Gamma" | "Delta",
        changeType: "manual",
        changedBy: (req as any).user?.id || "unknown",
        reason: reason || "Manual category change by user",
        daysOverdue: undefined,
      });

      res.json({ 
        message: "Category updated successfully",
        customer: { ...customer, category: newCategory }
      });
    } catch (error: any) {
      console.error("Failed to change category:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Urgent Actions - Overdue invoices requiring immediate attention
  app.get("/api/recovery/urgent-actions", async (req, res) => {
    try {
      // Fetch all invoices and customers
      const invoices = await storage.getInvoices(req.tenantId!);
      const customers = await storage.getMasterCustomers(req.tenantId!);
      const receipts = await storage.getReceipts(req.tenantId!);
      
      // Get threshold rules (cumulative grace periods)
      const categoryRules = await storage.getCategoryRules(req.tenantId!) || {
        alphaDays: 5,
        betaDays: 20,
        gammaDays: 40,
        deltaDays: 100,
        partialPaymentThresholdPercent: 80
      };

      // Calculate cumulative thresholds
      const alphaEnd = categoryRules.alphaDays;
      const betaEnd = categoryRules.alphaDays + categoryRules.betaDays;
      const gammaEnd = categoryRules.alphaDays + categoryRules.betaDays + categoryRules.gammaDays;

      const today = new Date();
      const urgentActions: any[] = [];

      // Group receipts by customer for FIFO allocation
      const receiptsByCustomer = new Map<string, typeof receipts>();
      receipts.forEach(receipt => {
        const customerReceipts = receiptsByCustomer.get(receipt.customerName) || [];
        customerReceipts.push(receipt);
        receiptsByCustomer.set(receipt.customerName, customerReceipts);
      });

      // Calculate overdue invoices
      for (const invoice of invoices) {
        if (invoice.status === "Paid") continue; // Skip paid invoices

        // Calculate due date
        const invoiceDate = new Date(invoice.invoiceDate);
        const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);

        // Calculate days overdue
        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) continue; // Skip invoices not yet overdue

        // Find customer details
        const customer = customers.find(c => c.clientName === invoice.customerName);
        const category = customer?.category || "Alpha";

        // Calculate outstanding amount using FIFO
        const invoiceAmount = parseFloat(invoice.invoiceAmount.toString());
        const customerReceipts = receiptsByCustomer.get(invoice.customerName) || [];
        const sortedReceipts = customerReceipts.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Simple outstanding calculation (can be enhanced with FIFO if needed)
        let totalPaid = 0;
        for (const receipt of sortedReceipts) {
          if (new Date(receipt.date) <= today) {
            totalPaid += parseFloat(receipt.amount.toString());
          }
        }

        // Get this invoice's share of payments (FIFO allocation)
        const customerInvoices = invoices.filter(inv => inv.customerName === invoice.customerName)
          .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
        
        let allocatedToThisInvoice = 0;
        let cumulativeAmount = 0;
        
        for (const inv of customerInvoices) {
          const invAmount = parseFloat(inv.invoiceAmount.toString());
          if (inv.id === invoice.id) {
            // This is our invoice - calculate how much of totalPaid applies to it
            const beforeThis = cumulativeAmount;
            const afterThis = cumulativeAmount + invAmount;
            if (totalPaid > beforeThis) {
              allocatedToThisInvoice = Math.min(totalPaid - beforeThis, invAmount);
            }
            break;
          }
          cumulativeAmount += invAmount;
        }

        const outstandingAmount = invoiceAmount - allocatedToThisInvoice;
        if (outstandingAmount <= 0) continue; // Skip if fully paid via FIFO

        // Check partial payment threshold - exclude if payment percentage >= threshold
        const paymentPercent = (allocatedToThisInvoice / invoiceAmount) * 100;
        if (paymentPercent >= categoryRules.partialPaymentThresholdPercent) {
          continue; // Skip this invoice as it meets the partial payment threshold
        }

        // Determine recommended action based on category and days overdue
        let recommendedAction = "";
        let severity = 0; // Higher is more urgent

        if (category === "Alpha") {
          if (daysOverdue >= 50) {
            recommendedAction = "Legal notice + Stop supply immediately";
            severity = 90;
          } else if (daysOverdue >= 20) {
            recommendedAction = "Manager visit + Written warning";
            severity = 70;
          } else {
            recommendedAction = "Send reminder + Personal call";
            severity = 50;
          }
        } else if (category === "Beta") {
          if (daysOverdue >= 45) {
            recommendedAction = "Legal notice + Stop supply immediately";
            severity = 85;
          } else if (daysOverdue >= 15) {
            recommendedAction = "Manager visit + Written warning";
            severity = 65;
          } else {
            recommendedAction = "Send reminder + Personal call";
            severity = 45;
          }
        } else if (category === "Gamma") {
          if (daysOverdue >= 45) {
            recommendedAction = "Legal notice + Stop supply immediately";
            severity = 80;
          } else {
            recommendedAction = "Manager visit + Written warning";
            severity = 60;
          }
        } else if (category === "Delta") {
          recommendedAction = "Legal notice + Stop supply immediately";
          severity = 100; // Highest priority
        }

        urgentActions.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          customerId: customer?.id,
          category,
          daysOverdue,
          outstandingAmount,
          invoiceAmount,
          invoiceDate: invoice.invoiceDate,
          dueDate,
          recommendedAction,
          severity,
          primaryMobile: invoice.primaryMobile || customer?.primaryMobile,
          primaryEmail: customer?.primaryEmail,
        });
      }

      // Sort by severity (highest first)
      urgentActions.sort((a, b) => b.severity - a.severity);

      res.json(urgentActions);
    } catch (error: any) {
      console.error("Failed to calculate urgent actions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Legal Notice Template CRUD Routes
  app.get("/api/recovery/legal-notices/templates", async (req, res) => {
    try {
      const templates = await storage.getLegalNoticeTemplates(req.tenantId!);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recovery/legal-notices/templates/:id", async (req, res) => {
    try {
      const template = await storage.getLegalNoticeTemplate(req.tenantId!, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recovery/legal-notices/templates", async (req, res) => {
    try {
      const result = insertLegalNoticeTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid template data", errors: result.error.flatten() });
      }
      const template = await storage.createLegalNoticeTemplate(req.tenantId!, result.data);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/recovery/legal-notices/templates/:id", async (req, res) => {
    try {
      const result = insertLegalNoticeTemplateSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid template data", errors: result.error.flatten() });
      }
      const template = await storage.updateLegalNoticeTemplate(req.tenantId!, req.params.id, result.data);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/recovery/legal-notices/templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLegalNoticeTemplate(req.tenantId!, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Legal Notices Sent History
  app.get("/api/recovery/legal-notices/sent", async (req, res) => {
    try {
      const { customerId } = req.query;
      const notices = await storage.getLegalNoticesSent(req.tenantId!, customerId as string | undefined);
      res.json(notices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send Legal Notice (Email/WhatsApp)
  app.post("/api/recovery/legal-notices/send", async (req, res) => {
    try {
      // Validate request body
      const sendSchema = z.object({
        customerId: z.string().min(1, "Customer ID is required"),
        templateId: z.string().min(1, "Template ID is required"),
        invoiceId: z.string().optional(),
        sentVia: z.enum(["email", "whatsapp", "both"]),
      });

      const result = sendSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.flatten() });
      }

      const { customerId, templateId, invoiceId, sentVia } = result.data;

      // Get customer
      const customer = await storage.getMasterCustomer(req.tenantId!, customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Check if customer is Delta category
      if (customer.category !== "Delta") {
        return res.status(400).json({ message: "Legal notices can only be sent to Delta category customers" });
      }

      // Get template
      const template = await storage.getLegalNoticeTemplate(req.tenantId!, templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Get invoice if provided
      let invoice = null;
      if (invoiceId) {
        invoice = await storage.getInvoice(req.tenantId!, invoiceId);
      }

      // Get company profile
      const profile = await storage.getCompanyProfile(req.tenantId!);

      // Replace template variables
      const variables: Record<string, string> = {
        customerName: customer.clientName,
        companyName: profile?.legalName || "Company",
        invoiceNumber: invoice?.invoiceNumber || "N/A",
        invoiceDate: invoice ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : "N/A",
        amount: invoice ? `₹${parseFloat(invoice.invoiceAmount.toString()).toLocaleString('en-IN')}` : "N/A",
        dueDate: invoice ? (() => {
          const invDate = new Date(invoice.invoiceDate);
          const terms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
          const due = new Date(invDate);
          due.setDate(due.getDate() + terms);
          return due.toLocaleDateString('en-IN');
        })() : "N/A",
        overduedays: invoice ? (() => {
          const invDate = new Date(invoice.invoiceDate);
          const terms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
          const due = new Date(invDate);
          due.setDate(due.getDate() + terms);
          const today = new Date();
          const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          return days > 0 ? days.toString() : "0";
        })() : "0",
      };

      let subject = template.subject;
      let body = template.body;

      // Replace all variables in subject and body
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'gi');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      }

      // Send via email if requested
      if (sentVia === "email" || sentVia === "both") {
        if (!customer.primaryEmail) {
          return res.status(400).json({ message: "Customer email not found" });
        }

        const emailConfig = await storage.getEmailConfig(req.tenantId!);
        if (!emailConfig || emailConfig.isActive !== "Active") {
          return res.status(400).json({ message: "Email configuration is not active. Please configure email in settings." });
        }

        // Send email using existing sendEmail function from earlier in routes
        await sendEmail(emailConfig, customer.primaryEmail, subject, body);
      }

      // Send via WhatsApp if requested
      let whatsappLink = null;
      if (sentVia === "whatsapp" || sentVia === "both") {
        const mobile = customer.primaryMobile;
        if (!mobile) {
          return res.status(400).json({ message: "Customer mobile number not found" });
        }

        // Format phone number for WhatsApp
        let phoneNumber = mobile.replace(/\D/g, "");
        if (!phoneNumber.startsWith("91") && phoneNumber.length === 10) {
          phoneNumber = "91" + phoneNumber;
        }

        // Create wa.me link with message
        const encodedMessage = encodeURIComponent(`${subject}\n\n${body}`);
        whatsappLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      }

      // Log the sent notice
      await storage.createLegalNoticeSent(req.tenantId!, {
        templateId,
        customerId,
        customerName: customer.clientName,
        invoiceId: invoice?.id,
        invoiceNumber: invoice?.invoiceNumber,
        sentVia,
        recipientEmail: customer.primaryEmail || undefined,
        recipientMobile: customer.primaryMobile || undefined,
        subject,
        body,
        sentBy: (req as any).user?.id || "unknown",
      });

      res.json({ 
        message: "Legal notice sent successfully",
        whatsappLink,
        subject,
        body
      });
    } catch (error: any) {
      console.error("Failed to send legal notice:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PAYMENT ANALYTICS ROUTES ====================
  
  // Get Payment Patterns Dashboard (4 segments)
  app.get("/api/payment-analytics/dashboard", async (req, res) => {
    try {
      const patterns = await storage.getPaymentPatterns(req.tenantId!);
      const allInvoices = await storage.getInvoices(req.tenantId!);
      const allReceipts = await storage.getReceipts(req.tenantId!);
      const allCustomers = await storage.getMasterCustomers(req.tenantId!);

      // Segment customers by classification
      const segments = {
        star: { count: 0, totalOutstanding: 0, customers: [] as any[] },
        regular: { count: 0, totalOutstanding: 0, customers: [] as any[] },
        risky: { count: 0, totalOutstanding: 0, customers: [] as any[] },
        critical: { count: 0, totalOutstanding: 0, customers: [] as any[] },
      };

      // Calculate outstanding for each customer with pattern
      for (const pattern of patterns) {
        const customer = allCustomers.find(c => c.id === pattern.customerId);
        if (!customer) continue;

        const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
        const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);

        const openingBalance = customer.openingBalance ? parseFloat(customer.openingBalance.toString()) : 0;
        const totalInvoices = customerInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
        const totalReceipts = customerReceipts.reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
        const outstanding = openingBalance + totalInvoices - totalReceipts;

        const customerData = {
          customerId: customer.id,
          customerName: customer.clientName,
          category: customer.category,
          outstanding: outstanding.toFixed(2),
          paymentScore: pattern.paymentScore,
          onTimeRate: pattern.totalInvoices > 0 ? ((pattern.onTimeCount / pattern.totalInvoices) * 100).toFixed(1) : "0",
          avgDelayDays: parseFloat(pattern.avgDelayDays),
        };

        const classification = pattern.paymentClassification.toLowerCase();
        if (classification === "star") {
          segments.star.count++;
          segments.star.totalOutstanding += outstanding;
          segments.star.customers.push(customerData);
        } else if (classification === "regular") {
          segments.regular.count++;
          segments.regular.totalOutstanding += outstanding;
          segments.regular.customers.push(customerData);
        } else if (classification === "risky") {
          segments.risky.count++;
          segments.risky.totalOutstanding += outstanding;
          segments.risky.customers.push(customerData);
        } else if (classification === "critical") {
          segments.critical.count++;
          segments.critical.totalOutstanding += outstanding;
          segments.critical.customers.push(customerData);
        }
      }

      // Category-wise breakdown
      const categoryBreakdown = {
        alpha: { star: 0, regular: 0, risky: 0, critical: 0 },
        beta: { star: 0, regular: 0, risky: 0, critical: 0 },
        gamma: { star: 0, regular: 0, risky: 0, critical: 0 },
        delta: { star: 0, regular: 0, risky: 0, critical: 0 },
      };

      for (const pattern of patterns) {
        const customer = allCustomers.find(c => c.id === pattern.customerId);
        if (!customer) continue;

        const category = customer.category.toLowerCase();
        const classification = pattern.paymentClassification.toLowerCase();
        
        if (categoryBreakdown[category as keyof typeof categoryBreakdown]) {
          categoryBreakdown[category as keyof typeof categoryBreakdown][classification as keyof typeof categoryBreakdown.alpha]++;
        }
      }

      // Convert segments object to array format for frontend
      const segmentsArray = [
        {
          classification: "Star",
          customerCount: segments.star.count,
          totalOutstanding: parseFloat(segments.star.totalOutstanding.toFixed(2)),
          avgPaymentScore: segments.star.count > 0 
            ? segments.star.customers.reduce((sum, c) => sum + c.paymentScore, 0) / segments.star.count 
            : 0,
        },
        {
          classification: "Regular",
          customerCount: segments.regular.count,
          totalOutstanding: parseFloat(segments.regular.totalOutstanding.toFixed(2)),
          avgPaymentScore: segments.regular.count > 0 
            ? segments.regular.customers.reduce((sum, c) => sum + c.paymentScore, 0) / segments.regular.count 
            : 0,
        },
        {
          classification: "Risky",
          customerCount: segments.risky.count,
          totalOutstanding: parseFloat(segments.risky.totalOutstanding.toFixed(2)),
          avgPaymentScore: segments.risky.count > 0 
            ? segments.risky.customers.reduce((sum, c) => sum + c.paymentScore, 0) / segments.risky.count 
            : 0,
        },
        {
          classification: "Critical",
          customerCount: segments.critical.count,
          totalOutstanding: parseFloat(segments.critical.totalOutstanding.toFixed(2)),
          avgPaymentScore: segments.critical.count > 0 
            ? segments.critical.customers.reduce((sum, c) => sum + c.paymentScore, 0) / segments.critical.count 
            : 0,
        },
      ];

      // Calculate summary statistics
      const totalOutstanding = segments.star.totalOutstanding + segments.regular.totalOutstanding + segments.risky.totalOutstanding + segments.critical.totalOutstanding;
      const totalCustomers = patterns.length;
      const avgOnTimeRate = totalCustomers > 0
        ? patterns.reduce((sum, p) => sum + (p.totalInvoices > 0 ? (p.onTimeCount / p.totalInvoices) * 100 : 0), 0) / totalCustomers
        : 0;
      const avgPaymentScore = totalCustomers > 0
        ? patterns.reduce((sum, p) => sum + p.paymentScore, 0) / totalCustomers
        : 0;

      res.json({
        segments: segmentsArray,
        summary: {
          totalCustomers,
          avgOnTimeRate,
          totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
          avgPaymentScore,
        },
        categoryBreakdown,
      });
    } catch (error: any) {
      console.error("Failed to get payment analytics dashboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Customer Payment Scorecard
  app.get("/api/payment-analytics/customer/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
      const pattern = await storage.getPaymentPattern(req.tenantId!, customerId);
      
      if (!pattern) {
        return res.status(404).json({ message: "Payment pattern not found for this customer" });
      }

      const customer = await storage.getMasterCustomer(req.tenantId!, customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get invoice and receipt history
      const allInvoices = await storage.getInvoices(req.tenantId!);
      const allReceipts = await storage.getReceipts(req.tenantId!);
      const customerInvoices = allInvoices.filter(inv => inv.customerName === customer.clientName);
      const customerReceipts = allReceipts.filter(rec => rec.customerName === customer.clientName);

      // Get category change history
      const categoryChanges = await storage.getCategoryChangeLogs(req.tenantId!);
      const customerCategoryHistory = categoryChanges.filter(log => log.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Build payment timeline
      const timeline: any[] = [];
      
      // Add invoices and receipts to timeline
      customerInvoices.forEach(inv => {
        timeline.push({
          type: 'invoice',
          date: inv.invoiceDate,
          invoiceNumber: inv.invoiceNumber,
          amount: parseFloat(inv.invoiceAmount.toString()),
          status: inv.status,
        });
      });

      customerReceipts.forEach(rec => {
        timeline.push({
          type: 'receipt',
          date: rec.date,
          voucherNumber: rec.voucherNumber,
          amount: parseFloat(rec.amount.toString()),
          mode: rec.modeOfPayment,
        });
      });

      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const onTimeRate = pattern.totalInvoices > 0 ? (pattern.onTimeCount / pattern.totalInvoices) * 100 : 0;

      res.json({
        pattern: {
          ...pattern,
          onTimeRate: onTimeRate.toFixed(1),
        },
        customer: {
          id: customer.id,
          name: customer.clientName,
          category: customer.category,
          creditLimit: customer.creditLimit,
          primaryMobile: customer.primaryMobile,
          primaryEmail: customer.primaryEmail,
        },
        timeline: timeline.slice(0, 50), // Limit to 50 most recent
        categoryHistory: customerCategoryHistory.slice(0, 20), // Limit to 20 most recent
      });
    } catch (error: any) {
      console.error("Failed to get customer payment scorecard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Reliable Customers Report
  app.get("/api/payment-analytics/reliable-customers", async (req, res) => {
    try {
      const reliableCustomers = await storage.getReliableCustomers(req.tenantId!);
      res.json(reliableCustomers);
    } catch (error: any) {
      console.error("Failed to get reliable customers:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Recalculate Payment Patterns
  app.post("/api/payment-analytics/recalculate", async (req, res) => {
    try {
      const result = await storage.calculatePaymentPatterns(req.tenantId!);
      res.json(result);
    } catch (error: any) {
      console.error("Failed to recalculate payment patterns:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== BACKUP & RESTORE ROUTES ====================
  
  // Get Backup History (Tenant Level)
  app.get("/api/backup/history", tenantMiddleware, async (req, res) => {
    try {
      const history = await storage.getBackupHistory(req.tenantId!);
      res.json(history);
    } catch (error: any) {
      console.error("Failed to get backup history:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create Backup (Export all tenant data to JSON) - Tenant Level
  app.post("/api/backup/create", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user?.id || "unknown";
      const userName = (req as any).user?.name || "Unknown User";
      
      // Fetch all tenant data
      const tenantData = await storage.getAllTenantData(req.tenantId!);
      
      // Calculate total records
      let totalRecords = 0;
      for (const key in tenantData) {
        if (Array.isArray(tenantData[key])) {
          totalRecords += tenantData[key].length;
        }
      }

      // Create backup object with metadata
      const backupData = {
        metadata: {
          version: "1.0",
          tenantId: req.tenantId,
          createdAt: new Date().toISOString(),
          createdBy: userName,
          totalRecords,
        },
        data: tenantData,
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(backupData, null, 2);
      const fileSize = Buffer.byteLength(jsonString, 'utf8');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `backup_${req.tenantId}_${timestamp}.json`;

      // Log backup in history
      await storage.createBackupHistory(req.tenantId!, {
        operationType: "backup",
        fileName,
        fileSize,
        status: "success",
        recordsCount: totalRecords,
        performedBy: userId,
        performedByName: userName,
      });

      // Return JSON data to client for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(jsonString);
    } catch (error: any) {
      console.error("Failed to create backup:", error);
      
      // Log failed backup attempt
      try {
        const userId = (req as any).user?.id || "unknown";
        const userName = (req as any).user?.name || "Unknown User";
        await storage.createBackupHistory(req.tenantId!, {
          operationType: "backup",
          fileName: "failed_backup.json",
          status: "failed",
          errorMessage: error.message,
          performedBy: userId,
          performedByName: userName,
        });
      } catch (logError) {
        console.error("Failed to log backup error:", logError);
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Restore Backup (Import data from JSON) - Tenant Level with Isolation
  app.post("/api/backup/restore", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user?.id || "unknown";
      const userName = (req as any).user?.name || "Unknown User";
      const { backupData, restoreOptions } = req.body;

      if (!backupData || !backupData.metadata || !backupData.data) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      // Validate backup is for this tenant
      if (backupData.metadata.tenantId !== req.tenantId) {
        return res.status(400).json({ 
          message: "Backup file is from a different tenant. Cannot restore." 
        });
      }

      const fileName = `restore_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.json`;
      let restoredCount = 0;
      const errors: string[] = [];

      // Begin restore process
      const data = backupData.data;
      const options = restoreOptions || { 
        customers: true,
        invoices: true,
        receipts: true,
        leads: true,
        quotations: true,
        proformaInvoices: true,
        settings: true,
        templates: true,
        users: true,
        roles: true,
      };

      // Restore data tables based on options
      try {
        // Note: This is a basic restore. In production, you'd want to handle:
        // - Foreign key constraints
        // - Duplicate detection
        // - Partial restores
        // - Data validation
        
        // For now, we'll just send back a success message
        // Full implementation would involve complex database transactions
        
        res.json({ 
          message: "Restore functionality is being implemented. Preview shows data structure is valid.",
          preview: {
            totalRecords: backupData.metadata.totalRecords,
            createdAt: backupData.metadata.createdAt,
            createdBy: backupData.metadata.createdBy,
            tables: Object.keys(data).map(key => ({
              name: key,
              records: Array.isArray(data[key]) ? data[key].length : 0
            }))
          }
        });

        // Log restore attempt
        await storage.createBackupHistory(req.tenantId!, {
          operationType: "restore",
          fileName,
          fileSize: JSON.stringify(backupData).length,
          status: "success",
          recordsCount: backupData.metadata.totalRecords,
          performedBy: userId,
          performedByName: userName,
        });

      } catch (restoreError: any) {
        console.error("Restore failed:", restoreError);
        errors.push(restoreError.message);
        
        // Log failed restore
        await storage.createBackupHistory(req.tenantId!, {
          operationType: "restore",
          fileName,
          status: "failed",
          errorMessage: restoreError.message,
          performedBy: userId,
          performedByName: userName,
        });

        return res.status(500).json({ 
          message: "Restore failed", 
          errors 
        });
      }

    } catch (error: any) {
      console.error("Failed to restore backup:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================
  // Voice Assistant Routes
  // ============================================

  // Delete chat history for current user
  app.delete("/api/assistant/history", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req.session as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await db
        .delete(assistantChatHistory)
        .where(
          and(
            eq(assistantChatHistory.tenantId, req.tenantId!),
            eq(assistantChatHistory.userId, userId)
          )
        );

      res.json({ success: true, message: "History cleared successfully" });
    } catch (error: any) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  // Get chat history for current user
  app.get("/api/assistant/history", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req.session as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const history = await db
        .select()
        .from(assistantChatHistory)
        .where(
          and(
            eq(assistantChatHistory.tenantId, req.tenantId!),
            eq(assistantChatHistory.userId, userId)
          )
        )
        .orderBy(assistantChatHistory.createdAt)
        .limit(50);

      res.json(history);
    } catch (error: any) {
      console.error("Failed to fetch chat history:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Process voice/text command
  app.post("/api/assistant/command", tenantMiddleware, async (req, res) => {
    const startTime = Date.now(); // Track response time
    try {
      const userId = (req.session as any).user?.id;
      const userName = (req.session as any).user?.name;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { message, isVoice, context, previousCommands = [] } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const normalizedMessage = message.toLowerCase().trim();
      let response = "";
      let commandType: "query" | "action" | "info" = "info";
      let actionPerformed: string | null = null;
      let resultData: any = null;
      
      // Contextual understanding: Use context and previous commands for better responses
      const pageContext = context || "";
      const recentCommands = Array.isArray(previousCommands) ? previousCommands : [];

      // ============================================
      // Smart Command Parsing Utilities
      // ============================================
      
      // Parse numbers from text (e.g., "fifty thousand" -> 50000)
      const parseNumberFromText = (text: string): number | null => {
        const wordNumbers: Record<string, number> = {
          // Basic digits
          'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
          // Teens
          'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
          'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
          // Tens
          'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
          'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
          // Multipliers
          'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000, 
          'million': 1000000, 'crore': 10000000, 'karod': 10000000,
          // Hindi numbers
          'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'panch': 5,
          'chhe': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
          'sau': 100, 'hazaar': 1000
        };

        // Normalize: remove hyphens, commas, extra spaces, handle plurals
        const normalized = text.toLowerCase()
          .replace(/-/g, ' ')
          .replace(/,/g, '')
          .replace(/lakhs?/g, 'lakh')
          .replace(/crores?/g, 'crore')
          .replace(/thousands?/g, 'thousand')
          .replace(/millions?/g, 'million')
          .replace(/billions?/g, 'billion')
          .replace(/\s+/g, ' ')
          .trim();

        // Handle direct numbers with comprehensive suffix support
        // Order matters: longer patterns first to avoid partial matches
        const directMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(crore|karod|million|billion|thousand|hundred|lakh|lac|cr|mn|bn|[kKlL])?$/);
        if (directMatch) {
          let num = parseFloat(directMatch[1]);
          const suffix = directMatch[2]?.toLowerCase();
          
          // Map suffixes to multipliers
          const multipliers: Record<string, number> = {
            'k': 1000,
            'l': 100000,
            'lakh': 100000,
            'lac': 100000,
            'cr': 10000000,
            'crore': 10000000,
            'karod': 10000000,
            'mn': 1000000,
            'million': 1000000,
            'bn': 1000000000,
            'billion': 1000000000,
            'thousand': 1000,
            'hundred': 100
          };
          
          if (suffix && multipliers[suffix]) {
            num *= multipliers[suffix];
          }
          return num;
        }

        // Handle word numbers
        const words = normalized.split(/\s+/);
        let total = 0;
        let current = 0;
        let foundNumber = false;

        for (const word of words) {
          const num = wordNumbers[word];
          if (num !== undefined) {
            foundNumber = true;
            if (num >= 100) {
              // Multiplier
              current = current || 1;
              current *= num;
              if (num >= 1000) {
                total += current;
                current = 0;
              }
            } else {
              // Regular number (including zero)
              current += num;
            }
          }
        }
        total += current;
        
        // Return total if we found any number word (including zero)
        // or null if no number words were found
        return foundNumber ? total : null;
      };

      // Parse dates from text (e.g., "last week", "yesterday", "7 days ago")
      const parseDateFromText = (text: string): { startDate: Date; endDate: Date } | null => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (text.includes('today') || text.includes('aaj')) {
          return { startDate: today, endDate: today };
        }
        
        if (text.includes('yesterday') || text.includes('kal')) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return { startDate: yesterday, endDate: yesterday };
        }
        
        if (text.includes('last week') || text.includes('pichle hafte')) {
          const lastWeekStart = new Date(today);
          lastWeekStart.setDate(lastWeekStart.getDate() - 7);
          return { startDate: lastWeekStart, endDate: today };
        }
        
        if (text.includes('last month') || text.includes('pichle mahine')) {
          const lastMonthStart = new Date(today);
          lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
          return { startDate: lastMonthStart, endDate: today };
        }
        
        // Handle "last X days"
        const daysMatch = text.match(/last\s+(\d+)\s+days?|(\d+)\s+din/i);
        if (daysMatch) {
          const days = parseInt(daysMatch[1] || daysMatch[2]);
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() - days);
          return { startDate, endDate: today };
        }
        
        return null;
      };

      // Parse amount with currency symbols
      const parseAmount = (text: string): number | null => {
        // Remove currency symbols
        const cleaned = text.replace(/[₹$,]/g, '');
        return parseNumberFromText(cleaned);
      };

      // ============================================
      // Contextual Understanding & Auto-Suggestions
      // ============================================
      
      // Multi-Turn Dialogue: Check if user is responding to a previous clarifying question
      let lastAssistantMessage = "";
      if (recentCommands.length > 0) {
        // Get the last assistant response from chat history
        const recentHistory = await db
          .select()
          .from(assistantChatHistory)
          .where(
            and(
              eq(assistantChatHistory.tenantId, req.tenantId!),
              eq(assistantChatHistory.userId, userId)
            )
          )
          .orderBy(desc(assistantChatHistory.createdAt))
          .limit(1);
        
        if (recentHistory.length > 0) {
          lastAssistantMessage = recentHistory[0].assistantResponse.toLowerCase();
        }
      }
      
      // ============================================
      // SMART CONTEXT MAPPING
      // Map follow-up responses to actual commands based on last clarification
      // ============================================
      if (lastAssistantMessage) {
        // Dashboard Context - Map user's short responses to full commands
        if (lastAssistantMessage.includes("dashboard ke baare me kya")) {
          // Revenue-related responses
          if (normalizedMessage.match(/\b(revenue|total revenue|kitna revenue|earning)\b/i)) {
            // Will be handled by existing revenue/financial stats logic below
          }
          // Collection responses
          else if (normalizedMessage.match(/\b(collection|today collection|aaj ka collection)\b/i)) {
            // Force it to match "today's collection" pattern
          }
          // Due invoices responses
          else if (normalizedMessage.match(/\b(due|pending|due invoices|pending invoices|baki)\b/i)) {
            // Will match existing due invoices logic
          }
          // Outstanding balance
          else if (normalizedMessage.match(/\b(outstanding|balance|bacha hua|total outstanding)\b/i)) {
            // Will match existing outstanding logic
          }
          // Total customers
          else if (normalizedMessage.match(/\b(total customers|kitne customer|customers)\b/i)) {
            // Will match customer count logic
          }
        }
        
        // Customers Context - Map short responses
        if (lastAssistantMessage.includes("customers ke baare me")) {
          // Category responses
          if (normalizedMessage.match(/\b(alpha|alpha category|alpha wale)\b/i)) {
            // Will be caught by alpha category logic
          }
          else if (normalizedMessage.match(/\b(beta|beta category|beta wale)\b/i)) {
            // Will be caught by beta category logic
          }
          else if (normalizedMessage.match(/\b(gamma|gamma category|gamma wale)\b/i)) {
            // Will be caught by gamma category logic
          }
          else if (normalizedMessage.match(/\b(delta|delta category|delta wale)\b/i)) {
            // Will be caught by delta category logic
          }
          // Top debtors responses
          else if (normalizedMessage.match(/\b(top 10|top debtors|highest|sabse zyada)\b/i)) {
            // Will be caught by top debtors logic
          }
          // Total customers
          else if (normalizedMessage.match(/\b(total|kitne|count)\b/i)) {
            // Will be caught by total customers logic
          }
        }
        
        // Invoices Context - Map short responses
        if (lastAssistantMessage.includes("invoices ke baare me")) {
          // Status-based responses
          if (normalizedMessage.match(/\b(due|pending|baki)\b/i)) {
            // Will be caught by due invoices logic
          }
          else if (normalizedMessage.match(/\b(paid|complete|ho gaye)\b/i)) {
            // Will be caught by paid invoices logic
          }
          else if (normalizedMessage.match(/\b(overdue|late|delay)\b/i)) {
            // Will be caught by overdue logic
          }
          // Time-based responses
          else if (normalizedMessage.match(/\b(today|aaj|today's)\b/i)) {
            // Will be caught by today's invoices logic
          }
          else if (normalizedMessage.match(/\b(week|is hafte)\b/i)) {
            // Will be caught by this week logic
          }
        }
        
        // Debtors Context - Map short responses
        if (lastAssistantMessage.includes("debtors ke baare me")) {
          // Top debtors
          if (normalizedMessage.match(/\b(top 10|top 20|highest|sabse zyada)\b/i)) {
            // Will be caught by top debtors logic
          }
          // Category-based
          else if (normalizedMessage.match(/\b(alpha|beta|gamma|delta)\b/i)) {
            // Will be caught by respective category logic
          }
          // Follow-ups
          else if (normalizedMessage.match(/\b(follow.?up|due today|overdue)\b/i)) {
            // Will be caught by follow-up logic
          }
        }
      }
      
      // Handle follow-up queries based on previous commands
      if (recentCommands.length > 0 && 
          (normalizedMessage.includes("show more") || 
           normalizedMessage.includes("details") || 
           normalizedMessage.includes("aur dikha"))) {
        const lastCommand = recentCommands[recentCommands.length - 1].toLowerCase();
        
        // If last command was about customers, expand on that
        if (lastCommand.includes("customer")) {
          response = `💡 Previous command was about customers. You can ask:\n`;
          response += `• "Show customer details for [name]"\n`;
          response += `• "Total customers"\n`;
          response += `• "Alpha category customers"`;
          commandType = "info";
        }
        // If last command was about invoices
        else if (lastCommand.includes("invoice")) {
          response = `💡 Previous command was about invoices. You can ask:\n`;
          response += `• "Due invoices"\n`;
          response += `• "Today's invoices"\n`;
          response += `• "Invoice details for [customer]"`;
          commandType = "info";
        }
      }
      
      // Page-specific context suggestions
      if (normalizedMessage.includes("what can i") || 
          normalizedMessage.includes("help") || 
          normalizedMessage.includes("kya kar sakte")) {
        
        if (pageContext.includes("Dashboard")) {
          response = `📊 **Dashboard Commands:**\n\n`;
          response += `• "Show today's collection"\n`;
          response += `• "Due invoices"\n`;
          response += `• "Total customers"\n`;
          response += `• "Outstanding balance"`;
          commandType = "info";
        } 
        else if (pageContext.includes("Invoices")) {
          response = `📄 **Invoice Commands:**\n\n`;
          response += `• "Due invoices"\n`;
          response += `• "Paid invoices"\n`;
          response += `• "Invoice for [customer name]"\n`;
          response += `• "Today's invoices"`;
          commandType = "info";
        }
        else if (pageContext.includes("Debtors")) {
          response = `💰 **Debtor Commands:**\n\n`;
          response += `• "Alpha category customers"\n`;
          response += `• "Top 10 debtors"\n`;
          response += `• "Customer ledger for [name]"\n`;
          response += `• "Send email to overdue customers"`;
          commandType = "info";
        }
        else if (pageContext.includes("Ledger")) {
          response = `📖 **Ledger Commands:**\n\n`;
          response += `• "Show ledger for [customer name]"\n`;
          response += `• "Customer details"\n`;
          response += `• "Outstanding balance"`;
          commandType = "info";
        }
        else {
          response = `💡 **Popular Commands:**\n\n`;
          response += `• "Show today's collection"\n`;
          response += `• "Due invoices"\n`;
          response += `• "Follow ups"\n`;
          response += `• "Alpha category customers"\n`;
          response += `• "Send email to overdue customers"`;
          commandType = "info";
        }
      }

      // Command Parser - Enhanced keyword matching with smart parsing
      
      // Follow-ups Menu Query - Interactive options
      if (
        (normalizedMessage.includes("follow") && normalizedMessage.includes("up")) &&
        !normalizedMessage.includes("today") &&
        !normalizedMessage.includes("tomorrow") &&
        !normalizedMessage.includes("week") &&
        !normalizedMessage.includes("month") &&
        !normalizedMessage.includes("overdue") &&
        !normalizedMessage.includes("no follow")
      ) {
        commandType = "info";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        
        response = `📋 Aap kaun se follow-ups dekhna chahte hain?\n\n`;
        response += `⏰ Overdue: ${stats.overdue.count} clients - ₹${stats.overdue.totalAmount.toFixed(2)}\n`;
        response += `📅 Today: ${stats.dueToday.count} clients - ₹${stats.dueToday.totalAmount.toFixed(2)}\n`;
        response += `📆 Tomorrow: ${stats.dueTomorrow.count} clients - ₹${stats.dueTomorrow.totalAmount.toFixed(2)}\n`;
        response += `📊 This Week: ${stats.dueThisWeek.count} clients - ₹${stats.dueThisWeek.totalAmount.toFixed(2)}\n`;
        response += `📈 This Month: ${stats.dueThisMonth.count} clients - ₹${stats.dueThisMonth.totalAmount.toFixed(2)}\n`;
        response += `❌ No Follow-up: ${stats.noFollowUp.count} clients - ₹${stats.noFollowUp.totalAmount.toFixed(2)}\n\n`;
        response += `Bolo: "Show today's follow-ups" ya "Aaj ke follow-ups"`;
        
        resultData = stats;
      }
      
      // Today's Follow-ups Query
      else if (
        (normalizedMessage.includes("today") || normalizedMessage.includes("aaj")) &&
        (normalizedMessage.includes("follow") || normalizedMessage.includes("due"))
      ) {
        commandType = "query";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        const todayData = stats.dueToday;
        
        if (todayData.count === 0) {
          response = "✅ Aaj koi follow-up due nahi hai!";
        } else {
          response = `📅 Aaj ${todayData.count} follow-ups due hain\n`;
          response += `💰 Total Outstanding: ₹${todayData.totalAmount.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          todayData.customers.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (todayData.count > 10) {
            response += `\n...and ${todayData.count - 10} more`;
          }
        }
        
        resultData = todayData.customers;
      }
      
      // Tomorrow's Follow-ups Query
      else if (
        (normalizedMessage.includes("tomorrow") || normalizedMessage.includes("kal")) &&
        (normalizedMessage.includes("follow") || normalizedMessage.includes("due"))
      ) {
        commandType = "query";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        const tomorrowData = stats.dueTomorrow;
        
        if (tomorrowData.count === 0) {
          response = "✅ Kal koi follow-up due nahi hai!";
        } else {
          response = `📆 Kal ${tomorrowData.count} follow-ups due hain\n`;
          response += `💰 Total Outstanding: ₹${tomorrowData.totalAmount.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          tomorrowData.customers.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (tomorrowData.count > 10) {
            response += `\n...and ${tomorrowData.count - 10} more`;
          }
        }
        
        resultData = tomorrowData.customers;
      }
      
      // This Week's Follow-ups Query
      else if (
        normalizedMessage.includes("week") &&
        (normalizedMessage.includes("follow") || normalizedMessage.includes("due"))
      ) {
        commandType = "query";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        const weekData = stats.dueThisWeek;
        
        if (weekData.count === 0) {
          response = "✅ Is hafte koi follow-up due nahi hai!";
        } else {
          response = `📊 Is hafte ${weekData.count} follow-ups due hain\n`;
          response += `💰 Total Outstanding: ₹${weekData.totalAmount.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          weekData.customers.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (weekData.count > 10) {
            response += `\n...and ${weekData.count - 10} more`;
          }
        }
        
        resultData = weekData.customers;
      }
      
      // This Month's Follow-ups Query
      else if (
        normalizedMessage.includes("month") &&
        (normalizedMessage.includes("follow") || normalizedMessage.includes("due"))
      ) {
        commandType = "query";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        const monthData = stats.dueThisMonth;
        
        if (monthData.count === 0) {
          response = "✅ Is mahine koi follow-up due nahi hai!";
        } else {
          response = `📈 Is mahine ${monthData.count} follow-ups due hain\n`;
          response += `💰 Total Outstanding: ₹${monthData.totalAmount.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          monthData.customers.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (monthData.count > 10) {
            response += `\n...and ${monthData.count - 10} more`;
          }
        }
        
        resultData = monthData.customers;
      }
      
      // Overdue Follow-ups Query
      else if (
        normalizedMessage.includes("overdue") &&
        (normalizedMessage.includes("follow") || normalizedMessage.includes("late"))
      ) {
        commandType = "query";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        const overdueData = stats.overdue;
        
        if (overdueData.count === 0) {
          response = "✅ Koi overdue follow-up nahi hai!";
        } else {
          response = `⏰ ${overdueData.count} follow-ups overdue hain\n`;
          response += `💰 Total Outstanding: ₹${overdueData.totalAmount.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          overdueData.customers.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (overdueData.count > 10) {
            response += `\n...and ${overdueData.count - 10} more`;
          }
        }
        
        resultData = overdueData.customers;
      }
      
      // No Follow-up Customers Query
      else if (
        normalizedMessage.includes("no follow") ||
        (normalizedMessage.includes("without") && normalizedMessage.includes("follow"))
      ) {
        commandType = "query";
        
        const stats = await storage.getDebtorsFollowUpStats(req.tenantId!);
        const noFollowUpData = stats.noFollowUp;
        
        if (noFollowUpData.count === 0) {
          response = "✅ Sabhi customers ke follow-ups bane hain!";
        } else {
          response = `❌ ${noFollowUpData.count} customers ke follow-ups nahi bane\n`;
          response += `💰 Total Outstanding: ₹${noFollowUpData.totalAmount.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          noFollowUpData.customers.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (noFollowUpData.count > 10) {
            response += `\n...and ${noFollowUpData.count - 10} more`;
          }
        }
        
        resultData = noFollowUpData.customers;
      }
      
      // Category-wise Outstanding Query
      else if (
        (normalizedMessage.includes("outstanding") && normalizedMessage.includes("kitna")) ||
        (normalizedMessage.includes("category") && normalizedMessage.includes("wise")) ||
        normalizedMessage.includes("balance")
      ) {
        commandType = "query";
        
        const debtorsData = await storage.getDebtorsList(req.tenantId!);
        const categoryWise = debtorsData.categoryWise;
        
        response = `📊 Category-wise Outstanding:\n\n`;
        response += `🟢 Alpha: ${categoryWise.Alpha.count} clients - ₹${categoryWise.Alpha.totalBalance.toFixed(2)}\n`;
        response += `🔵 Beta: ${categoryWise.Beta.count} clients - ₹${categoryWise.Beta.totalBalance.toFixed(2)}\n`;
        response += `🟡 Gamma: ${categoryWise.Gamma.count} clients - ₹${categoryWise.Gamma.totalBalance.toFixed(2)}\n`;
        response += `🔴 Delta: ${categoryWise.Delta.count} clients - ₹${categoryWise.Delta.totalBalance.toFixed(2)}\n\n`;
        
        const totalClients = categoryWise.Alpha.count + categoryWise.Beta.count + categoryWise.Gamma.count + categoryWise.Delta.count;
        const totalBalance = categoryWise.Alpha.totalBalance + categoryWise.Beta.totalBalance + categoryWise.Gamma.totalBalance + categoryWise.Delta.totalBalance;
        response += `Total: ${totalClients} clients - ₹${totalBalance.toFixed(2)}`;
        
        resultData = categoryWise;
      }
      
      // Alpha Category Query
      else if (
        normalizedMessage.includes("alpha") &&
        (normalizedMessage.includes("outstanding") || normalizedMessage.includes("data") || normalizedMessage.includes("customers"))
      ) {
        commandType = "query";
        
        const debtorsData = await storage.getDebtorsList(req.tenantId!);
        const alphaData = debtorsData.categoryWise.Alpha;
        
        if (alphaData.count === 0) {
          response = "No Alpha category customers found.";
        } else {
          response = `🟢 Alpha Category:\n`;
          response += `Total Clients: ${alphaData.count}\n`;
          response += `💰 Total Outstanding: ₹${alphaData.totalBalance.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          alphaData.debtors.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (alphaData.count > 10) {
            response += `\n...and ${alphaData.count - 10} more`;
          }
        }
        
        resultData = alphaData.debtors;
      }
      
      // Beta Category Query
      else if (
        normalizedMessage.includes("beta") &&
        (normalizedMessage.includes("outstanding") || normalizedMessage.includes("data") || normalizedMessage.includes("customers"))
      ) {
        commandType = "query";
        
        const debtorsData = await storage.getDebtorsList(req.tenantId!);
        const betaData = debtorsData.categoryWise.Beta;
        
        if (betaData.count === 0) {
          response = "No Beta category customers found.";
        } else {
          response = `🔵 Beta Category:\n`;
          response += `Total Clients: ${betaData.count}\n`;
          response += `💰 Total Outstanding: ₹${betaData.totalBalance.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          betaData.debtors.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (betaData.count > 10) {
            response += `\n...and ${betaData.count - 10} more`;
          }
        }
        
        resultData = betaData.debtors;
      }
      
      // Gamma Category Query
      else if (
        normalizedMessage.includes("gamma") &&
        (normalizedMessage.includes("outstanding") || normalizedMessage.includes("data") || normalizedMessage.includes("customers"))
      ) {
        commandType = "query";
        
        const debtorsData = await storage.getDebtorsList(req.tenantId!);
        const gammaData = debtorsData.categoryWise.Gamma;
        
        if (gammaData.count === 0) {
          response = "No Gamma category customers found.";
        } else {
          response = `🟡 Gamma Category:\n`;
          response += `Total Clients: ${gammaData.count}\n`;
          response += `💰 Total Outstanding: ₹${gammaData.totalBalance.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          gammaData.debtors.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (gammaData.count > 10) {
            response += `\n...and ${gammaData.count - 10} more`;
          }
        }
        
        resultData = gammaData.debtors;
      }
      
      // Delta Category Query
      else if (
        normalizedMessage.includes("delta") &&
        (normalizedMessage.includes("outstanding") || normalizedMessage.includes("data") || normalizedMessage.includes("customers"))
      ) {
        commandType = "query";
        
        const debtorsData = await storage.getDebtorsList(req.tenantId!);
        const deltaData = debtorsData.categoryWise.Delta;
        
        if (deltaData.count === 0) {
          response = "No Delta category customers found.";
        } else {
          response = `🔴 Delta Category:\n`;
          response += `Total Clients: ${deltaData.count}\n`;
          response += `💰 Total Outstanding: ₹${deltaData.totalBalance.toFixed(2)}\n\n`;
          response += `📋 Customer List:\n`;
          
          deltaData.debtors.slice(0, 10).forEach((c: any, idx: number) => {
            response += `${idx + 1}. ${c.name} - ₹${c.balance.toFixed(2)}`;
            if (c.mobile) response += ` - ${c.mobile}`;
            response += `\n`;
          });
          
          if (deltaData.count > 10) {
            response += `\n...and ${deltaData.count - 10} more`;
          }
        }
        
        resultData = deltaData.debtors;
      }
      
      // Due Invoices Query - Enhanced with Hindi/mixed language
      else if (
        normalizedMessage.includes("due invoice") ||
        normalizedMessage.includes("pending invoice") ||
        normalizedMessage.includes("unpaid") ||
        normalizedMessage.includes("bacha hua") ||
        normalizedMessage.includes("baki") ||
        normalizedMessage.match(/\b(due|pending|baki|bacha)\b/i)
      ) {
        commandType = "query";
        
        const dueInvoices = await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            customerName: invoices.customerName,
            invoiceAmount: invoices.invoiceAmount,
            invoiceDate: invoices.invoiceDate,
            status: invoices.status,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.tenantId, req.tenantId!),
              sql`${invoices.status} != 'Paid'`
            )
          )
          .orderBy(desc(invoices.invoiceDate))
          .limit(10);

        const count = dueInvoices.length;
        const totalDue = dueInvoices.reduce(
          (sum, inv) => sum + parseFloat(inv.invoiceAmount.toString()),
          0
        );

        response = `Found ${count} due invoices totaling ₹${totalDue.toFixed(
          2
        )}. Here are the details:\n\n`;
        
        dueInvoices.forEach((inv, idx) => {
          const amount = parseFloat(inv.invoiceAmount.toString());
          response += `${idx + 1}. ${inv.customerName} - ${
            inv.invoiceNumber
          } - ₹${amount.toFixed(2)} (${inv.status})\n`;
        });

        resultData = dueInvoices;
      }
      
      // Today's Collection Query - Enhanced with Hindi/informal
      else if (
        normalizedMessage.includes("collection") ||
        normalizedMessage.includes("payment received") ||
        normalizedMessage.includes("aaj ka") ||
        normalizedMessage.includes("aaj kitna") ||
        normalizedMessage.includes("aaj ki collection") ||
        normalizedMessage.includes("total collection") ||
        (normalizedMessage.includes("today") && normalizedMessage.includes("collection"))
      ) {
        commandType = "query";
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysReceipts = await db
          .select({
            amount: receipts.amount,
            customerName: receipts.customerName,
            voucherNumber: receipts.voucherNumber,
          })
          .from(receipts)
          .where(
            and(
              eq(receipts.tenantId, req.tenantId!),
              sql`${receipts.date}::date = ${today.toISOString().split("T")[0]}::date`
            )
          );

        const totalCollection = todaysReceipts.reduce(
          (sum, r) => sum + parseFloat(r.amount.toString()),
          0
        );

        response = `Today's collection: ₹${totalCollection.toFixed(
          2
        )} from ${todaysReceipts.length} payments.\n\n`;
        
        todaysReceipts.forEach((r, idx) => {
          response += `${idx + 1}. ${r.customerName} - ${
            r.voucherNumber
          } - ₹${parseFloat(r.amount.toString()).toFixed(2)}\n`;
        });

        resultData = todaysReceipts;
      }
      
      // Alpha Category Customers - Enhanced with Hindi/informal language
      else if (
        normalizedMessage.includes("alpha customer") ||
        normalizedMessage.includes("alpha category") ||
        normalizedMessage.includes("alpha wale") ||
        normalizedMessage.includes("alpha ke customer") ||
        normalizedMessage === "alpha"
      ) {
        commandType = "query";
        
        const alphaCustomers = await db
          .select({
            id: customers.id,
            name: customers.name,
            category: customers.category,
            amountOwed: customers.amountOwed,
            mobile: customers.mobile,
          })
          .from(customers)
          .where(
            and(
              eq(customers.tenantId, req.tenantId!),
              eq(customers.category, "Alpha")
            )
          )
          .limit(20);

        response = `Found ${alphaCustomers.length} Alpha category customers:\n\n`;
        
        alphaCustomers.forEach((c, idx) => {
          response += `${idx + 1}. ${c.name} - Amount Owed: ₹${parseFloat(
            c.amountOwed?.toString() || "0"
          ).toFixed(2)} - Mobile: ${c.mobile}\n`;
        });

        resultData = alphaCustomers;
      }
      
      // Customer Ledger
      else if (normalizedMessage.includes("ledger")) {
        commandType = "query";
        
        // Try to extract customer name from message
        const customerNameMatch = normalizedMessage.match(
          /ledger.*?([a-z]+\s*[a-z]*)/i
        );
        
        if (customerNameMatch && customerNameMatch[1]) {
          const searchName = customerNameMatch[1].trim();
          
          const customer = await db
            .select()
            .from(customers)
            .where(
              and(
                eq(customers.tenantId, req.tenantId!),
                sql`LOWER(${customers.name}) LIKE ${`%${searchName}%`}`
              )
            )
            .limit(1);

          if (customer.length > 0) {
            response = `Customer ledger for ${customer[0].name}. Please check the Ledger page for detailed transaction history.`;
            resultData = customer[0];
          } else {
            response = `Customer "${searchName}" not found. Please check the spelling and try again.`;
          }
        } else {
          response = "Please specify the customer name. For example: 'Show ledger for ABC Company'";
        }
      }
      
      // Send Email Action - Reminder to overdue customers
      else if (
        (normalizedMessage.includes("send email") || normalizedMessage.includes("email bhejo")) &&
        (normalizedMessage.includes("reminder") || normalizedMessage.includes("overdue") || normalizedMessage.includes("due"))
      ) {
        commandType = "action";
        actionPerformed = "email_reminder_sent";
        
        const overdueInvoices = await db
          .select({
            id: invoices.id,
            customerName: invoices.customerName,
            invoiceNumber: invoices.invoiceNumber,
            invoiceAmount: invoices.invoiceAmount,
            status: invoices.status,
            customerEmail: customers.email,
          })
          .from(invoices)
          .leftJoin(customers, and(
            eq(customers.tenantId, invoices.tenantId),
            eq(customers.name, invoices.customerName)
          ))
          .where(
            and(
              eq(invoices.tenantId, req.tenantId!),
              sql`${invoices.status} != 'Paid'`,
              sql`${customers.email} IS NOT NULL AND ${customers.email} != ''`
            )
          )
          .limit(10);
        
        if (overdueInvoices.length === 0) {
          response = "No overdue invoices found with valid email addresses.";
        } else {
          response = `I would send payment reminders to ${overdueInvoices.length} customers with overdue invoices. However, email sending requires template selection. Please use the Email page or specify a template ID to proceed.`;
          resultData = overdueInvoices;
        }
      }
      
      // Send WhatsApp Action - Reminder to overdue customers
      else if (
        (normalizedMessage.includes("send whatsapp") || normalizedMessage.includes("whatsapp bhejo")) &&
        (normalizedMessage.includes("reminder") || normalizedMessage.includes("overdue") || normalizedMessage.includes("due"))
      ) {
        commandType = "action";
        actionPerformed = "whatsapp_reminder_sent";
        
        const overdueInvoices = await db
          .select({
            id: invoices.id,
            customerName: invoices.customerName,
            invoiceNumber: invoices.invoiceNumber,
            invoiceAmount: invoices.invoiceAmount,
            primaryMobile: customers.mobile,
            status: invoices.status,
          })
          .from(invoices)
          .leftJoin(customers, and(
            eq(customers.tenantId, invoices.tenantId),
            eq(customers.name, invoices.customerName)
          ))
          .where(
            and(
              eq(invoices.tenantId, req.tenantId!),
              sql`${invoices.status} != 'Paid'`,
              sql`${customers.mobile} IS NOT NULL AND ${customers.mobile} != ''`
            )
          )
          .limit(10);
        
        if (overdueInvoices.length === 0) {
          response = "No overdue invoices found with valid mobile numbers.";
        } else {
          response = `I would send WhatsApp payment reminders to ${overdueInvoices.length} customers with overdue invoices. However, WhatsApp sending requires template selection. Please use the WhatsApp page or specify a template ID to proceed.`;
          resultData = overdueInvoices;
        }
      }
      
      // Call Customer Action
      else if (
        normalizedMessage.includes("call") ||
        normalizedMessage.includes("phone kar")
      ) {
        commandType = "action";
        actionPerformed = "call_trigger";
        
        // Extract customer name
        const nameMatch = normalizedMessage.match(/call\s+([a-z\s]+)/i);
        
        if (nameMatch && nameMatch[1]) {
          const searchName = nameMatch[1].trim();
          
          const customer = await db
            .select()
            .from(customers)
            .where(
              and(
                eq(customers.tenantId, req.tenantId!),
                sql`LOWER(${customers.name}) LIKE ${`%${searchName}%`}`
              )
            )
            .limit(1);

          if (customer.length > 0 && customer[0].mobile) {
            response = `I can trigger an AI call to ${customer[0].name} at ${customer[0].mobile}. However, this requires script selection. Please use the Calls page or specify a script ID to proceed.`;
            resultData = customer[0];
          } else {
            response = searchName 
              ? `Customer "${searchName}" not found or has no mobile number.`
              : "Please specify the customer name. For example: 'Call ABC Company'";
          }
        } else {
          response = "Please specify the customer name. For example: 'Call ABC Company'";
        }
      }
      
      // General Email Action
      else if (
        normalizedMessage.includes("send email") ||
        normalizedMessage.includes("email bhejo")
      ) {
        commandType = "action";
        actionPerformed = "email_trigger";
        response = "Email sending feature is available. Please specify the customer and template, or use the Email page to send emails.";
      }
      
      // General WhatsApp Action
      else if (
        normalizedMessage.includes("send whatsapp") ||
        normalizedMessage.includes("whatsapp bhejo")
      ) {
        commandType = "action";
        actionPerformed = "whatsapp_trigger";
        response = "WhatsApp messaging feature is available. Please specify the customer and template, or use the WhatsApp page to send messages.";
      }
      
      // ============================================
      // CONVERSATIONAL NAVIGATION
      // When user says just module name, ask clarifying questions
      // ============================================
      
      // Dashboard Module - Conversational
      else if (
        (normalizedMessage === "dashboard" || 
         normalizedMessage === "show dashboard" ||
         normalizedMessage.match(/^dashboard$/i) ||
         normalizedMessage.match(/^(open|go to|navigate to)\s+dashboard$/i))
      ) {
        commandType = "info";
        response = `📊 **Dashboard ke baare me kya jaanna chahte hain?**\n\n`;
        response += `💡 Aap yeh puch sakte hain:\n\n`;
        response += `📈 **Revenue & Collections:**\n`;
        response += `  • "Show today's collection"\n`;
        response += `  • "Total revenue"\n`;
        response += `  • "Outstanding balance"\n\n`;
        response += `📄 **Invoices:**\n`;
        response += `  • "Due invoices"\n`;
        response += `  • "Paid invoices"\n`;
        response += `  • "Upcoming invoices"\n\n`;
        response += `👥 **Customers:**\n`;
        response += `  • "Total customers"\n`;
        response += `  • "Alpha category customers"\n`;
        response += `  • "Top 10 debtors"\n\n`;
        response += `🔔 **Recent Activity:**\n`;
        response += `  • "Recent payments"\n`;
        response += `  • "Today's follow-ups"`;
      }
      
      // Customers Module - Conversational
      else if (
        (normalizedMessage === "customers" || 
         normalizedMessage === "customer" ||
         normalizedMessage.match(/^(show|list)\s+customers?$/i) ||
         normalizedMessage.match(/^(open|go to)\s+customers?$/i))
      ) {
        commandType = "info";
        response = `👥 **Customers ke baare me kya dekhna hai?**\n\n`;
        response += `💡 Main aapko yeh bata sakta hoon:\n\n`;
        response += `📊 **Summary:**\n`;
        response += `  • "Total customers"\n`;
        response += `  • "Active customers"\n\n`;
        response += `🏷️ **Categories:**\n`;
        response += `  • "Alpha category customers"\n`;
        response += `  • "Beta category customers"\n`;
        response += `  • "Gamma category customers"\n`;
        response += `  • "Delta category customers"\n\n`;
        response += `💰 **Debtors:**\n`;
        response += `  • "Top 10 debtors"\n`;
        response += `  • "Customers with highest balance"\n\n`;
        response += `📖 **Details:**\n`;
        response += `  • "Show ledger for [customer name]"\n`;
        response += `  • "Customer details for [name]"`;
      }
      
      // Invoices Module - Conversational
      else if (
        (normalizedMessage === "invoices" || 
         normalizedMessage === "invoice" ||
         normalizedMessage.match(/^(show|list)\s+invoices?$/i) ||
         normalizedMessage.match(/^(open|go to)\s+invoices?$/i))
      ) {
        commandType = "info";
        response = `📄 **Invoices ke baare me kya jaanna hai?**\n\n`;
        response += `💡 Kripya specify karein:\n\n`;
        response += `📅 **Status:**\n`;
        response += `  • "Due invoices"\n`;
        response += `  • "Paid invoices"\n`;
        response += `  • "Pending invoices"\n`;
        response += `  • "Overdue invoices"\n\n`;
        response += `🗓️ **Time Period:**\n`;
        response += `  • "Today's invoices"\n`;
        response += `  • "This week's invoices"\n`;
        response += `  • "This month's invoices"\n\n`;
        response += `👤 **Customer:**\n`;
        response += `  • "Invoices for [customer name]"\n\n`;
        response += `💵 **Amount:**\n`;
        response += `  • "Invoices above 1 lakh"\n`;
        response += `  • "Invoices above [amount]"`;
      }
      
      // Receipts Module - Conversational
      else if (
        (normalizedMessage === "receipts" || 
         normalizedMessage === "receipt" ||
         normalizedMessage === "payments" ||
         normalizedMessage === "payment" ||
         normalizedMessage.match(/^(show|list)\s+(receipts?|payments?)$/i))
      ) {
        commandType = "info";
        response = `💵 **Receipts/Payments ke baare me kya puchna hai?**\n\n`;
        response += `💡 Aap yeh dekh sakte hain:\n\n`;
        response += `📊 **Collections:**\n`;
        response += `  • "Today's collection"\n`;
        response += `  • "This week's collection"\n`;
        response += `  • "This month's collection"\n\n`;
        response += `👤 **Customer:**\n`;
        response += `  • "Payments from [customer name]"\n`;
        response += `  • "Recent payments"\n\n`;
        response += `💰 **Amount:**\n`;
        response += `  • "Payments above 50000"\n`;
        response += `  • "Large payments"`;
      }
      
      // Debtors/Payment Tracking - Conversational
      else if (
        (normalizedMessage === "debtors" || 
         normalizedMessage === "debtor" ||
         normalizedMessage === "outstanding" ||
         normalizedMessage.match(/^(show|list)\s+debtors?$/i) ||
         normalizedMessage.match(/^payment tracking$/i))
      ) {
        commandType = "info";
        response = `💰 **Debtors ke baare me kya information chahiye?**\n\n`;
        response += `💡 Main yeh bata sakta hoon:\n\n`;
        response += `📊 **Top Debtors:**\n`;
        response += `  • "Top 10 debtors"\n`;
        response += `  • "Top 20 debtors"\n`;
        response += `  • "Highest outstanding customers"\n\n`;
        response += `🏷️ **By Category:**\n`;
        response += `  • "Alpha category customers"\n`;
        response += `  • "Beta category customers"\n`;
        response += `  • "Gamma category customers"\n`;
        response += `  • "Delta category customers"\n\n`;
        response += `📖 **Ledger:**\n`;
        response += `  • "Show ledger for [customer name]"\n`;
        response += `  • "Customer outstanding balance"\n\n`;
        response += `📞 **Follow-ups:**\n`;
        response += `  • "Today's follow-ups"\n`;
        response += `  • "Overdue follow-ups"`;
      }
      
      // Ledger - Conversational
      else if (
        (normalizedMessage === "ledger" || 
         normalizedMessage.match(/^(show|open)\s+ledger$/i))
      ) {
        commandType = "info";
        response = `📖 **Ledger ke baare me kya dekhna chahte hain?**\n\n`;
        response += `💡 Kripya customer specify karein:\n\n`;
        response += `📋 **Commands:**\n`;
        response += `  • "Show ledger for [customer name]"\n`;
        response += `  • "Ledger of [customer name]"\n`;
        response += `  • "[Customer name] ka ledger"\n\n`;
        response += `💰 **Additional Info:**\n`;
        response += `  • "Outstanding balance for [customer]"\n`;
        response += `  • "Payment history of [customer]"`;
      }
      
      // Leads Module - Conversational
      else if (
        (normalizedMessage === "leads" || 
         normalizedMessage === "lead" ||
         normalizedMessage.match(/^(show|list)\s+leads?$/i))
      ) {
        commandType = "info";
        response = `🎯 **Leads ke baare me kya jaanna hai?**\n\n`;
        response += `💡 Aap yeh puch sakte hain:\n\n`;
        response += `📊 **Summary:**\n`;
        response += `  • "Total leads"\n`;
        response += `  • "Hot leads"\n`;
        response += `  • "Warm leads"\n`;
        response += `  • "Cold leads"\n\n`;
        response += `📅 **Status:**\n`;
        response += `  • "New leads"\n`;
        response += `  • "Contacted leads"\n`;
        response += `  • "Qualified leads"\n`;
        response += `  • "Converted leads"\n\n`;
        response += `🗓️ **Time:**\n`;
        response += `  • "Today's leads"\n`;
        response += `  • "This week's leads"`;
      }
      
      // Quotations Module - Conversational
      else if (
        (normalizedMessage === "quotations" || 
         normalizedMessage === "quotation" ||
         normalizedMessage === "quotes" ||
         normalizedMessage.match(/^(show|list)\s+quotations?$/i))
      ) {
        commandType = "info";
        response = `📝 **Quotations ke baare me kya dekhna hai?**\n\n`;
        response += `💡 Main yeh bata sakta hoon:\n\n`;
        response += `📊 **Summary:**\n`;
        response += `  • "Total quotations"\n`;
        response += `  • "Pending quotations"\n`;
        response += `  • "Approved quotations"\n\n`;
        response += `🗓️ **Time:**\n`;
        response += `  • "Today's quotations"\n`;
        response += `  • "This week's quotations"\n`;
        response += `  • "This month's quotations"\n\n`;
        response += `👤 **Customer:**\n`;
        response += `  • "Quotations for [customer name]"`;
      }
      
      // Action Center - Conversational
      else if (
        (normalizedMessage === "action center" || 
         normalizedMessage === "actions" ||
         normalizedMessage === "tasks" ||
         normalizedMessage.match(/^(show|open)\s+action center$/i))
      ) {
        commandType = "info";
        response = `🎯 **Action Center me kya dekhna chahte hain?**\n\n`;
        response += `💡 Available options:\n\n`;
        response += `✅ **Tasks:**\n`;
        response += `  • "My tasks"\n`;
        response += `  • "Pending tasks"\n`;
        response += `  • "Completed tasks"\n\n`;
        response += `📞 **Calls:**\n`;
        response += `  • "Call queue"\n`;
        response += `  • "Today's calls"\n\n`;
        response += `📋 **Follow-ups:**\n`;
        response += `  • "Today's follow-ups"\n`;
        response += `  • "Overdue follow-ups"\n\n`;
        response += `🎯 **Targets:**\n`;
        response += `  • "My daily target"\n`;
        response += `  • "Target progress"`;
      }
      
      // Default response for unrecognized commands
      else {
        response = `Hi ${userName}! I can help you with:\n\n` +
          "📋 Queries:\n" +
          "  • 'Show due invoices'\n" +
          "  • 'Today's collection'\n" +
          "  • 'Alpha category customers'\n" +
          "  • 'Show ledger for [customer name]'\n\n" +
          "📧 Actions:\n" +
          "  • 'Send email reminder to overdue customers'\n" +
          "  • 'Send WhatsApp reminder to due customers'\n" +
          "  • 'Call [customer name]'\n\n" +
          "What would you like to do?";
      }

      // Save to chat history
      await db.insert(assistantChatHistory).values({
        tenantId: req.tenantId!,
        userId,
        userMessage: message,
        assistantResponse: response,
        commandType,
        actionPerformed,
        resultData: resultData ? JSON.stringify(resultData) : null,
        isVoiceInput: isVoice || false,
      });

      // Track analytics - Success case (graceful degradation)
      try {
        const responseTime = Date.now() - startTime;
        await db.insert(assistantAnalytics).values({
          tenantId: req.tenantId!,
          userId,
          command: message,
          normalizedCommand: normalizedMessage,
          commandType,
          isSuccess: true,
          responseTime,
          isVoiceInput: isVoice || false,
          pageContext: pageContext || null,
        });
      } catch (analyticsError) {
        // Fail silently - don't break command processing
        console.error("Failed to track analytics (success):", analyticsError);
      }

      res.json({
        response,
        commandType,
        action: actionPerformed,
        data: resultData,
      });
    } catch (error: any) {
      console.error("Failed to process command:", error);
      
      // Track analytics - Error case (graceful degradation)
      try {
        const responseTime = Date.now() - startTime;
        const userId = (req.session as any).user?.id;
        const { message: userMessage, isVoice, context } = req.body;
        
        if (userId && userMessage) {
          await db.insert(assistantAnalytics).values({
            tenantId: req.tenantId!,
            userId,
            command: userMessage,
            normalizedCommand: userMessage.toLowerCase().trim(),
            commandType: "info",
            isSuccess: false,
            errorMessage: error.message,
            responseTime,
            isVoiceInput: isVoice || false,
            pageContext: context || null,
          });
        }
      } catch (analyticsError) {
        // Fail silently - don't break error handling
        console.error("Failed to track analytics (error):", analyticsError);
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Get assistant settings for current user
  app.get("/api/assistant/settings", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req.session as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await storage.getAssistantSettings(req.tenantId!, userId);
      
      // Return default settings if none exist
      if (!settings) {
        return res.json({
          alwaysListen: false,
          wakeWord: "RECOV",
          wakeWordSensitivity: 5,
          voiceFeedback: true,
          language: "en-IN",
          autoExecuteActions: false,
          showSuggestions: true,
          theme: "light",
        });
      }

      res.json(settings);
    } catch (error: any) {
      console.error("Failed to fetch assistant settings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update assistant settings for current user
  app.put("/api/assistant/settings", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req.session as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const settings = await storage.updateAssistantSettings(
        req.tenantId!,
        userId,
        req.body
      );

      res.json(settings);
    } catch (error: any) {
      console.error("Failed to update assistant settings:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get assistant analytics for current user
  app.get("/api/assistant/analytics", tenantMiddleware, async (req, res) => {
    try {
      const userId = (req.session as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get analytics data from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const analytics = await db
        .select()
        .from(assistantAnalytics)
        .where(
          and(
            eq(assistantAnalytics.tenantId, req.tenantId!),
            eq(assistantAnalytics.userId, userId),
            sql`${assistantAnalytics.createdAt} >= ${thirtyDaysAgo}`
          )
        )
        .orderBy(desc(assistantAnalytics.createdAt));

      // Calculate statistics
      const totalCommands = analytics.length;
      const successfulCommands = analytics.filter(a => a.isSuccess).length;
      const failedCommands = totalCommands - successfulCommands;
      const successRate = totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0;
      
      const avgResponseTime = totalCommands > 0
        ? analytics.reduce((sum, a) => sum + (a.responseTime || 0), 0) / totalCommands
        : 0;

      // Most used commands
      const commandCounts: Record<string, number> = {};
      analytics.forEach(a => {
        const cmd = a.normalizedCommand || a.command;
        commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
      });

      const mostUsedCommands = Object.entries(commandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([command, count]) => ({ command, count }));

      // Command types distribution
      const commandTypes = {
        query: analytics.filter(a => a.commandType === "query").length,
        action: analytics.filter(a => a.commandType === "action").length,
        info: analytics.filter(a => a.commandType === "info").length,
      };

      // Voice vs text
      const voiceCommands = analytics.filter(a => a.isVoiceInput).length;
      const textCommands = totalCommands - voiceCommands;

      // Recent errors
      const recentErrors = analytics
        .filter(a => !a.isSuccess && a.errorMessage)
        .slice(0, 5)
        .map(a => ({
          command: a.command,
          error: a.errorMessage,
          timestamp: a.createdAt,
        }));

      res.json({
        totalCommands,
        successfulCommands,
        failedCommands,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        mostUsedCommands,
        commandTypes,
        voiceCommands,
        textCommands,
        recentErrors,
      });
    } catch (error: any) {
      console.error("Failed to fetch assistant analytics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Razorpay payment routes for landing page
  app.post("/api/razorpay/create-order", async (req, res) => {
    try {
      const { name, email, mobile, plan, amount } = req.body;

      // Validate inputs with Zod schema
      const orderSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        mobile: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
        plan: z.enum(["STANDARD", "PREMIUM", "STAR", "PLATINUM"]),
        amount: z.number().positive("Amount must be positive"),
      });

      const validation = orderSchema.safeParse({ name, email, mobile, plan, amount: parseFloat(amount) });
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed",
          errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      }

      // Server-side plan pricing validation (prevent tampering)
      const planPricing: Record<string, number> = {
        STANDARD: 9999,
        PREMIUM: 19999,
        STAR: 29999,
        PLATINUM: 0, // Contact sales
      };

      const expectedAmount = planPricing[validation.data.plan];
      if (expectedAmount === 0) {
        return res.status(400).json({ message: "This plan requires contacting sales for custom pricing" });
      }

      if (Math.abs(validation.data.amount - expectedAmount) > 1) {
        return res.status(400).json({ message: "Invalid amount for selected plan" });
      }

      // Validate amount is a positive number
      const amountInPaise = Math.round(validation.data.amount * 100);
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Check if Razorpay credentials are configured
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpayKeyId || !razorpayKeySecret) {
        console.error("Razorpay credentials not configured");
        return res.status(500).json({ message: "Payment gateway not configured" });
      }

      // Create Razorpay order
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          name: validation.data.name,
          email: validation.data.email,
          mobile: validation.data.mobile,
          plan: validation.data.plan,
        },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
      });
    } catch (error: any) {
      console.error("Failed to create Razorpay order:", error);
      res.status(500).json({ message: error.message || "Failed to create payment order" });
    }
  });

  app.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: "Missing payment details" });
      }

      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!razorpayKeySecret) {
        return res.status(500).json({ message: "Payment gateway not configured" });
      }

      // Verify payment signature
      const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature === razorpay_signature) {
        // Payment verified successfully
        res.json({ success: true, message: "Payment verified successfully" });
      } else {
        res.status(400).json({ success: false, message: "Invalid payment signature" });
      }
    } catch (error: any) {
      console.error("Failed to verify payment:", error);
      res.status(500).json({ message: error.message || "Failed to verify payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
