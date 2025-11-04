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

    // Create admin roles for all tenants and assign to users
    await createAdminRolesForTenants();

    console.log("Seed data check complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Create Admin roles for all active tenants that don't have roles
async function createAdminRolesForTenants() {
  console.log("\n🔐 Setting up Admin roles for tenants...");
  
  try {
    const { db } = await import("./db");
    const { tenants } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // Get all active tenants
    const allTenants = await db.select().from(tenants).where(eq(tenants.status, "active"));
    
    let rolesCreated = 0;
    let usersAssigned = 0;
    let skipped = 0;
    
    for (const tenant of allTenants) {
      try {
        // Check if tenant already has an Admin role
        const existingRoles = await storage.getRoles(tenant.id);
        const adminRole = existingRoles.find(r => r.name === "Admin");
        
        let adminRoleId: string;
        
        if (!adminRole) {
          // Create comprehensive Admin role with ALL permissions
          const allPermissions = [
            // Dashboard & Analytics
            "Business Overview - View",
            "Customer Analytics - View",
            // Sales & Quotations
            "Leads - View", "Leads - Create", "Leads - Edit", "Leads - Delete", "Leads - Export", "Leads - Import", "Leads - Print",
            "Quotations - View", "Quotations - Create", "Quotations - Edit", "Quotations - Delete", "Quotations - Export", "Quotations - Import", "Quotations - Print",
            "Proforma Invoices - View", "Proforma Invoices - Create", "Proforma Invoices - Edit", "Proforma Invoices - Delete", "Proforma Invoices - Export", "Proforma Invoices - Import", "Proforma Invoices - Print",
            // Financial
            "Invoices - View", "Invoices - Create", "Invoices - Edit", "Invoices - Delete", "Invoices - Export", "Invoices - Import", "Invoices - Print",
            "Receipts - View", "Receipts - Create", "Receipts - Edit", "Receipts - Delete", "Receipts - Export", "Receipts - Import", "Receipts - Print",
            // Payment Tracking
            "Debtors - View", "Debtors - Export", "Debtors - Print",
            "Ledger - View", "Ledger - Export", "Ledger - Print",
            "Credit Management - View", "Credit Management - Export", "Credit Management - Print",
            "Payment Analytics - View", "Payment Analytics - Export", "Payment Analytics - Print",
            // Action Center & Team
            "Action Center - View", "Action Center - Create", "Action Center - Edit", "Action Center - Delete",
            "Team Performance - View", "Team Performance - Create", "Team Performance - Edit", "Team Performance - Delete",
            // Risk & Recovery
            "Risk Management - Client Risk Thermometer - View",
            "Risk Management - Payment Risk Forecaster - View",
            "Risk Management - Recovery Health Test - View",
            // Credit Control
            "Credit Control - View", "Credit Control - Create", "Credit Control - Edit", "Credit Control - Delete", "Credit Control - Export", "Credit Control - Import", "Credit Control - Print",
            // Masters
            "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print",
            "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print",
            // Settings & Administration
            "Company Profile - View", "Company Profile - Edit",
            "Settings - View", "Settings - Edit",
            "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", "User Management - Export", "User Management - Import", "User Management - Print",
            "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", "Roles Management - Export", "Roles Management - Import", "Roles Management - Print",
            "Communication Schedules - View", "Communication Schedules - Create", "Communication Schedules - Edit", "Communication Schedules - Delete",
            "Backup & Restore - View", "Backup & Restore - Create", "Backup & Restore - Delete",
            "Audit Logs - View", "Audit Logs - Export", "Audit Logs - Print",
            // Integrations
            "Email/WhatsApp/Call Integrations - View", "Email/WhatsApp/Call Integrations - Edit",
            // Reports
            "Reports - View", "Reports - Export", "Reports - Print",
          ];
          
          // All dashboard cards
          const allDashboardCards = [
            "Total Revenue", "Total Collections", "Total Outstanding", "Total Opening Balance",
            "Upcoming Invoices", "Due Today", "In Grace", "Overdue", "Paid On Time", "Paid Late",
            "Outstanding by Category", "Top 5 Customers by Revenue", "Top 5 Customers by Outstanding",
            "Overdue Invoices", "Recent Invoices", "Recent Receipts", "Customer Analytics",
            "Alpha", "Beta", "Gamma", "Delta",
            "High Risk", "Medium Risk", "Low Risk",
            "Pending Tasks", "Overdue Tasks", "Priority Customers", "Collection Progress",
          ];
          
          const newRole = await storage.createRole(tenant.id, {
            name: "Admin",
            description: "Full access to all modules and features",
            permissions: allPermissions,
            canViewGP: true,
            canSendEmail: true,
            canSendWhatsApp: true,
            canSendSMS: true,
            canTriggerCall: true,
            canSendReminder: true,
            canShareDocuments: true,
            allowedDashboardCards: allDashboardCards,
          });
          
          adminRoleId = newRole.id;
          rolesCreated++;
          console.log(`  ✓ Created Admin role for ${tenant.businessName}`);
        } else {
          adminRoleId = adminRole.id;
          skipped++;
        }
        
        // Assign admin role to primary tenant user if they don't have one
        const { users } = await import("../shared/schema");
        const { and } = await import("drizzle-orm");
        
        const tenantUsers = await db
          .select()
          .from(users)
          .where(and(
            eq(users.tenantId, tenant.id),
            eq(users.email, tenant.email)
          ));
        
        for (const user of tenantUsers) {
          if (!user.roleId) {
            await db
              .update(users)
              .set({ roleId: adminRoleId })
              .where(eq(users.id, user.id));
            
            usersAssigned++;
            console.log(`  ✓ Assigned Admin role to ${user.email}`);
          }
        }
        
      } catch (error) {
        console.error(`  ✗ Error processing ${tenant.businessName}:`, error);
      }
    }
    
    console.log(`\n✅ Admin role setup complete!`);
    console.log(`  - Roles created: ${rolesCreated}`);
    console.log(`  - Users assigned: ${usersAssigned}`);
    console.log(`  - Tenants skipped (already have roles): ${skipped}`);
    
  } catch (error) {
    console.error("Error creating admin roles:", error);
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
          mobile: undefined,
          status: "Active",
          password: defaultPassword
        });
        
        console.log(`✓ Created user for ${tenant.businessName} (${tenant.email})`);
        created++;
      } catch (error) {
        const err = error as Error;
        console.error(`✗ Failed to create user for ${tenant.email}:`, err.message);
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
