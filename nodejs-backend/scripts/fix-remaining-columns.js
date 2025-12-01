const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment variables from YAML config
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
} else {
  console.log('⚠️ Could not load .env-config.yaml');
  process.exit(1);
}

// Set environment variables
if (config.database && config.database.url) {
  process.env.DATABASE_URL = config.database.url;
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

// Fix remaining columns
async function fixRemainingColumns() {
  try {
    console.log('🔧 Fixing remaining columns...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Fix aiMessageCount - add with default value first, then set NOT NULL
    try {
      console.log('Fixing aiMessageCount column...');
      await sequelize.query('ALTER TABLE "Users" ADD COLUMN "aiMessageCount" INTEGER DEFAULT 0');
      await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "aiMessageCount" SET NOT NULL');
      console.log('✅ Fixed aiMessageCount column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ aiMessageCount column already exists, updating...');
        await sequelize.query('UPDATE "Users" SET "aiMessageCount" = 0 WHERE "aiMessageCount" IS NULL');
        await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "aiMessageCount" SET NOT NULL');
        console.log('✅ Updated aiMessageCount column');
      } else {
        console.error('❌ Error fixing aiMessageCount:', error.message);
      }
    }

    // Fix subscriptionStatus - add without default first, then set default
    try {
      console.log('Fixing subscriptionStatus column...');
      await sequelize.query('ALTER TABLE "Users" ADD COLUMN "subscriptionStatus" VARCHAR(50)');
      await sequelize.query('UPDATE "Users" SET "subscriptionStatus" = \'active\' WHERE "subscriptionStatus" IS NULL');
      await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "subscriptionStatus" SET NOT NULL');
      await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "subscriptionStatus" SET DEFAULT \'active\'');
      console.log('✅ Fixed subscriptionStatus column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ subscriptionStatus column already exists, updating...');
        await sequelize.query('UPDATE "Users" SET "subscriptionStatus" = \'active\' WHERE "subscriptionStatus" IS NULL');
        await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "subscriptionStatus" SET NOT NULL');
        await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "subscriptionStatus" SET DEFAULT \'active\'');
        console.log('✅ Updated subscriptionStatus column');
      } else {
        console.error('❌ Error fixing subscriptionStatus:', error.message);
      }
    }

    // Fix dailyLikesUsed - add with default value first, then set NOT NULL
    try {
      console.log('Fixing dailyLikesUsed column...');
      await sequelize.query('ALTER TABLE "Users" ADD COLUMN "dailyLikesUsed" INTEGER DEFAULT 0');
      await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "dailyLikesUsed" SET NOT NULL');
      console.log('✅ Fixed dailyLikesUsed column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ dailyLikesUsed column already exists, updating...');
        await sequelize.query('UPDATE "Users" SET "dailyLikesUsed" = 0 WHERE "dailyLikesUsed" IS NULL');
        await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "dailyLikesUsed" SET NOT NULL');
        console.log('✅ Updated dailyLikesUsed column');
      } else {
        console.error('❌ Error fixing dailyLikesUsed:', error.message);
      }
    }

    console.log('🎉 All remaining columns fixed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixRemainingColumns(); 