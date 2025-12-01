const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function migrateRelationshipTypes() {
  try {
    console.log('Starting relationship type migration...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // First, add the new column as an array
    console.log('Adding new relationshipTypes column...');
    await sequelize.query(`
      ALTER TABLE "UserProfiles" 
      ADD COLUMN "relationshipTypes" TEXT[] DEFAULT ARRAY['C']
    `);
    
    // Copy data from old column to new column
    console.log('Migrating existing relationship type data...');
    await sequelize.query(`
      UPDATE "UserProfiles" 
      SET "relationshipTypes" = ARRAY["relationshipType"] 
      WHERE "relationshipType" IS NOT NULL
    `);
    
    // Drop the old column
    console.log('Dropping old relationshipType column...');
    await sequelize.query(`
      ALTER TABLE "UserProfiles" 
      DROP COLUMN "relationshipType"
    `);
    
    // Rename the new column to relationshipType for backward compatibility
    console.log('Renaming column to relationshipType...');
    await sequelize.query(`
      ALTER TABLE "UserProfiles" 
      RENAME COLUMN "relationshipTypes" TO "relationshipType"
    `);
    
    console.log('Migration completed successfully!');
    
    // Verify the migration
    const result = await sequelize.query(`
      SELECT "relationshipType" FROM "UserProfiles" LIMIT 5
    `);
    console.log('Sample data after migration:', result[0]);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
migrateRelationshipTypes(); 