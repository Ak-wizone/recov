import bcrypt from "bcryptjs";

async function updateAllPasswords() {
  console.log("=".repeat(60));
  console.log("Updating All User Passwords Based on Email Pattern");
  console.log("=".repeat(60));
  console.log("");
  
  try {
    const { db } = await import("../server/db");
    const { users } = await import("../shared/schema");
    const { ne, eq } = await import("drizzle-orm");
    
    // Get all users except platform admin
    const allUsers = await db.select().from(users).where(ne(users.email, "platform@admin.com"));
    
    console.log(`Found ${allUsers.length} tenant users\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const user of allUsers) {
      try {
        // Extract username from email (part before @)
        const emailUsername = user.email.split('@')[0];
        
        // Create new password: username@#$405
        const newPassword = `${emailUsername}@#$405`;
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user password directly in database
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        
        console.log(`✓ ${user.email.padEnd(40)} → ${newPassword}`);
        updated++;
      } catch (error) {
        console.error(`✗ Failed to update ${user.email}:`, error.message);
        failed++;
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("Password Update Complete!");
    console.log("=".repeat(60));
    console.log(`✓ Updated: ${updated} users`);
    console.log(`✗ Failed: ${failed} users`);
    console.log("\nPassword Pattern: [email_username]@#$405");
    console.log("Example: accounts@wizoneit.com → accounts@#$405");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}

updateAllPasswords().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
