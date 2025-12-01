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

async function checkEnumValues() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Check the ENUM values for relationshipType
    const result = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'UserProfiles' 
      AND column_name = 'relationshipType'
    `);

    console.log('RelationshipType column info:', result[0]);

    // Check if there are any constraints
    const constraints = await sequelize.query(`
      SELECT 
        conname,
        contype,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'UserProfiles'::regclass
    `);

    console.log('Table constraints:', constraints[0]);

    // Check current values in the table
    const currentValues = await sequelize.query(`
      SELECT DISTINCT "relationshipType" 
      FROM "UserProfiles" 
      WHERE "relationshipType" IS NOT NULL
    `);

    console.log('Current relationshipType values in database:', currentValues[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkEnumValues(); 