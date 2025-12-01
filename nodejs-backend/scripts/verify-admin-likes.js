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

const verifyAdminLikes = async () => {
  try {
    console.log('🔍 Verifying likes for admin@klasholmgren.se...');

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

    console.log(`\n📊 Verification Results:`);
    console.log(`Total likes by admin: ${adminLikes.length}`);

    if (adminLikes.length === 0) {
      console.log('✅ SUCCESS: Admin has no likes!');
      console.log('🎉 The admin user can now like profiles again.');
    } else {
      console.log('❌ FAILED: Admin still has likes!');
      console.log('\n📋 Remaining likes:');
      for (const like of adminLikes) {
        const otherUser = like.user1Id === adminProfile.id ? like.user2 : like.user1;
        console.log(`   - ${otherUser.user.email} (Profile ID: ${otherUser.id})`);
      }
    }

    // Also check for any matches where admin is involved
    const allAdminMatches = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: adminProfile.id },
          { user2Id: adminProfile.id }
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

    console.log(`\n📊 Total matches involving admin: ${allAdminMatches.length}`);
    
    if (allAdminMatches.length > 0) {
      console.log('\n📋 All admin matches:');
      for (const match of allAdminMatches) {
        const otherUser = match.user1Id === adminProfile.id ? match.user2 : match.user1;
        const adminLiked = match.user1Id === adminProfile.id ? match.user1Liked : match.user2Liked;
        const otherLiked = match.user1Id === adminProfile.id ? match.user2Liked : match.user1Liked;
        
        console.log(`   - ${otherUser.user.email}: Admin liked=${adminLiked}, Other liked=${otherLiked}`);
      }
    }

  } catch (error) {
    console.error('❌ Error verifying admin likes:', error);
    process.exit(1);
  }
};

verifyAdminLikes(); 