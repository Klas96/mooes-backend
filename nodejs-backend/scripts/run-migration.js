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

// Migration function
async function runMigration() {
  try {
    console.log('🚀 Starting migration to add missing User columns...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Add all missing columns
    const columns = [
      { name: 'fcmToken', type: 'TEXT', allowNull: true },
      { name: 'isPremium', type: 'BOOLEAN', defaultValue: false },
      { name: 'premiumExpiry', type: 'DATE', allowNull: true },
      { name: 'premiumPlan', type: 'VARCHAR(255)', allowNull: true },
      { name: 'isActive', type: 'BOOLEAN', defaultValue: true },
      { name: 'lastLogin', type: 'DATE', defaultValue: 'NOW()' },
      { name: 'aiMessageCount', type: 'INTEGER', defaultValue: 0, allowNull: false },
      { name: 'lastAiMessageDate', type: 'DATE', allowNull: true },
      { name: 'lastPurchaseToken', type: 'TEXT', allowNull: true },
      { name: 'lastPurchaseDate', type: 'DATE', allowNull: true },
      { name: 'platform', type: 'VARCHAR(50)', allowNull: true },
      { name: 'pendingBitcoinPayment', type: 'TEXT', allowNull: true },
      { name: 'subscriptionStatus', type: 'VARCHAR(50)', defaultValue: 'active', allowNull: false },
      { name: 'gracePeriodEnd', type: 'DATE', allowNull: true },
      { name: 'autoRenewalEnabled', type: 'BOOLEAN', defaultValue: true },
      { name: 'cancellationReason', type: 'VARCHAR(255)', allowNull: true },
      { name: 'refundRequested', type: 'BOOLEAN', defaultValue: false },
      { name: 'refundDate', type: 'DATE', allowNull: true },
      { name: 'dailyLikesUsed', type: 'INTEGER', defaultValue: 0, allowNull: false },
      { name: 'lastLikeResetDate', type: 'DATE', allowNull: true }
    ];

    for (const column of columns) {
      try {
        const defaultValue = column.defaultValue ? `DEFAULT ${column.defaultValue}` : '';
        const allowNull = column.allowNull === false ? 'NOT NULL' : '';
        
        const query = `ALTER TABLE "Users" ADD COLUMN "${column.name}" ${column.type} ${defaultValue} ${allowNull}`;
        
        console.log(`Adding column: ${column.name}`);
        await sequelize.query(query);
        console.log(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Column ${column.name} already exists, skipping...`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
runMigration(); 