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
const { User, UserProfile, Match, Image } = require('../models');

const listUsers = async () => {
  try {
    console.log('📋 Listing all users...\n');

    // Get all users with their profiles
    const users = await User.findAll({
      include: [
        {
          model: UserProfile,
          as: 'profile'
        }
      ],
      order: [['id', 'ASC']]
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }

    console.log(`📊 Found ${users.length} users:\n`);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const profile = user.profile;
      
      console.log(`${i + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   📅 Created: ${user.createdAt.toLocaleDateString()}`);
      
      if (profile) {
        console.log(`   📋 Profile ID: ${profile.id}`);
        console.log(`   👤 Gender: ${profile.gender || 'Not set'}`);
        console.log(`   💕 Looking for: ${profile.genderPreference || 'Not set'}`);
        console.log(`   💬 Bio: ${profile.bio ? (profile.bio.length > 50 ? profile.bio.substring(0, 50) + '...' : profile.bio) : 'No bio'}`);
      } else {
        console.log(`   ⚠️  No profile found`);
      }

      // Get user's images count
      const images = await Image.findAll({ where: { userId: user.id } });
      console.log(`   📸 Images: ${images.length}`);

      // Get user's matches count
      let matches = [];
      if (profile?.id) {
        matches = await Match.findAll({
          where: {
            [require('sequelize').Op.or]: [
              { user1Id: profile.id },
              { user2Id: profile.id }
            ]
          }
        });
      }
      console.log(`   💕 Matches: ${matches.length}`);

      // Get likes and dislikes
      const likes = matches.filter(match => {
        if (match.user1Id === profile?.id) return match.user1Liked;
        if (match.user2Id === profile?.id) return match.user2Liked;
        return false;
      }).length;

      const dislikes = matches.filter(match => match.status === 'disliked').length;

      console.log(`   ❤️  Likes given: ${likes}`);
      console.log(`   👎 Dislikes given: ${dislikes}`);
      console.log('');
    }

    // Summary statistics
    console.log('📈 Summary Statistics:');
    console.log(`   👥 Total users: ${users.length}`);
    
    const usersWithProfiles = users.filter(u => u.profile).length;
    console.log(`   📋 Users with profiles: ${usersWithProfiles}`);
    
    const usersWithoutProfiles = users.length - usersWithProfiles;
    console.log(`   ⚠️  Users without profiles: ${usersWithoutProfiles}`);

    // Count total images
    const totalImages = await Image.count();
    console.log(`   📸 Total images: ${totalImages}`);

    // Count total matches
    const totalMatches = await Match.count();
    console.log(`   💕 Total matches: ${totalMatches}`);

  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  }
};

listUsers(); 