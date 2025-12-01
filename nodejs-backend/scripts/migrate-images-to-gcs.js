require('dotenv').config({ path: '../.env' });
const { Image } = require('../models');
const GoogleStorageService = require('../services/googleStorageService');
const fs = require('fs');
const path = require('path');

async function migrateImagesToGCS() {
  try {
    console.log('🔄 Starting image migration to Google Cloud Storage...');
    
    // Check if Google Cloud Storage is configured
    if (!GoogleStorageService.isConfigured()) {
      console.log('❌ Google Cloud Storage is not configured. Please set up the environment variables first.');
      return;
    }
    
    // Get all images that are still using local storage
    const localImages = await Image.findAll({
      where: {
        imageUrl: {
          [require('sequelize').Op.like]: '/uploads/%'
        }
      }
    });
    
    console.log(`📊 Found ${localImages.length} images to migrate`);
    
    if (localImages.length === 0) {
      console.log('✅ No images to migrate - all images are already using Google Cloud Storage');
      return;
    }
    
    const googleStorage = new GoogleStorageService();
    let successCount = 0;
    let errorCount = 0;
    
    for (const image of localImages) {
      try {
        console.log(`🔄 Migrating image ID ${image.id}: ${image.imageUrl}`);
        
        // Extract filename from URL
        const filename = image.imageUrl.replace('/uploads/', '');
        const localPath = path.join(__dirname, '..', 'uploads', filename);
        
        // Check if local file exists
        if (!fs.existsSync(localPath)) {
          console.log(`⚠️  Local file not found: ${localPath}`);
          errorCount++;
          continue;
        }
        
        // Upload to Google Cloud Storage
        const uploadResult = await googleStorage.uploadImage(localPath);
        
        // Update database record
        await image.update({
          imageUrl: uploadResult.url,
          googleStorageDestination: uploadResult.destination
        });
        
        console.log(`✅ Successfully migrated image ID ${image.id} to: ${uploadResult.url}`);
        successCount++;
        
        // Delete local file after successful migration
        fs.unlinkSync(localPath);
        console.log(`🗑️  Deleted local file: ${localPath}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate image ID ${image.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} images`);
    console.log(`❌ Failed to migrate: ${errorCount} images`);
    console.log(`📁 Total processed: ${localImages.length} images`);
    
    if (successCount > 0) {
      console.log('\n🎉 Migration completed! Your images are now stored in Google Cloud Storage and will persist.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateImagesToGCS(); 