const { Sequelize } = require('sequelize');
const path = require('path');

// Load environment variables from the parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Create Sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function addBitcoinPaymentField() {
  try {
    console.log('Adding pendingBitcoinPayment field to User table...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Add the pendingBitcoinPayment column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "pendingBitcoinPayment" TEXT;
    `);
    
    // Update the platform enum to include 'bitcoin'
    await sequelize.query(`
      ALTER TYPE "enum_Users_platform" ADD VALUE IF NOT EXISTS 'bitcoin';
    `);
    
    console.log('✅ Successfully added Bitcoin payment fields to User table');
    
    // Show the updated table structure
    const results = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Users' 
      AND column_name IN ('pendingBitcoinPayment', 'platform')
      ORDER BY column_name;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('Updated columns:');
    results.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding Bitcoin payment fields:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

// Run the migration
addBitcoinPaymentField(); 