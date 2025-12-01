require('dotenv').config();
const { sequelize } = require('../models');

async function giveUserPremium(email, days = 365, plan = 'manual') {
  try {
    console.log(`🎯 Giving premium status to ${email}...`);
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    // Update the user's premium status
    const [updateResult] = await sequelize.query(`
      UPDATE "Users" 
      SET 
        "isPremium" = true,
        "premiumExpiry" = :expiryDate,
        "premiumPlan" = :plan,
        "subscriptionStatus" = 'active',
        "updatedAt" = NOW()
      WHERE email = :email
    `, {
      replacements: { 
        email: email,
        expiryDate: expiryDate.toISOString(),
        plan: plan
      },
      type: sequelize.QueryTypes.UPDATE
    });
    
    if (updateResult === 0) {
      console.log(`❌ No user found with email ${email}`);
      return false;
    }
    
    console.log('✅ User premium status updated successfully!');
    console.log(`📅 Premium expires: ${expiryDate.toISOString()}`);
    console.log(`📅 Days added: ${days}`);
    console.log(`📅 Plan: ${plan}`);
    
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
      WHERE email = :email
    `, {
      replacements: { email: email }
    });
    
    if (userResult.length > 0) {
      const user = userResult[0];
      console.log('\n📊 User Details:');
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
    
    return true;
    
  } catch (error) {
    console.error('❌ Error giving user premium:', error);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const days = parseInt(args[1]) || 365;
const plan = args[2] || 'manual';

if (!email) {
  console.log('Usage: node give-user-premium.js <email> [days] [plan]');
  console.log('Example: node give-user-premium.js user@example.com 30 monthly');
  process.exit(1);
}

giveUserPremium(email, days, plan); 