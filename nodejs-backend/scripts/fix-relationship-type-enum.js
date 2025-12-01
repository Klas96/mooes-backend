const { sequelize } = require('../nodejs-backend/models');

async function fixRelationshipTypeEnum() {
  try {
    console.log('Starting relationshipType enum fix...');
    
    // First, let's check the current state of the column
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'UserProfiles' AND column_name = 'relationshipType'
    `);
    
    console.log('Current column state:', results[0]);
    
    if (results.length > 0) {
      const currentType = results[0].udt_name;
      console.log('Current type:', currentType);
      
      // If it's already an array type, we need to handle it differently
      if (currentType.includes('_array') || currentType.includes('[]')) {
        console.log('Column is already an array type, checking enum values...');
        
        // Check if the enum type exists
        const [enumResults] = await sequelize.query(`
          SELECT typname FROM pg_type WHERE typname = 'enum_UserProfiles_relationshipType'
        `);
        
        if (enumResults.length === 0) {
          console.log('Creating enum type...');
          await sequelize.query(`
            CREATE TYPE "enum_UserProfiles_relationshipType" AS ENUM('C', 'S', 'F', 'B')
          `);
        }
        
        // Try to convert existing data to array format
        console.log('Converting existing data to array format...');
        await sequelize.query(`
          UPDATE "UserProfiles" 
          SET "relationshipType" = ARRAY["relationshipType"]::text[] 
          WHERE "relationshipType" IS NOT NULL 
          AND array_length("relationshipType", 1) IS NULL
        `);
        
        // Now alter the column type
        console.log('Altering column type...');
        await sequelize.query(`
          ALTER TABLE "UserProfiles" 
          ALTER COLUMN "relationshipType" TYPE "enum_UserProfiles_relationshipType"[] 
          USING "relationshipType"::"enum_UserProfiles_relationshipType"[]
        `);
        
      } else {
        // If it's a single enum, convert to array
        console.log('Converting single enum to array...');
        
        // Create the enum type if it doesn't exist
        await sequelize.query(`
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_UserProfiles_relationshipType') THEN
              CREATE TYPE "enum_UserProfiles_relationshipType" AS ENUM('C', 'S', 'F', 'B');
            END IF;
          END $$;
        `);
        
        // Convert existing single values to arrays
        await sequelize.query(`
          UPDATE "UserProfiles" 
          SET "relationshipType" = ARRAY["relationshipType"]::text 
          WHERE "relationshipType" IS NOT NULL
        `);
        
        // Alter the column type
        await sequelize.query(`
          ALTER TABLE "UserProfiles" 
          ALTER COLUMN "relationshipType" TYPE "enum_UserProfiles_relationshipType"[] 
          USING "relationshipType"::"enum_UserProfiles_relationshipType"[]
        `);
      }
      
      // Set default value
      await sequelize.query(`
        ALTER TABLE "UserProfiles" 
        ALTER COLUMN "relationshipType" SET DEFAULT ARRAY['C']::"enum_UserProfiles_relationshipType"[]
      `);
      
      console.log('RelationshipType enum fix completed successfully!');
      
    } else {
      console.log('UserProfiles table or relationshipType column not found');
    }
    
  } catch (error) {
    console.error('Error fixing relationshipType enum:', error);
    
    // Try a more conservative approach
    try {
      console.log('Trying conservative fix...');
      
      // Drop the column and recreate it
      await sequelize.query(`
        ALTER TABLE "UserProfiles" DROP COLUMN IF EXISTS "relationshipType"
      `);
      
      // Create the enum type
      await sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_UserProfiles_relationshipType') THEN
            CREATE TYPE "enum_UserProfiles_relationshipType" AS ENUM('C', 'S', 'F', 'B');
          END IF;
        END $$;
      `);
      
      // Add the column back with correct type
      await sequelize.query(`
        ALTER TABLE "UserProfiles" 
        ADD COLUMN "relationshipType" "enum_UserProfiles_relationshipType"[] DEFAULT ARRAY['C']::"enum_UserProfiles_relationshipType"[]
      `);
      
      console.log('Conservative fix completed successfully!');
      
    } catch (conservativeError) {
      console.error('Conservative fix also failed:', conservativeError);
      throw conservativeError;
    }
  }
}

// Run the fix
fixRelationshipTypeEnum()
  .then(() => {
    console.log('Database fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database fix failed:', error);
    process.exit(1);
  }); 