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

const removeAdminLikes = async () => {
  try {
    console.log('🗑️ Removing all likes made by admin@klasholmgren.se...');

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

    // Find all matches where admin has liked someone
    const adminLikes = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          {
            user1Id: adminProfile.id,
            user1Liked: true
          },
          {
            user2Id: adminProfile.id,
            user2Liked: true
          }
        ]
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

    console.log(`📊 Found ${adminLikes.length} likes made by admin`);

    if (adminLikes.length === 0) {
      console.log('✅ No likes found for admin user');
      return;
    }

    // Display the likes before removing them
    console.log('\n📋 Likes to be removed:');
    for (const like of adminLikes) {
      const otherUser = like.user1Id === adminProfile.id ? like.user2 : like.user1;
      console.log(`   - ${otherUser.user.email} (Profile ID: ${otherUser.id})`);
    }

    // Remove the likes by setting the like status to false
    let removedCount = 0;
    for (const like of adminLikes) {
      try {
        if (like.user1Id === adminProfile.id) {
          await like.update({ user1Liked: false });
        } else {
          await like.update({ user2Liked: false });
        }
        removedCount++;
        console.log(`✅ Removed like for profile ID: ${like.user1Id === adminProfile.id ? like.user2Id : like.user1Id}`);
      } catch (error) {
        console.error(`❌ Failed to remove like:`, error.message);
      }
    }

    console.log(`\n📈 Removal Summary:`);
    console.log(`   ✅ Successfully removed: ${removedCount} likes`);
    console.log(`   ❌ Failed removals: ${adminLikes.length - removedCount}`);
    console.log(`   📊 Total likes processed: ${adminLikes.length}`);

    if (removedCount > 0) {
      console.log(`\n🎉 Successfully removed ${removedCount} likes made by admin!`);
      console.log('💡 Admin can now like these profiles again.');
    }

  } catch (error) {
    console.error('❌ Error removing admin likes:', error);
    process.exit(1);
  }
};

removeAdminLikes(); 