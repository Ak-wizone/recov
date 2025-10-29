import { storage } from "./storage";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("Checking for seed data...");

  try {
    // Create or update platform admin (no tenantId, no roleId - for managing tenant registrations)
    const existingPlatformAdmin = await storage.getUserByEmail("platform@admin.com");
    const hashedPassword = await bcrypt.hash("platform123", 10);

    if (!existingPlatformAdmin) {
      console.log("Creating platform admin user...");
      
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
      console.log("Resetting platform admin password...");
      await storage.updateUser(null, existingPlatformAdmin.id, {
        password: hashedPassword
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
          "Settings"
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
          "Credit Control",
          "Masters",
          "Settings",
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
          "Action Center",
          "Team Performance",
          "Risk & Recovery",
          "Credit Control",
          "Masters",
          "Settings",
          "Email/WhatsApp/Call Integrations"
        ],
        color: "#f59e0b",
        displayOrder: 3,
        isActive: true
      });
      
      console.log("✓ Default subscription plans created (Starter, Professional, Enterprise)");
    } else {
      console.log("✓ Subscription plans already exist");
    }

    console.log("Seed data check complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
