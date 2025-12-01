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
const { User, UserProfile } = require('../models');

const checkUserLogin = async (email) => {
  try {
    console.log(`🔍 Checking user login for: ${email}`);

    // Find all users with this email (in case of duplicates)
    const users = await User.findAll({
      where: { email },
      include: [
        {
          model: UserProfile,
          as: 'profile'
        }
      ]
    });

    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }

    if (users.length > 1) {
      console.log(`⚠️  Found ${users.length} users with this email!`);
    }

    // Test each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n📋 User ${i + 1} Details:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   👤 Name: ${user.firstName} ${user.lastName}`);
      console.log(`   📅 Created: ${user.createdAt.toLocaleDateString()}`);
      console.log(`   ✅ Email Verified: ${user.emailVerified}`);
      console.log(`   📋 Has Profile: ${user.profile ? 'Yes' : 'No'}`);

      if (user.profile) {
        console.log(`   📋 Profile ID: ${user.profile.id}`);
        console.log(`   👤 Gender: ${user.profile.gender || 'Not set'}`);
        console.log(`   💕 Looking for: ${user.profile.genderPreference || 'Not set'}`);
      }

      // Test multiple common passwords
      console.log('\n🔐 Testing passwords...');
      const testPasswords = ['password123', '123456', 'admin', 'test', 'password', '123456789'];
      
      let passwordFound = false;
      for (const testPassword of testPasswords) {
        const isMatch = await user.comparePassword(testPassword);
        if (isMatch) {
          console.log(`✅ Password "${testPassword}" is correct`);
          passwordFound = true;
          break;
        }
      }
      
      if (!passwordFound) {
        console.log('❌ None of the common passwords work');
        console.log('💡 Try these passwords:');
        testPasswords.forEach(pwd => console.log(`   - ${pwd}`));
      }

      // Check if user can login (email verified)
      if (!user.emailVerified) {
        console.log('\n⚠️  User cannot login because email is not verified');
      } else {
        console.log('\n✅ User can login (email is verified)');
      }
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/check-user-login.js <email>');
  console.log('Example: node scripts/check-user-login.js joshua.scott@example.com');
  process.exit(1);
}

checkUserLogin(email); 