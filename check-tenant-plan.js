// Quick script to check tenant plans and Credit Control module access
const { db } = require('./server/db');
const { tenants, subscriptionPlans } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function checkTenantPlans() {
  console.log('\n=== Tenant Subscription Plans & Credit Control Access ===\n');
  
  const allTenants = await db
    .select({
      id: tenants.id,
      businessName: tenants.businessName,
      email: tenants.email,
      status: tenants.status,
      subscriptionPlanId: tenants.subscriptionPlanId,
      customModules: tenants.customModules
    })
    .from(tenants)
    .where(eq(tenants.status, 'active'));

  for (const tenant of allTenants) {
    console.log(`\n📊 ${tenant.businessName}`);
    console.log(`   Email: ${tenant.email}`);
    
    // Check custom modules first
    if (tenant.customModules && tenant.customModules.length > 0) {
      const hasCreditControl = tenant.customModules.includes('Credit Control');
      console.log(`   ✨ Custom Modules: ${hasCreditControl ? '✅' : '❌'} Credit Control`);
      console.log(`   Total Modules: ${tenant.customModules.length}`);
    } 
    // Otherwise check subscription plan
    else if (tenant.subscriptionPlanId) {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, tenant.subscriptionPlanId))
        .limit(1);
      
      if (plan) {
        const hasCreditControl = plan.allowedModules.includes('Credit Control');
        console.log(`   📦 Plan: ${plan.name}`);
        console.log(`   Credit Control: ${hasCreditControl ? '✅ Included' : '❌ NOT Included'}`);
        console.log(`   Total Modules: ${plan.allowedModules.length}`);
      } else {
        console.log(`   ⚠️  No valid subscription plan found`);
      }
    } else {
      console.log(`   ⚠️  No subscription plan assigned`);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total Active Tenants: ${allTenants.length}`);
  console.log('\nTo fix Credit Control access:');
  console.log('1. Platform Admin > Tenant Registrations > Change Plan');
  console.log('2. Or assign custom modules for specific tenant');
  console.log('\n');
  
  process.exit(0);
}

checkTenantPlans().catch(console.error);
