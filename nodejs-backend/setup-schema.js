require('dotenv').config();

console.log('Setting up database schema for tests...');

// For tests, we should use the DATABASE_URL from environment
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required for schema setup');
  process.exit(1);
}

console.log('Using DATABASE_URL from environment for schema setup');

// Import models and sync schema
const { sequelize } = require('./models');

async function setupSchema() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    console.log('Creating database schema...');
    await sequelize.sync({ force: true }); // force: true will drop and recreate tables
    console.log('✅ Database schema created successfully!');
    
    // Check if tables were created
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:', tables[0].map(t => t.table_name));
    
    await sequelize.close();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Schema setup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

setupSchema(); 