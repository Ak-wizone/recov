import { storage } from "./storage";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("Checking for seed data...");

  try {
    // Create or update platform admin (no tenantId, no roleId - for managing tenant registrations)
    const existingPlatformAdmin = await storage.getUserByEmail("platform@admin.com");

    if (!existingPlatformAdmin) {
      console.log("Creating platform admin user...");
      const hashedPassword = await bcrypt.hash("platform123", 10);
      
      await storage.createUser(null, {
        name: "Platform Administrator",
        email: "platform@admin.com",
        mobile: "0000000000",
        status: "Active",
        password: hashedPassword
      });
      
      console.log("✓ Platform admin created (email: platform@admin.com, password: platform123)");
    } else {
      // Reset password to ensure consistent credentials
      // Pass raw password - updateUser will hash it
      console.log("Resetting platform admin password...");
      await storage.updateUser(null, existingPlatformAdmin.id, {
        password: "platform123"
      });
      console.log("✓ Platform admin password reset to: platform123");
    }

    // Create default subscription plans if they don't exist
    const existingPlans = await storage.getSubscriptionPlans();
    
    if (existingPlans.length === 0) {
      console.log("Creating default subscription plans...");
      
      // Starter Plan - Basic modules
      await storage.createSubscriptionPlan({
        name: "Starter",
        description: "Perfect for small businesses getting started with CRM",
        price: "999.00",
        billingCycle: "monthly",
        allowedModules: [
          "Business Overview",
          "Leads",
          "Quotations",
          "Invoices",
          "Receipts",
          "Masters",
          "Customers",
          "Items",
          "Banks",
          "Voucher Types",
          "Settings",
          "Company Profile",
          "User Management",
          "Roles Management"
        ],
        color: "#3b82f6",
        displayOrder: 1,
        isActive: true
      });
      
      // Professional Plan - Most modules
      await storage.createSubscriptionPlan({
        name: "Professional",
        description: "For growing businesses needing advanced features",
        price: "2499.00",
        billingCycle: "monthly",
        allowedModules: [
          "Business Overview",
          "Customer Analytics",
          "Leads",
          "Quotations",
          "Proforma Invoices",
          "Invoices",
          "Receipts",
          "Payment Tracking",
          "Debtors",
          "Credit Management",
          "Ledger",
          "Payment Analytics",
          "Credit Control",
          "Category Management",
          "Follow-up Rules",
          "Category Calculation",
          "Urgent Actions",
          "Follow-up Automation",
          "Masters",
          "Customers",
          "Items",
          "Banks",
          "Voucher Types",
          "Settings",
          "Company Profile",
          "User Management",
          "Roles Management",
          "Backup & Restore",
          "Communication Schedules",
          "Audit Logs",
          "Email/WhatsApp/Call Integrations"
        ],
        color: "#8b5cf6",
        displayOrder: 2,
        isActive: true
      });
      
      // Enterprise Plan - All modules
      await storage.createSubscriptionPlan({
        name: "Enterprise",
        description: "Complete solution with all features for large organizations",
        price: "4999.00",
        billingCycle: "monthly",
        allowedModules: [
          "Business Overview",
          "Customer Analytics",
          "Leads",
          "Quotations",
          "Proforma Invoices",
          "Invoices",
          "Receipts",
          "Payment Tracking",
          "Debtors",
          "Credit Management",
          "Ledger",
          "Action Center",
          "Daily Dashboard",
          "Task Manager",
          "Call Queue",
          "Activity Logs",
          "Team Performance",
          "Leaderboard",
          "Daily Targets",
          "Notification Center",
          "Risk & Recovery",
          "Payment Analytics",
          "Credit Control",
          "Category Management",
          "Follow-up Rules",
          "Category Calculation",
          "Urgent Actions",
          "Follow-up Automation",
          "Masters",
          "Customers",
          "Items",
          "Banks",
          "Voucher Types",
          "Settings",
          "Company Profile",
          "User Management",
          "Roles Management",
          "Backup & Restore",
          "Communication Schedules",
          "Audit Logs",
          "Email/WhatsApp/Call Integrations",
          "RECOV Voice Assistant"
        ],
        color: "#f59e0b",
        displayOrder: 3,
        isActive: true
      });
      
      console.log("✓ Default subscription plans created (Starter, Professional, Enterprise)");
    } else {
      console.log(`✓ Found ${existingPlans.length} existing subscription plans (no auto-sync to preserve custom changes)`);
    }

    console.log("Seed data check complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

export async function createTenantUsers() {
  console.log("Creating users for all tenants...");
  
  try {
    const { db } = await import("./db");
    const { tenants } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // Get all active tenants
    const allTenants = await db.select().from(tenants).where(eq(tenants.status, "active"));
    
    console.log(`Found ${allTenants.length} active tenants`);
    
    const defaultPassword = "Welcome@123";
    let created = 0;
    let skipped = 0;
    
    for (const tenant of allTenants) {
      try {
        // Check if user already exists for this tenant
        const existingUser = await storage.getUserByEmail(tenant.email);
        
        if (existingUser && existingUser.tenantId === tenant.id) {
          console.log(`⊘ Skipped ${tenant.email} (already exists)`);
          skipped++;
          continue;
        }
        
        // Create user with default password
        await storage.createUser(tenant.id, {
          name: tenant.businessName || "Admin User",
          email: tenant.email,
          mobile: null,
          status: "Active",
          password: defaultPassword
        });
        
        console.log(`✓ Created user for ${tenant.businessName} (${tenant.email})`);
        created++;
      } catch (error) {
        console.error(`✗ Failed to create user for ${tenant.email}:`, error.message);
      }
    }
    
    console.log(`\n✓ User creation complete!`);
    console.log(`  - Created: ${created} users`);
    console.log(`  - Skipped: ${skipped} users`);
    console.log(`  - Default password for all: ${defaultPassword}`);
    
  } catch (error) {
    console.error("Error creating tenant users:", error);
    throw error;
  }
}
