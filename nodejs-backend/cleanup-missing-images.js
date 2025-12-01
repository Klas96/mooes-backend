require('dotenv').config({ path: '../.env' });
const { Image, sequelize } = require('./models');
const fs = require('fs');
const path = require('path');

async function cleanupMissingImages() {
  try {
    console.log('🧹 Cleaning up missing local image files...\n');
    
    // Get all images that are using local storage
    const localImages = await Image.findAll({
      where: {
        imageUrl: {
          [require('sequelize').Op.like]: '/uploads/%'
        }
      }
    });
    
    console.log(`📊 Found ${localImages.length} images using local storage`);
    
    if (localImages.length === 0) {
      console.log('✅ No local images to clean up');
      return;
    }
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const image of localImages) {
      try {
        // Extract filename from URL
        const filename = image.imageUrl.replace('/uploads/', '');
        const localPath = path.join(__dirname, '..', 'uploads', filename);
        
        // Check if local file exists
        if (fs.existsSync(localPath)) {
          console.log(`✅ Keeping image ID ${image.id}: File exists at ${localPath}`);
          keptCount++;
        } else {
          console.log(`🗑️  Deleting image ID ${image.id}: File missing at ${localPath}`);
          
          // Check if this is the only image for the user
          const userImageCount = await Image.count({
            where: { userId: image.userId }
          });
          
          if (userImageCount <= 1) {
            console.log(`⚠️  Skipping deletion: This is the only image for user ${image.userId}`);
            keptCount++;
          } else {
            // Delete the database record
            await image.destroy();
            console.log(`✅ Deleted image ID ${image.id} from database`);
            deletedCount++;
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing image ID ${image.id}:`, error.message);
        keptCount++;
      }
    }
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Kept: ${keptCount} images`);
    console.log(`🗑️  Deleted: ${deletedCount} images`);
    console.log(`📁 Total processed: ${localImages.length} images`);
    
    if (deletedCount > 0) {
      console.log('\n🎉 Cleanup completed! Missing image records have been removed.');
      console.log('💡 Users will need to re-upload their profile pictures.');
    } else {
      console.log('\n✅ No cleanup needed - all local files exist or are protected.');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

cleanupMissingImages(); 