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
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Check premium status
async function checkPremiumStatus() {
  try {
    console.log('🔧 Checking user premium status...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Check premium status distribution
    const [premiumStats] = await sequelize.query(`
      SELECT 
        "isPremium",
        COUNT(*) as count
      FROM "Users" 
      GROUP BY "isPremium";
    `);
    
    console.log('📊 Premium status distribution:');
    premiumStats.forEach(row => {
      console.log(`  - isPremium: ${row.isPremium} (${row.count} users)`);
    });
    
    // Check users with null isPremium
    const [nullPremiumUsers] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "isPremium", "aiMessageCount"
      FROM "Users" 
      WHERE "isPremium" IS NULL
      LIMIT 5;
    `);
    
    if (nullPremiumUsers.length > 0) {
      console.log('\n⚠️ Users with null isPremium (this might cause the counter to not show):');
      nullPremiumUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.firstName} ${user.lastName}, AI Count: ${user.aiMessageCount}`);
      });
    }
    
    // Check users with false isPremium
    const [falsePremiumUsers] = await sequelize.query(`
      SELECT id, "firstName", "lastName", "isPremium", "aiMessageCount"
      FROM "Users" 
      WHERE "isPremium" = false
      LIMIT 5;
    `);
    
    if (falsePremiumUsers.length > 0) {
      console.log('\n✅ Users with false isPremium (should show message counter):');
      falsePremiumUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.firstName} ${user.lastName}, AI Count: ${user.aiMessageCount}`);
      });
    }
    
    console.log('\n🎉 Premium status check completed!');
    
  } catch (error) {
    console.error('❌ Premium status check failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkPremiumStatus(); 