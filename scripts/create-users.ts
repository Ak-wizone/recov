import { createTenantUsers } from "../server/seed";

async function main() {
  console.log("=".repeat(50));
  console.log("Creating Users for All Tenants");
  console.log("=".repeat(50));
  console.log("");
  
  await createTenantUsers();
  
  console.log("");
  console.log("=".repeat(50));
  console.log("Done!");
  console.log("=".repeat(50));
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
