require('dotenv').config();
const { sequelize } = require('../nodejs-backend/models');

async function addPremiumColumns() {
  try {
    console.log('Adding premium columns to users table...');
    
    // Add isPremium column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN DEFAULT false
    `);
    
    // Add premiumExpiry column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "premiumExpiry" TIMESTAMP
    `);
    
    // Add premiumPlan column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "premiumPlan" VARCHAR(255)
    `);
    
    console.log('Premium columns added successfully!');
    
    // Verify the columns were added
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Users' 
      AND column_name IN ('isPremium', 'premiumExpiry', 'premiumPlan')
    `);
    
    console.log('Verification - Added columns:');
    results.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error adding premium columns:', error);
  } finally {
    await sequelize.close();
  }
}

addPremiumColumns(); 