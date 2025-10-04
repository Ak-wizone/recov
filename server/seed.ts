import { storage } from "./storage";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("Checking for seed data...");

  try {
    const adminRole = {
      name: "Admin",
      description: "Full system administrator with all permissions",
      permissions: [
        "Dashboard - View",
        "Leads - View", "Leads - Create", "Leads - Edit", "Leads - Delete", "Leads - Export", "Leads - Import", "Leads - Print",
        "Quotations - View", "Quotations - Create", "Quotations - Edit", "Quotations - Delete", "Quotations - Export", "Quotations - Import", "Quotations - Print",
        "Proforma Invoices - View", "Proforma Invoices - Create", "Proforma Invoices - Edit", "Proforma Invoices - Delete", "Proforma Invoices - Export", "Proforma Invoices - Import", "Proforma Invoices - Print",
        "Invoices - View", "Invoices - Create", "Invoices - Edit", "Invoices - Delete", "Invoices - Export", "Invoices - Import", "Invoices - Print",
        "Receipts - View", "Receipts - Create", "Receipts - Edit", "Receipts - Delete", "Receipts - Export", "Receipts - Import", "Receipts - Print",
        "Debtors - View", "Debtors - Create", "Debtors - Edit", "Debtors - Delete", "Debtors - Export", "Debtors - Import", "Debtors - Print",
        "Masters - Customers - View", "Masters - Customers - Create", "Masters - Customers - Edit", "Masters - Customers - Delete", "Masters - Customers - Export", "Masters - Customers - Import", "Masters - Customers - Print",
        "Masters - Items - View", "Masters - Items - Create", "Masters - Items - Edit", "Masters - Items - Delete", "Masters - Items - Export", "Masters - Items - Import", "Masters - Items - Print",
        "Company Settings - View", "Company Settings - Edit",
        "User Management - View", "User Management - Create", "User Management - Edit", "User Management - Delete", "User Management - Export", "User Management - Import", "User Management - Print",
        "Roles Management - View", "Roles Management - Create", "Roles Management - Edit", "Roles Management - Delete", "Roles Management - Export", "Roles Management - Import", "Roles Management - Print",
        "Reports - View", "Reports - Export", "Reports - Print"
      ]
    };

    const roles = await storage.getRoles();
    const existingAdminRole = roles.find((r: any) => r.name === "Admin");

    let roleId: string;

    if (!existingAdminRole) {
      console.log("Creating Admin role...");
      const newRole = await storage.createRole(adminRole);
      roleId = newRole.id;
      console.log("✓ Admin role created");
    } else {
      console.log("✓ Admin role already exists");
      roleId = existingAdminRole.id;
    }

    const existingAdminUser = await storage.getUserByEmail("admin@example.com");

    if (!existingAdminUser) {
      console.log("Creating admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      await storage.createUser({
        name: "Admin User",
        email: "admin@example.com",
        mobile: "1234567890",
        roleId: roleId,
        status: "Active",
        password: hashedPassword
      });
      
      console.log("✓ Admin user created (email: admin@example.com, password: admin123)");
    } else {
      console.log("✓ Admin user already exists");
    }

    console.log("Seed data check complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
