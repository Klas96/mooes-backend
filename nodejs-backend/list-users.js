const { Sequelize } = require('sequelize');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Also try to load from yaml config
try {
  let configPath = path.resolve(__dirname, '.env-config.yaml');
  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(__dirname, '../.env-config.yaml');
  }
  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(__dirname, '../../.env-config.yaml');
  }
  if (fs.existsSync(configPath)) {
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    Object.keys(config).forEach(key => {
      if (!process.env[key]) { // Only set if not already set
        process.env[key] = config[key];
      }
    });
    console.log('✅ Loaded additional environment from .env-config.yaml');
  }
} catch (error) {
  console.log('⚠️  Error loading .env-config.yaml, using .env file only');
}

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
  process.exit(1);
}

console.log('✅ DATABASE_URL found:', process.env.DATABASE_URL.substring(0, 20) + '...');

// Database configuration
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

async function listUsers() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all users with detailed information
    const users = await sequelize.query(`
      SELECT 
        u.id,
        u.email,
        u."firstName",
        u."lastName",
        u."emailVerified",
        u."isPremium",
        u."premiumExpiry",
        u."isActive",
        u."lastLogin",
        u."createdAt",
        u."updatedAt",
        up.id as profile_id,
        up.bio,
        up."birthDate",
        up.gender,
        up."genderPreference",
        up."relationshipType",
        up.location,
        up."locationMode",
        up."keyWords"
      FROM "Users" u
      LEFT JOIN "UserProfiles" up ON u.id = up."userId"
      ORDER BY u."createdAt" DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Found ${users.length} user(s) in database:`);
    console.log('=' .repeat(100));

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    users.forEach((user, index) => {
      console.log(`\n👤 User #${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅' : '❌'}`);
      console.log(`   Premium: ${user.isPremium ? '✅' : '❌'}`);
      console.log(`   Active: ${user.isActive ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log(`   Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}`);
      
      if (user.profile_id) {
        console.log(`   Profile ID: ${user.profile_id}`);
        console.log(`   Bio: ${user.bio || 'No bio'}`);
        console.log(`   Birth Date: ${user.birthDate || 'Not set'}`);
        console.log(`   Gender: ${user.gender || 'Not set'}`);
        console.log(`   Gender Preference: ${user.genderPreference || 'Not set'}`);
        console.log(`   Relationship Type: ${user.relationshipType || 'Not set'}`);
        console.log(`   Location: ${user.location || 'Not set'}`);
        console.log(`   Location Mode: ${user.locationMode || 'Not set'}`);
        console.log(`   Keywords: ${user.keyWords || 'None'}`);
      } else {
        console.log(`   Profile: ❌ No profile created`);
      }
      console.log('   ' + '-'.repeat(50));
    });

    // Summary statistics
    const verifiedUsers = users.filter(u => u.emailVerified).length;
    const premiumUsers = users.filter(u => u.isPremium).length;
    const activeUsers = users.filter(u => u.isActive).length;
    const usersWithProfiles = users.filter(u => u.profile_id).length;
    const usersWithBirthDate = users.filter(u => u.birthDate).length;

    console.log('\n📈 Summary Statistics:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Email Verified: ${verifiedUsers}`);
    console.log(`   Premium Users: ${premiumUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Users with Profiles: ${usersWithProfiles}`);
    console.log(`   Users with Birth Date: ${usersWithBirthDate}`);

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure your database is running and accessible');
    }
  } finally {
    await sequelize.close();
  }
}

// Run the script
listUsers(); 