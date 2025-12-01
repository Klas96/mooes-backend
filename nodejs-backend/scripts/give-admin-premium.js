require('dotenv').config();
const { sequelize } = require('../models');

async function giveAdminPremium() {
  try {
    console.log('🎯 Giving premium status to admin@klasholmgren.se...');
    
    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    // Update the admin user's premium status
    const [updateResult] = await sequelize.query(`
      UPDATE "Users" 
      SET 
        "isPremium" = true,
        "premiumExpiry" = :expiryDate,
        "premiumPlan" = 'admin_lifetime',
        "subscriptionStatus" = 'active',
        "updatedAt" = NOW()
      WHERE email = 'admin@klasholmgren.se'
    `, {
      replacements: { expiryDate: expiryDate.toISOString() },
      type: sequelize.QueryTypes.UPDATE
    });
    
    if (updateResult === 0) {
      console.log('❌ No user found with email admin@klasholmgren.se');
      return;
    }
    
    console.log('✅ Admin premium status updated successfully!');
    console.log(`📅 Premium expires: ${expiryDate.toISOString()}`);
    
    // Verify the update
    const [userResult] = await sequelize.query(`
      SELECT 
        id,
        email,
        "firstName",
        "lastName",
        "isPremium",
        "premiumExpiry",
        "premiumPlan",
        "subscriptionStatus"
      FROM "Users" 
      WHERE email = 'admin@klasholmgren.se'
    `);
    
    if (userResult.length > 0) {
      const user = userResult[0];
      console.log('\n📊 Admin User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Premium: ${user.isPremium}`);
      console.log(`   Expiry: ${user.premiumExpiry}`);
      console.log(`   Plan: ${user.premiumPlan}`);
      console.log(`   Status: ${user.subscriptionStatus}`);
      
      // Check if premium is active
      const now = new Date();
      const expiry = new Date(user.premiumExpiry);
      const isActive = user.isPremium && expiry > now;
      
      console.log(`\n🎯 Premium Status: ${isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
      
      if (isActive) {
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        console.log(`⏰ Days remaining: ${daysLeft}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error giving admin premium:', error);
  } finally {
    await sequelize.close();
  }
}

giveAdminPremium(); 