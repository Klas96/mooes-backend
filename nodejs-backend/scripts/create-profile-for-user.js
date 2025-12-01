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

const createProfileForUser = async (email) => {
  try {
    console.log(`🔍 Looking for user: ${email}`);

    // Find the user
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: UserProfile,
          as: 'profile'
        }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`\n📋 User Details:`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   🆔 User ID: ${user.id}`);
    console.log(`   👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`   📋 Has Profile: ${user.profile ? 'Yes' : 'No'}`);

    if (user.profile) {
      console.log('✅ User already has a profile');
      return;
    }

    // Create a basic profile
    console.log('\n📝 Creating profile...');
    const profile = await UserProfile.create({
      userId: user.id,
      bio: 'New user profile',
      gender: 'M', // Default to male
      genderPreference: 'B', // Default to both
      relationshipType: 'C,S,F,B', // Default to all relationship types
      location: 'Unknown',
      keyWords: ['New User'],
      locationMode: 'local'
    });

    console.log('✅ Profile created successfully');
    console.log(`   📋 Profile ID: ${profile.id}`);
    console.log(`   👤 Gender: ${profile.gender}`);
    console.log(`   💕 Looking for: ${profile.genderPreference}`);

    console.log('\n💡 User should now be able to login successfully');

  } catch (error) {
    console.error('❌ Error creating profile:', error);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/create-profile-for-user.js <email>');
  console.log('Example: node scripts/create-profile-for-user.js joshua.scott@example.com');
  process.exit(1);
}

createProfileForUser(email); 