const { Sequelize } = require('sequelize');

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

async function fixRelationshipEnum() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Check current ENUM values
    const currentEnum = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'enum_UserProfiles_relationshipType'
      )
    `);

    console.log('Current ENUM values:', currentEnum[0].map(row => row.enumlabel));

    // Check if 'B' is missing
    const hasB = currentEnum[0].some(row => row.enumlabel === 'B');
    
    if (!hasB) {
      console.log('Adding missing "B" value to ENUM...');
      
      // Add the missing ENUM value
      await sequelize.query(`
        ALTER TYPE "enum_UserProfiles_relationshipType" ADD VALUE 'B'
      `);
      
      console.log('Successfully added "B" to ENUM');
    } else {
      console.log('"B" value already exists in ENUM');
    }

    // Verify the fix
    const updatedEnum = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'enum_UserProfiles_relationshipType'
      )
    `);

    console.log('Updated ENUM values:', updatedEnum[0].map(row => row.enumlabel));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixRelationshipEnum(); 