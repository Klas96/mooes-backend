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
const { User, UserProfile, Match, Message, Image } = require('../models');

const removeUser = async (email) => {
  try {
    console.log(`🗑️ Removing user: ${email}...`);

    // Find the user by email
    const user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      console.log('❌ User not found with that email address');
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    // Find the user's profile
    const userProfile = await UserProfile.findOne({
      where: { userId: user.id }
    });

    if (userProfile) {
      console.log(`✅ Found user profile: ID ${userProfile.id}`);
    } else {
      console.log('⚠️  No user profile found');
    }

    // Get counts before deletion
    const images = await Image.findAll({ where: { userId: user.id } });
    const matches = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: userProfile?.id },
          { user2Id: userProfile?.id }
        ]
      }
    });
    const messages = await Message.findAll({
      where: { senderId: user.id }
    });

    console.log(`\n📊 Data to be removed:`);
    console.log(`   👤 User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    if (userProfile) {
      console.log(`   📋 Profile: ID ${userProfile.id}`);
    }
    console.log(`   📸 Images: ${images.length}`);
    console.log(`   💕 Matches: ${matches.length}`);
    console.log(`   💬 Messages: ${messages.length}`);

    // Confirm deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('\nAre you sure you want to delete this user and all their data? (yes/no): ', (answer) => {
        resolve(answer.trim());
      });
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled by user');
      return;
    }

    // Delete in the correct order to avoid foreign key constraints
    console.log('\n🗑️  Starting deletion...');

    // 1. Delete messages
    if (messages.length > 0) {
      console.log(`   💬 Deleting ${messages.length} messages...`);
      await Message.destroy({ where: { senderId: user.id } });
      console.log('   ✅ Messages deleted');
    }

    // 2. Delete matches
    if (matches.length > 0) {
      console.log(`   💕 Deleting ${matches.length} matches...`);
      await Match.destroy({
        where: {
          [require('sequelize').Op.or]: [
            { user1Id: userProfile?.id },
            { user2Id: userProfile?.id }
          ]
        }
      });
      console.log('   ✅ Matches deleted');
    }

    // 3. Delete images
    if (images.length > 0) {
      console.log(`   📸 Deleting ${images.length} images...`);
      await Image.destroy({ where: { userId: user.id } });
      console.log('   ✅ Images deleted');
    }

    // 4. Delete user profile
    if (userProfile) {
      console.log('   📋 Deleting user profile...');
      await userProfile.destroy();
      console.log('   ✅ User profile deleted');
    }

    // 5. Delete user
    console.log('   👤 Deleting user...');
    await user.destroy();
    console.log('   ✅ User deleted');

    console.log('\n🎉 User and all associated data successfully removed!');

  } catch (error) {
    console.error('❌ Error removing user:', error);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/remove-user.js <email>');
  console.log('Example: node scripts/remove-user.js user@example.com');
  process.exit(1);
}

removeUser(email); 