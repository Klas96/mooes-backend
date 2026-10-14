#!/usr/bin/env node
/**
 * Script to verify email for a company account
 * Usage: node scripts/verify-company-email.js <email>
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

async function verifyCompanyEmail(email) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const models = require('../models');
    const { User, Store } = models;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`📧 Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Current emailVerified status: ${user.emailVerified}`);

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    console.log(`✅ Email verified for ${user.email}`);

    // Check if store exists
    const store = await Store.findOne({ where: { userId: user.id } });
    if (store) {
      console.log(`✅ Store found: ${store.storeName} (ID: ${store.id})`);
    } else {
      console.log(`⚠️  No store account found for this user`);
      console.log(`   You may need to create a store account via the company portal`);
    }

    console.log('');
    console.log('📋 Account Summary:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    if (store) {
      console.log(`   Store: ${store.storeName}`);
      console.log(`   Store ID: ${store.id}`);
    }
    console.log('');
    console.log('✅ Email verification complete!');
    console.log('   The company can now log in at the company portal.');

  } catch (error) {
    console.error('❌ Error verifying email:', error.message);
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

if (args.length < 1) {
  console.log('Usage: node scripts/verify-company-email.js <email>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/verify-company-email.js company@example.com');
  process.exit(1);
}

const [email] = args;

verifyCompanyEmail(email);

