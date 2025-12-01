#!/usr/bin/env node

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load .env-config.yaml from the root
const configPath = path.resolve(__dirname, '../../.env-config.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// Set environment variables from YAML config
if (config.database && config.database.url) {
  process.env.DATABASE_URL = config.database.url;
}
if (config.jwt && config.jwt.secret) {
  process.env.JWT_SECRET = config.jwt.secret;
}

// Import models
const { User } = require('../models');

const verifyTestUser = async () => {
  try {
    console.log('🔍 Looking for test user...');
    
    // Find the test user
    const user = await User.findOne({
      where: { email: 'testuser@example.com' }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`📧 Email verified: ${user.emailVerified}`);

    if (user.emailVerified) {
      console.log('✅ User is already verified!');
      return;
    }

    // Manually verify the user
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    console.log('✅ User has been manually verified!');
    console.log('🔑 You can now login with:');
    console.log('   Email: testuser@example.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Error verifying test user:', error);
  } finally {
    process.exit(0);
  }
};

verifyTestUser(); 