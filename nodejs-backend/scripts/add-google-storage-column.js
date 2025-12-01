const { sequelize } = require('../nodejs-backend/models');

async function addGoogleStorageColumn() {
  try {
    console.log('Adding googleStorageDestination column to Images table...');
    
    // Add the column if it doesn't exist
    await sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Images' 
          AND column_name = 'googleStorageDestination'
        ) THEN
          ALTER TABLE "Images" ADD COLUMN "googleStorageDestination" VARCHAR(255);
        END IF;
      END $$;
    `);
    
    console.log('✅ googleStorageDestination column added successfully!');
    
    // Verify the column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Images' 
      AND column_name = 'googleStorageDestination';
    `);
    
    if (results.length > 0) {
      console.log('✅ Column verification successful!');
    } else {
      console.log('❌ Column verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error adding column:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addGoogleStorageColumn(); 