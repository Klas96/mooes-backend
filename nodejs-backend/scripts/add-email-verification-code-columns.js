const { sequelize } = require('../nodejs-backend/models');

async function addEmailVerificationCodeColumns() {
  try {
    console.log('Adding email verification code columns to User table...');
    
    // Add emailVerified column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false
    `);
    
    // Add emailVerificationCode column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "emailVerificationCode" VARCHAR(255)
    `);
    
    // Add emailVerificationExpiry column
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP
    `);
    
    console.log('✅ Email verification code columns added successfully!');
    
    // Update existing users to have emailVerified = true (grandfather existing users)
    await sequelize.query(`
      UPDATE "Users" 
      SET "emailVerified" = true 
      WHERE "emailVerified" IS NULL
    `);
    
    console.log('✅ Existing users marked as email verified');
    
  } catch (error) {
    console.error('❌ Error adding email verification code columns:', error);
  } finally {
    await sequelize.close();
  }
}

addEmailVerificationCodeColumns(); 