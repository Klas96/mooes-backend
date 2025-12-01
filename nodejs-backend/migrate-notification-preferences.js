// Load environment config
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

try {
  const configPath = path.resolve(__dirname, '.env-config.yaml');
  if (fs.existsSync(configPath)) {
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    if (config.database && config.database.url) {
      process.env.DATABASE_URL = config.database.url;
    }
  }
} catch (error) {
  console.log('⚠️ Could not load .env-config.yaml:', error.message);
}

require('dotenv').config();

const { sequelize } = require('./models');

async function migrate() {
  try {
    console.log('🔄 Adding notificationPreferences column to Users table...');
    
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB 
      DEFAULT '{"weeklyMatches": true, "newMatches": true, "newMessages": true, "profileViews": false, "promotions": false}'::jsonb;
    `);
    
    console.log('✅ Migration complete!');
    console.log('📊 Verifying column exists...');
    
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Users' AND column_name = 'notificationPreferences';
    `);
    
    if (results.length > 0) {
      console.log('✅ Column verified:', results[0]);
    } else {
      console.log('❌ Column not found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrate();

