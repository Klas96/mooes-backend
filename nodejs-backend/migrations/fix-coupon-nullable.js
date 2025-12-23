const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

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

async function fixCouponNullable() {
  try {
    console.log('🔍 Checking current column nullability...');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Check current state
    const [results] = await sequelize.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Coupons' 
      AND column_name IN ('userId', 'goalId')
    `);
    
    console.log('Current column nullability:');
    results.forEach(r => {
      console.log(`  ${r.column_name}: ${r.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });
    
    // Fix userId
    if (results.find(r => r.column_name === 'userId' && r.is_nullable === 'NO')) {
      console.log('\n🔧 Making userId nullable...');
      await sequelize.query(`
        ALTER TABLE "Coupons" 
        ALTER COLUMN "userId" DROP NOT NULL
      `);
      console.log('✅ userId is now nullable');
    } else {
      console.log('✅ userId is already nullable');
    }
    
    // Fix goalId
    if (results.find(r => r.column_name === 'goalId' && r.is_nullable === 'NO')) {
      console.log('\n🔧 Making goalId nullable...');
      await sequelize.query(`
        ALTER TABLE "Coupons" 
        ALTER COLUMN "goalId" DROP NOT NULL
      `);
      console.log('✅ goalId is now nullable');
    } else {
      console.log('✅ goalId is already nullable');
    }
    
    // Verify changes
    const [finalResults] = await sequelize.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Coupons' 
      AND column_name IN ('userId', 'goalId')
    `);
    
    console.log('\n📋 Final column nullability:');
    finalResults.forEach(r => {
      console.log(`  ${r.column_name}: ${r.is_nullable === 'YES' ? 'nullable ✅' : 'NOT NULL ❌'}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixCouponNullable();


