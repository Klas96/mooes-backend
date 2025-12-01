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
const { User, Image } = require('../models');

const updatePlaceholderImages = async () => {
  try {
    console.log('🔄 Updating placeholder images to use Picsum...');

    // Get all images that are using placeholder URLs
    const placeholderImages = await Image.findAll({
      where: {
        imageUrl: {
          [require('sequelize').Op.like]: 'https://via.placeholder.com%'
        }
      },
      include: [
        {
          model: User,
          as: 'user'
        }
      ]
    });

    console.log(`📊 Found ${placeholderImages.length} placeholder images to update`);

    if (placeholderImages.length === 0) {
      console.log('✅ No placeholder images found to update');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const image of placeholderImages) {
      try {
        console.log(`\n🔄 Updating image for ${image.user.email}...`);
        
        // Use Picsum for reliable placeholder images
        const imageId = Math.floor(Math.random() * 1000); // Random image ID
        const picsumUrl = `https://picsum.photos/400/600?random=${imageId}`;
        
        // Update the database record
        await image.update({
          imageUrl: picsumUrl
        });

        console.log(`✅ Updated image URL for ${image.user.email}: ${picsumUrl}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to update image for ${image.user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Update Summary:`);
    console.log(`   ✅ Successful updates: ${successCount}`);
    console.log(`   ❌ Failed updates: ${errorCount}`);
    console.log(`   📊 Total images processed: ${placeholderImages.length}`);

    if (successCount > 0) {
      console.log(`\n🎉 Successfully updated ${successCount} placeholder images!`);
      console.log('🖼️ The images should now be visible in your app using Picsum images.');
      console.log('💡 These are random high-quality photos that should display properly.');
    }

  } catch (error) {
    console.error('❌ Error updating placeholder images:', error);
    process.exit(1);
  }
};

updatePlaceholderImages(); 