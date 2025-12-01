require('dotenv').config();
const { sequelize } = require('../models');

async function verifyAdminPremium() {
  try {
    console.log('🔍 Verifying admin premium status...');
    
    // Get admin user details
    const [userResult] = await sequelize.query(`
      SELECT 
        id,
        email,
        "firstName",
        "lastName",
        "isPremium",
        "premiumExpiry",
        "premiumPlan",
        "subscriptionStatus",
        "createdAt",
        "updatedAt"
      FROM "Users" 
      WHERE email = 'admin@klasholmgren.se'
    `);
    
    if (userResult.length === 0) {
      console.log('❌ No user found with email admin@klasholmgren.se');
      return;
    }
    
    const user = userResult[0];
    console.log('\n📊 Admin User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Premium: ${user.isPremium}`);
    console.log(`   Expiry: ${user.premiumExpiry}`);
    console.log(`   Plan: ${user.premiumPlan}`);
    console.log(`   Status: ${user.subscriptionStatus}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Updated: ${user.updatedAt}`);
    
    // Check if premium is active
    const now = new Date();
    const expiry = new Date(user.premiumExpiry);
    const isActive = user.isPremium && expiry > now;
    
    console.log(`\n🎯 Premium Status: ${isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    
    if (isActive) {
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.ceil((expiry - now) / (1000 * 60 * 60));
      console.log(`⏰ Days remaining: ${daysLeft}`);
      console.log(`⏰ Hours remaining: ${hoursLeft}`);
    } else {
      console.log('❌ Premium has expired or is not active');
    }
    
    // Check all premium users in the system
    const [allPremiumUsers] = await sequelize.query(`
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
      WHERE "isPremium" = true
      ORDER BY "premiumExpiry" DESC
    `);
    
    console.log(`\n📈 Total Premium Users: ${allPremiumUsers.length}`);
    
    if (allPremiumUsers.length > 0) {
      console.log('\n👥 All Premium Users:');
      allPremiumUsers.forEach((premiumUser, index) => {
        const userExpiry = new Date(premiumUser.premiumExpiry);
        const userActive = premiumUser.isPremium && userExpiry > now;
        const userDaysLeft = Math.ceil((userExpiry - now) / (1000 * 60 * 60 * 24));
        
        console.log(`   ${index + 1}. ${premiumUser.email} (${premiumUser.firstName} ${premiumUser.lastName})`);
        console.log(`      Plan: ${premiumUser.premiumPlan}`);
        console.log(`      Status: ${userActive ? '✅ Active' : '❌ Expired'} (${userDaysLeft} days left)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error verifying admin premium:', error);
  } finally {
    await sequelize.close();
  }
}

verifyAdminPremium(); 