require('dotenv').config({ path: '../.env' });
const { Image, sequelize } = require('./models');

async function checkImagesStatus() {
  try {
    console.log('🔍 Checking images status in database...\n');
    
    // Get all images
    const allImages = await Image.findAll({
      attributes: ['id', 'userId', 'imageUrl', 'googleStorageDestination', 'isPrimary', 'order', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Total images in database: ${allImages.length}\n`);
    
    if (allImages.length === 0) {
      console.log('✅ No images found in database');
      return;
    }
    
    // Categorize images by storage type
    const localImages = allImages.filter(img => img.imageUrl.startsWith('/uploads/'));
    const gcsImages = allImages.filter(img => img.imageUrl.startsWith('https://storage.googleapis.com/'));
    const otherImages = allImages.filter(img => 
      !img.imageUrl.startsWith('/uploads/') && 
      !img.imageUrl.startsWith('https://storage.googleapis.com/')
    );
    
    console.log('📋 Image Storage Summary:');
    console.log(`  - Local storage: ${localImages.length} images`);
    console.log(`  - Google Cloud Storage: ${gcsImages.length} images`);
    console.log(`  - Other/Unknown: ${otherImages.length} images\n`);
    
    // Check for issues
    let issuesFound = 0;
    
    // Check local images (these might be problematic)
    if (localImages.length > 0) {
      console.log('⚠️  Local storage images found (these may not be accessible):');
      localImages.forEach(img => {
        console.log(`  - ID ${img.id}: ${img.imageUrl} (User: ${img.userId})`);
        issuesFound++;
      });
      console.log();
    }
    
    // Check GCS images for accessibility
    if (gcsImages.length > 0) {
      console.log('🔍 Testing Google Cloud Storage image accessibility...');
      let accessibleCount = 0;
      let inaccessibleCount = 0;
      
      for (const img of gcsImages.slice(0, 5)) { // Test first 5 images
        try {
          const response = await fetch(img.imageUrl);
          if (response.ok) {
            accessibleCount++;
            console.log(`  ✅ ID ${img.id}: Accessible`);
          } else {
            inaccessibleCount++;
            console.log(`  ❌ ID ${img.id}: Not accessible (Status: ${response.status})`);
            issuesFound++;
          }
        } catch (error) {
          inaccessibleCount++;
          console.log(`  ❌ ID ${img.id}: Error accessing (${error.message})`);
          issuesFound++;
        }
      }
      
      if (gcsImages.length > 5) {
        console.log(`  ... and ${gcsImages.length - 5} more GCS images`);
      }
      
      console.log(`\n📊 GCS Accessibility: ${accessibleCount} accessible, ${inaccessibleCount} inaccessible\n`);
    }
    
    // Check for images without googleStorageDestination
    const imagesWithoutDestination = gcsImages.filter(img => !img.googleStorageDestination);
    if (imagesWithoutDestination.length > 0) {
      console.log('⚠️  GCS images without destination field:');
      imagesWithoutDestination.forEach(img => {
        console.log(`  - ID ${img.id}: ${img.imageUrl}`);
        issuesFound++;
      });
      console.log();
    }
    
    // Check for duplicate primary images per user
    const usersWithMultiplePrimary = {};
    allImages.forEach(img => {
      if (img.isPrimary) {
        if (!usersWithMultiplePrimary[img.userId]) {
          usersWithMultiplePrimary[img.userId] = [];
        }
        usersWithMultiplePrimary[img.userId].push(img);
      }
    });
    
    const usersWithIssues = Object.entries(usersWithMultiplePrimary)
      .filter(([userId, images]) => images.length > 1);
    
    if (usersWithIssues.length > 0) {
      console.log('⚠️  Users with multiple primary images:');
      usersWithIssues.forEach(([userId, images]) => {
        console.log(`  - User ${userId}: ${images.length} primary images`);
        images.forEach(img => {
          console.log(`    * ID ${img.id}: ${img.imageUrl}`);
        });
        issuesFound++;
      });
      console.log();
    }
    
    // Summary
    console.log('📊 Summary:');
    if (issuesFound === 0) {
      console.log('✅ No issues found! All images appear to be properly configured.');
    } else {
      console.log(`⚠️  Found ${issuesFound} potential issues that may need attention.`);
      console.log('\n💡 Recommendations:');
      
      if (localImages.length > 0) {
        console.log('  - Run image migration script to move local images to Google Cloud Storage');
      }
      
      if (imagesWithoutDestination.length > 0) {
        console.log('  - Update GCS images to include googleStorageDestination field');
      }
      
      if (usersWithIssues.length > 0) {
        console.log('  - Fix users with multiple primary images');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking images status:', error);
  } finally {
    await sequelize.close();
  }
}

checkImagesStatus(); 