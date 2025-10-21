import { storage } from "./storage";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("Checking for seed data...");

  try {
    // Create platform admin (no tenantId, no roleId - for managing tenant registrations)
    const existingPlatformAdmin = await storage.getUserByEmail("platform@admin.com");

    if (!existingPlatformAdmin) {
      console.log("Creating platform admin user...");
      const hashedPassword = await bcrypt.hash("platform123", 10);
      
      await storage.createUser({
        name: "Platform Administrator",
        email: "platform@admin.com",
        mobile: "0000000000",
        status: "Active",
        password: hashedPassword
      });
      
      console.log("✓ Platform admin created (email: platform@admin.com, password: platform123)");
    } else {
      console.log("✓ Platform admin already exists");
    }

    console.log("Seed data check complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
