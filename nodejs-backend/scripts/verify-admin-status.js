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

const verifyAdminStatus = async () => {
  try {
    console.log('🔍 Verifying admin@klasholmgren.se status...');

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

    // Check for likes
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
      }
    });

    // Check for dislikes
    const adminDislikes = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: adminProfile.id },
          { user2Id: adminProfile.id }
        ],
        status: 'disliked'
      }
    });

    // Check for matches
    const adminMatches = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: adminProfile.id },
          { user2Id: adminProfile.id }
        ],
        status: 'matched'
      }
    });

    console.log('\n📊 Admin Status Summary:');
    console.log(`   ❤️  Likes: ${adminLikes.length}`);
    console.log(`   👎 Dislikes: ${adminDislikes.length}`);
    console.log(`   💕 Matches: ${adminMatches.length}`);

    if (adminLikes.length === 0 && adminDislikes.length === 0) {
      console.log('\n✅ SUCCESS: Admin has no likes or dislikes!');
      console.log('🎉 Admin can now like any profile again.');
    } else {
      console.log('\n⚠️  WARNING: Admin still has some interactions:');
      if (adminLikes.length > 0) {
        console.log(`   - ${adminLikes.length} likes remaining`);
      }
      if (adminDislikes.length > 0) {
        console.log(`   - ${adminDislikes.length} dislikes remaining`);
      }
    }

    if (adminMatches.length > 0) {
      console.log(`\n💕 Note: Admin has ${adminMatches.length} active matches`);
    }

  } catch (error) {
    console.error('❌ Error verifying admin status:', error);
    process.exit(1);
  }
};

verifyAdminStatus(); 