const { Sequelize, DataTypes } = require('sequelize');

// Database configuration - requires DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file or environment.');
}

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

async function addGpsColumns() {
  try {
    console.log('Adding GPS columns to UserProfile table...');
    
    // Add latitude column
    await sequelize.query(`
      ALTER TABLE "UserProfiles" 
      ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,8)
    `);
    
    // Add longitude column
    await sequelize.query(`
      ALTER TABLE "UserProfiles" 
      ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(11,8)
    `);
    
    // Add index for location queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "user_profiles_location_idx" 
      ON "UserProfiles" ("latitude", "longitude")
    `);
    
    console.log('GPS columns added successfully!');
    
    // Test the connection and show table structure
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'UserProfiles' 
      AND column_name IN ('latitude', 'longitude')
      ORDER BY column_name
    `);
    
    console.log('New columns:');
    results.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error adding GPS columns:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addGpsColumns(); 