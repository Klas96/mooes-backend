const { sequelize } = require('../models');

async function runUnmatchMigration() {
  try {
    console.log('Running unmatch migration...');
    
    // Add 'unmatched' to the status enum
    await sequelize.query(`
      ALTER TYPE "enum_Matches_status" ADD VALUE 'unmatched';
    `);
    
    console.log('✅ Unmatch migration completed successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Unmatched status already exists in enum');
    } else {
      console.error('❌ Migration failed:', error);
    }
  } finally {
    await sequelize.close();
  }
}

runUnmatchMigration(); 