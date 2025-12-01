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
const { User, UserProfile, Match } = require('../models');

const removeAdminDislikes = async () => {
  try {
    console.log('🗑️ Removing all dislikes made by admin@klasholmgren.se...');

    // Find the admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@klasholmgren.se' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    // Find admin's profile
    const adminProfile = await UserProfile.findOne({
      where: { userId: adminUser.id }
    });

    if (!adminProfile) {
      console.log('❌ Admin profile not found');
      return;
    }

    console.log(`✅ Found admin profile: ID ${adminProfile.id}`);

    // Find all matches where admin is involved and status is 'disliked'
    const adminDislikes = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: adminProfile.id },
          { user2Id: adminProfile.id }
        ],
        status: 'disliked'
      },
      include: [
        {
          model: UserProfile,
          as: 'user1',
          include: [{ model: User, as: 'user' }]
        },
        {
          model: UserProfile,
          as: 'user2',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    console.log(`📊 Found ${adminDislikes.length} dislikes made by admin`);

    if (adminDislikes.length === 0) {
      console.log('✅ No dislikes found for admin user');
      return;
    }

    // Display the dislikes before removing them
    console.log('\n📋 Dislikes to be removed:');
    for (const dislike of adminDislikes) {
      const otherUser = dislike.user1Id === adminProfile.id ? dislike.user2 : dislike.user1;
      console.log(`   - ${otherUser.user.email} (Profile ID: ${otherUser.id})`);
    }

    // Remove the dislikes
    let removedCount = 0;
    for (const dislike of adminDislikes) {
      try {
        await dislike.destroy();
        removedCount++;
        console.log(`✅ Removed dislike for profile ID: ${dislike.user1Id === adminProfile.id ? dislike.user2Id : dislike.user1Id}`);
      } catch (error) {
        console.error(`❌ Failed to remove dislike:`, error.message);
      }
    }

    console.log(`\n📈 Removal Summary:`);
    console.log(`   ✅ Successfully removed: ${removedCount} dislikes`);
    console.log(`   ❌ Failed removals: ${adminDislikes.length - removedCount}`);
    console.log(`   📊 Total dislikes processed: ${adminDislikes.length}`);

    if (removedCount > 0) {
      console.log(`\n🎉 Successfully removed ${removedCount} dislikes made by admin!`);
      console.log('💡 Admin can now like these profiles again.');
    }

  } catch (error) {
    console.error('❌ Error removing admin dislikes:', error);
    process.exit(1);
  }
};

removeAdminDislikes(); 