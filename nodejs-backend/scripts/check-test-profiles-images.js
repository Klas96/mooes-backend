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

// Import models after loading .env
const { User, UserProfile, Image } = require('../models');

const checkTestProfilesImages = async () => {
  try {
    console.log('🔍 Checking test profiles for images...');

    // Get all users with their profiles and images
    const users = await User.findAll({
      include: [
        {
          model: UserProfile,
          as: 'profile'
        },
        {
          model: Image,
          as: 'images'
        }
      ]
    });

    console.log(`\n📊 Found ${users.length} total users`);
    
    let usersWithImages = 0;
    let usersWithoutImages = 0;

    for (const user of users) {
      const hasImages = user.images && user.images.length > 0;
      const imageCount = hasImages ? user.images.length : 0;
      
      if (hasImages) {
        usersWithImages++;
        console.log(`✅ ${user.email} - ${imageCount} image(s)`);
        user.images.forEach((image, index) => {
          console.log(`   ${index + 1}. ${image.imageUrl} (Primary: ${image.isPrimary})`);
        });
      } else {
        usersWithoutImages++;
        console.log(`❌ ${user.email} - No images`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Users with images: ${usersWithImages}`);
    console.log(`   Users without images: ${usersWithoutImages}`);
    console.log(`   Total users: ${users.length}`);

    if (usersWithoutImages > 0) {
      console.log(`\n💡 To add images to profiles without images, run:`);
      console.log(`   ./nodejs-backend/scripts/add-dummy-profiles.js --local-images`);
    }

  } catch (error) {
    console.error('❌ Error checking profiles:', error);
    process.exit(1);
  }
};

checkTestProfilesImages(); 