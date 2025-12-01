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

// Set Google Cloud Storage environment variables
if (config.google_cloud_storage) {
  process.env.GOOGLE_CLOUD_PROJECT_ID = config.google_cloud_storage.project_id;
  process.env.GOOGLE_CLOUD_BUCKET_NAME = config.google_cloud_storage.bucket_name;
}

// Set Google Cloud credentials
if (config.google_cloud_credentials) {
  process.env.GOOGLE_CLOUD_CREDENTIALS = JSON.stringify(config.google_cloud_credentials);
  process.env.GOOGLE_PRIVATE_KEY = config.google_cloud_credentials.private_key;
  process.env.GOOGLE_CLIENT_EMAIL = config.google_cloud_credentials.client_email;
  process.env.GOOGLE_CLIENT_ID = config.google_cloud_credentials.client_id;
  process.env.GOOGLE_AUTH_URI = config.google_cloud_credentials.auth_uri;
  process.env.GOOGLE_TOKEN_URI = config.google_cloud_credentials.token_uri;
  process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL = config.google_cloud_credentials.auth_provider_x509_cert_url;
  process.env.GOOGLE_CLIENT_X509_CERT_URL = config.google_cloud_credentials.client_x509_cert_url;
}

// Import models and services
const { User, Image } = require('../models');
const GoogleStorageService = require('../services/googleStorageService');

const uploadTestImagesToGCS = async () => {
  try {
    console.log('🔄 Uploading test images to Google Cloud Storage...');

    // Check if Google Cloud Storage is configured
    if (!GoogleStorageService.isConfigured()) {
      console.log('❌ Google Cloud Storage is not configured. Please set up the environment variables first.');
      return;
    }

    console.log('✅ Google Cloud Storage is configured');

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

    console.log(`📊 Found ${localImages.length} local test images to upload`);

    if (localImages.length === 0) {
      console.log('✅ No local test images found to upload');
      return;
    }

    const googleStorage = new GoogleStorageService();
    let successCount = 0;
    let errorCount = 0;

    for (const image of localImages) {
      try {
        console.log(`\n📤 Uploading image for ${image.user.email}...`);
        
        // Extract the local file path
        const localFilePath = path.join(__dirname, '..', image.imageUrl);
        
        if (!fs.existsSync(localFilePath)) {
          console.log(`❌ Local file not found: ${localFilePath}`);
          errorCount++;
          continue;
        }

        // Upload to Google Cloud Storage
        const uploadResult = await googleStorage.uploadImage(localFilePath, 'test-profiles');
        
        // Update the database record
        await image.update({
          imageUrl: uploadResult.url,
          googleStorageDestination: uploadResult.destination
        });

        console.log(`✅ Successfully uploaded: ${uploadResult.url}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to upload image for ${image.user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 Upload Summary:`);
    console.log(`   ✅ Successful uploads: ${successCount}`);
    console.log(`   ❌ Failed uploads: ${errorCount}`);
    console.log(`   📊 Total images processed: ${localImages.length}`);

    if (successCount > 0) {
      console.log(`\n🎉 Successfully uploaded ${successCount} test images to Google Cloud Storage!`);
      console.log('🖼️ The images should now be visible in your app.');
    }

  } catch (error) {
    console.error('❌ Error uploading test images:', error);
    process.exit(1);
  }
};

uploadTestImagesToGCS(); 