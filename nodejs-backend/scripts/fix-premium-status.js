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

// Fix premium status
async function fixPremiumStatus() {
  try {
    console.log('🔧 Fixing premium status for users...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Check current status
    const [currentStats] = await sequelize.query(`
      SELECT 
        "isPremium",
        COUNT(*) as count
      FROM "Users" 
      GROUP BY "isPremium";
    `);
    
    console.log('📊 Current premium status distribution:');
    currentStats.forEach(row => {
      console.log(`  - isPremium: ${row.isPremium} (${row.count} users)`);
    });
    
    // Fix null isPremium to false
    const [updateResult] = await sequelize.query(`
      UPDATE "Users" 
      SET "isPremium" = false 
      WHERE "isPremium" IS NULL;
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} users with null isPremium to false`);
    
    // Check final status
    const [finalStats] = await sequelize.query(`
      SELECT 
        "isPremium",
        COUNT(*) as count
      FROM "Users" 
      GROUP BY "isPremium";
    `);
    
    console.log('📊 Final premium status distribution:');
    finalStats.forEach(row => {
      console.log(`  - isPremium: ${row.isPremium} (${row.count} users)`);
    });
    
    console.log('🎉 Premium status fix completed!');
    
  } catch (error) {
    console.error('❌ Premium status fix failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixPremiumStatus(); 