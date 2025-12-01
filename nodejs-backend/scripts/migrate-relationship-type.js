const { sequelize } = require('../nodejs-backend/models');

async function migrateRelationshipType() {
  try {
    console.log('Starting relationshipType migration...');
    
    // Check if the column exists and its current type
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'UserProfiles' AND column_name = 'relationshipType'
    `);
    
    if (results.length === 0) {
      console.log('UserProfiles table or relationshipType column not found');
      return;
    }
    
    console.log('Current column state:', results[0]);
    
    // If it's already a string type, we're good
    if (results[0].data_type === 'character varying' || results[0].data_type === 'text') {
      console.log('Column is already a string type, no migration needed');
      return;
    }
    
    // If it's an array type, we need to convert it
    if (results[0].udt_name.includes('_array') || results[0].udt_name.includes('[]')) {
      console.log('Converting array type to string...');
      
      // First, create a temporary column
      await sequelize.query(`
        ALTER TABLE "UserProfiles" 
        ADD COLUMN "relationshipType_new" VARCHAR(10) DEFAULT 'C'
      `);
      
      // Convert existing array data to string (take first element)
      await sequelize.query(`
        UPDATE "UserProfiles" 
        SET "relationshipType_new" = 
          CASE 
            WHEN "relationshipType" IS NULL THEN 'C'
            WHEN array_length("relationshipType", 1) > 0 THEN "relationshipType"[1]::text
            ELSE 'C'
          END
      `);
      
      // Drop the old column
      await sequelize.query(`
        ALTER TABLE "UserProfiles" DROP COLUMN "relationshipType"
      `);
      
      // Rename the new column
      await sequelize.query(`
        ALTER TABLE "UserProfiles" 
        RENAME COLUMN "relationshipType_new" TO "relationshipType"
      `);
      
      console.log('Array to string conversion completed!');
      
    } else if (results[0].udt_name.includes('enum')) {
      console.log('Converting enum type to string...');
      
      // Create a temporary column
      await sequelize.query(`
        ALTER TABLE "UserProfiles" 
        ADD COLUMN "relationshipType_new" VARCHAR(10) DEFAULT 'C'
      `);
      
      // Convert enum to string
      await sequelize.query(`
        UPDATE "UserProfiles" 
        SET "relationshipType_new" = 
          CASE 
            WHEN "relationshipType" IS NULL THEN 'C'
            ELSE "relationshipType"::text
          END
      `);
      
      // Drop the old column
      await sequelize.query(`
        ALTER TABLE "UserProfiles" DROP COLUMN "relationshipType"
      `);
      
      // Rename the new column
      await sequelize.query(`
        ALTER TABLE "UserProfiles" 
        RENAME COLUMN "relationshipType_new" TO "relationshipType"
      `);
      
      console.log('Enum to string conversion completed!');
    }
    
    // Add constraint to ensure valid values
    await sequelize.query(`
      ALTER TABLE "UserProfiles" 
      ADD CONSTRAINT "check_relationship_type" 
      CHECK ("relationshipType" IN ('C', 'S', 'F', 'B'))
    `);
    
    console.log('RelationshipType migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
    
    // Try to clean up if something went wrong
    try {
      await sequelize.query(`
        ALTER TABLE "UserProfiles" DROP COLUMN IF EXISTS "relationshipType_new"
      `);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    throw error;
  }
}

// Run the migration
migrateRelationshipType()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 