#!/usr/bin/env node
/**
 * Script to manually register a company/store
 * Usage: node scripts/register-company.js <email> <password> <storeName> [description] [location]
 */

const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Load .env-config.yaml from the root
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
    
    // Set environment variables from YAML config
    if (config.database && config.database.url) {
      process.env.DATABASE_URL = config.database.url;
    }
    if (config.jwt && config.jwt.secret) {
      process.env.JWT_SECRET = config.jwt.secret;
    }
    console.log('✅ Loaded environment variables from .env-config.yaml');
  }
} catch (error) {
  console.log('⚠️ Could not load .env-config.yaml:', error.message);
}

require('dotenv').config();

const { sequelize } = require('../models');
const bcrypt = require('bcryptjs');

async function registerCompany(email, password, storeName, description, location) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const models = require('../models');
    const { User, UserProfile, Store } = models;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('⚠️  User with this email already exists (ID: ' + existingUser.id + ')');
      
      // Check if store exists
      let existingStore;
      try {
        existingStore = await Store.findOne({ where: { userId: existingUser.id } });
      } catch (err) {
        console.log('⚠️  Error checking for store:', err.message);
        existingStore = null;
      }
      
      if (existingStore) {
        console.log(`   ✅ Store already exists: ${existingStore.storeName} (ID: ${existingStore.id})`);
        console.log('');
        console.log('📋 Existing Account:');
        console.log(`   Email: ${email}`);
        console.log(`   Store: ${existingStore.storeName}`);
        console.log(`   Store ID: ${existingStore.id}`);
      } else {
        console.log('   No store account found. Creating store...');
        try {
          const store = await Store.create({
            userId: existingUser.id,
            storeName,
            description: description || null,
            location: location || null,
            isActive: true
          });
          console.log(`✅ Store created: ${store.storeName} (ID: ${store.id})`);
          console.log('');
          console.log('📋 Account Summary:');
          console.log(`   Email: ${email}`);
          console.log(`   Store: ${storeName}`);
          console.log(`   Store ID: ${store.id}`);
        } catch (storeErr) {
          console.error('❌ Failed to create store:', storeErr.message);
          throw storeErr;
        }
      }
      await sequelize.close();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const firstName = storeName.split(' ')[0] || storeName;
    const lastName = storeName.split(' ').slice(1).join(' ') || 'Company';
    
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      emailVerified: true, // Skip email verification for manual registration
    });

    console.log(`✅ User created: ${user.email} (ID: ${user.id})`);

    // Create user profile
    const profile = await UserProfile.create({
      userId: user.id,
      genderPreference: 'B',
      relationshipType: 'C,S,F,B'
    });

    console.log(`✅ User profile created`);

    // Create store
    const store = await Store.create({
      userId: user.id,
      storeName,
      description: description || null,
      location: location || null,
      isActive: true
    });

    console.log(`✅ Store created: ${store.storeName} (ID: ${store.id})`);
    console.log('');
    console.log('📋 Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Store: ${storeName}`);
    console.log(`   Store ID: ${store.id}`);
    console.log('');
    console.log('✅ Company registration complete!');
    console.log('   The company can now log in at the company portal.');

  } catch (error) {
    console.error('❌ Error registering company:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: node scripts/register-company.js <email> <password> <storeName> [description] [location]');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/register-company.js company@example.com MyPassword123 "My Company" "Company description" "Stockholm, Sweden"');
  process.exit(1);
}

const [email, password, storeName, description, location] = args;

registerCompany(email, password, storeName, description, location);

