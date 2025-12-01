require('dotenv').config();
const { sequelize } = require('../nodejs-backend/models');

async function addBillingFields() {
  try {
    if (!sequelize) {
      console.error('❌ Database connection not available. Please check your DATABASE_URL environment variable.');
      return;
    }

    console.log('🔄 Adding billing fields to User table...');

    // Add new billing fields
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "lastPurchaseToken" TEXT,
      ADD COLUMN IF NOT EXISTS "lastPurchaseDate" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "platform" VARCHAR(10) CHECK (platform IN ('android', 'ios')),
      ADD COLUMN IF NOT EXISTS "subscriptionStatus" VARCHAR(20) DEFAULT 'active' CHECK ("subscriptionStatus" IN ('active', 'expired', 'canceled', 'pending', 'grace_period')),
      ADD COLUMN IF NOT EXISTS "gracePeriodEnd" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "autoRenewalEnabled" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "cancellationReason" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "refundRequested" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "refundDate" TIMESTAMP;
    `);

    // Add comments to the columns
    await sequelize.query(`
      COMMENT ON COLUMN "Users"."lastPurchaseToken" IS 'Google Play purchase token or App Store receipt data';
      COMMENT ON COLUMN "Users"."lastPurchaseDate" IS 'Date of last successful purchase';
      COMMENT ON COLUMN "Users"."platform" IS 'Platform where subscription was purchased';
      COMMENT ON COLUMN "Users"."subscriptionStatus" IS 'Current status of the subscription';
      COMMENT ON COLUMN "Users"."gracePeriodEnd" IS 'End date of grace period after subscription expires';
      COMMENT ON COLUMN "Users"."autoRenewalEnabled" IS 'Whether auto-renewal is enabled for the subscription';
      COMMENT ON COLUMN "Users"."cancellationReason" IS 'Reason for subscription cancellation';
      COMMENT ON COLUMN "Users"."refundRequested" IS 'Whether user has requested a refund';
      COMMENT ON COLUMN "Users"."refundDate" IS 'Date when refund was processed';
    `);

    // Update existing premium users to have proper status
    await sequelize.query(`
      UPDATE "Users" 
      SET "subscriptionStatus" = CASE 
        WHEN "isPremium" = true AND "premiumExpiry" > NOW() THEN 'active'
        WHEN "isPremium" = true AND "premiumExpiry" <= NOW() THEN 'expired'
        ELSE 'active'
      END
      WHERE "isPremium" = true;
    `);

    console.log('✅ Billing fields added successfully!');
    console.log('📊 Updated subscription status for existing premium users');

    // Show summary
    const result = await sequelize.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN "isPremium" = true THEN 1 END) as premium_users,
        COUNT(CASE WHEN "subscriptionStatus" = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN "subscriptionStatus" = 'expired' THEN 1 END) as expired_subscriptions
      FROM "Users";
    `);

    console.log('📈 User Statistics:');
    console.log(`   Total Users: ${result[0][0].total_users}`);
    console.log(`   Premium Users: ${result[0][0].premium_users}`);
    console.log(`   Active Subscriptions: ${result[0][0].active_subscriptions}`);
    console.log(`   Expired Subscriptions: ${result[0][0].expired_subscriptions}`);

  } catch (error) {
    console.error('❌ Error adding billing fields:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addBillingFields()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addBillingFields; 