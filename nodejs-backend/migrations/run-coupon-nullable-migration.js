const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

// Load environment variables - try multiple methods like server.js
// Method 1: Try .env-config.yaml
let configPath = path.resolve(__dirname, '../../.env-config.yaml');
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, '../../../mooves/.env-config.yaml');
}
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, '../.env-config.yaml');
}
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, '../../mooves/.env-config.yaml');
}

let config;
if (fs.existsSync(configPath)) {
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  console.log('✅ Loaded environment variables from YAML config');
  if (config.database && config.database.url) {
    process.env.DATABASE_URL = config.database.url;
  }
} else {
  // Method 2: Try .env file
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Loaded environment variables from .env file');
  } else {
    console.log('⚠️ Could not load .env-config.yaml or .env, trying environment variables...');
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment or config');
      process.exit(1);
    }
  }
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
const migration = require('./202501150001-make-coupon-fields-nullable.js');

// Migration function
async function runMigration() {
  try {
    console.log('🚀 Starting migration to make Coupon fields nullable...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Get queryInterface
    const queryInterface = sequelize.getQueryInterface();
    
    // Run the migration
    await migration.up(queryInterface, DataTypes);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error.message.includes('does not exist')) {
      console.log('⚠️ Column may have already been modified or table does not exist');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
runMigration();

