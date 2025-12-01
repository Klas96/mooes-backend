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

const fixTestImagesUrls = async () => {
  try {
    console.log('🔧 Fixing test image URLs...');

    // Get all images that are using local storage (uploads path)
    const localImages = await Image.findAll({
      where: {
        imageUrl: {
          [require('sequelize').Op.like]: '/uploads/dummy-%'
        }
      },
      include: [
        {
          model: User,
          as: 'user'
        }
      ]
    });

    console.log(`📊 Found ${localImages.length} local test images to fix`);

    if (localImages.length === 0) {
      console.log('✅ No local test images found to fix');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const image of localImages) {
      try {
        console.log(`\n🔧 Fixing image for ${image.user.email}...`);
        
        // Extract the local file path
        const localFilePath = path.join(__dirname, '..', image.imageUrl);
        
        if (!fs.existsSync(localFilePath)) {
          console.log(`❌ Local file not found: ${localFilePath}`);
          errorCount++;
          continue;
        }

        // Use Picsum for reliable placeholder images
        const imageId = Math.floor(Math.random() * 1000); // Random image ID
        const placeholderUrl = `https://picsum.photos/400/600?random=${imageId}`;
        
        // Update the database record
        await image.update({
          imageUrl: placeholderUrl
        });

        console.log(`✅ Updated image URL for ${image.user.email}: ${placeholderUrl}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to update image for ${image.user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Update Summary:`);
    console.log(`   ✅ Successful updates: ${successCount}`);
    console.log(`   ❌ Failed updates: ${errorCount}`);
    console.log(`   📊 Total images processed: ${localImages.length}`);

    if (successCount > 0) {
      console.log(`\n🎉 Successfully updated ${successCount} test image URLs!`);
      console.log('🖼️ The images should now be visible in your app using Picsum images.');
      console.log('💡 These are random high-quality photos that should display properly.');
    }

  } catch (error) {
    console.error('❌ Error fixing test images:', error);
    process.exit(1);
  }
};

fixTestImagesUrls(); 