const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment variables
let configPath = path.resolve(__dirname, '../../.env-config.yaml');
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, '../.env-config.yaml');
}

let config;
if (fs.existsSync(configPath)) {
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  console.log('✅ Loaded environment variables from YAML config');
  if (config.database && config.database.url) {
    process.env.DATABASE_URL = config.database.url;
  }
} else {
  console.error('❌ Could not load .env-config.yaml');
  process.exit(1);
}

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Load the migration
const migration = require('./202501170001-add-store-website.js');

async function runMigration() {
  try {
    console.log('🚀 Starting migration to add website column to Stores table...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    
    await migration.up(queryInterface, DataTypes);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();

