const { Sequelize } = require('sequelize');

// Set up SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './test-database.sqlite',
  logging: false
});

async function addHiddenField() {
  try {
    console.log('🔍 Adding isHidden field to UserProfile table...');
    
    // Check if the column already exists
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(UserProfiles)",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const hasHiddenColumn = tableInfo.some(column => column.name === 'isHidden');
    
    if (hasHiddenColumn) {
      console.log('✅ isHidden column already exists');
      return;
    }
    
    // Add the isHidden column
    await sequelize.query(
      'ALTER TABLE UserProfiles ADD COLUMN isHidden BOOLEAN NOT NULL DEFAULT 0',
      { type: Sequelize.QueryTypes.RAW }
    );
    
    console.log('✅ Successfully added isHidden column to UserProfiles table');
    
    // Update all existing profiles to have isHidden = false
    const updatedCount = await sequelize.query(
      'UPDATE UserProfiles SET isHidden = 0 WHERE isHidden IS NULL',
      { type: Sequelize.QueryTypes.UPDATE }
    );
    
    console.log(`✅ Updated existing profiles with isHidden = false`);
    
  } catch (error) {
    console.error('❌ Error adding isHidden field:', error);
    throw error;
  }
}

// Run the migration
addHiddenField()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }); 