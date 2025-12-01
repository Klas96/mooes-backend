// Check and fix GCS image URLs
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment variables from .env-config.yaml
const envConfigPath = path.join(__dirname, '..', '.env-config.yaml');
let databaseUrl;

try {
  const envConfig = yaml.load(fs.readFileSync(envConfigPath, 'utf8'));
  databaseUrl = envConfig.database.url;
  console.log('✅ Loaded database URL from .env-config.yaml');
} catch (error) {
  console.error('❌ Could not load .env-config.yaml');
  console.error('Please ensure your .env-config.yaml contains a database.url field');
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'production';

const { User, UserProfile, Image } = require('./models');
const { Storage } = require('@google-cloud/storage');

async function checkAndFixGCSImages() {
  try {
    console.log('🔍 Checking GCS images...');
    
    // Find user by email
    const user = await User.findOne({
      where: { email: 'admin@klasholmgren.se' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    
    // Get user's images
    const images = await Image.findAll({
      where: { userId: user.id },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    
    console.log(`📸 Found ${images.length} images`);
    
    if (images.length === 0) {
      console.log('❌ No images found for user');
      return;
    }
    
    // Initialize Google Storage
    const storage = new Storage({
      projectId: 'fresh-oath-337920'
    });
    const bucket = storage.bucket('mooves');
    
    for (const image of images) {
      console.log(`\n🔍 Checking image ID ${image.id}:`);
      console.log(`   Current URL: ${image.imageUrl}`);
      
      // If it's a local path, try to find it in GCS
      if (image.imageUrl.startsWith('/uploads/')) {
        const fileName = path.basename(image.imageUrl);
        console.log(`   Looking for file: ${fileName} in GCS`);
        
        try {
          // Check if file exists in GCS
          const gcsFile = bucket.file(`dating-app/${fileName}`);
          const [exists] = await gcsFile.exists();
          
          if (exists) {
            const gcsUrl = `https://storage.googleapis.com/mooves/dating-app/${fileName}`;
            console.log(`   ✅ Found in GCS: ${gcsUrl}`);
            
            // Update database with GCS URL
            await image.update({
              imageUrl: gcsUrl,
              googleStorageDestination: `dating-app/${fileName}`
            });
            
            console.log(`   📝 Updated database with GCS URL`);
          } else {
            console.log(`   ❌ File not found in GCS`);
          }
        } catch (error) {
          console.log(`   ❌ Error checking GCS: ${error.message}`);
        }
      } else if (image.imageUrl.startsWith('https://storage.googleapis.com/')) {
        console.log(`   ✅ Already a GCS URL`);
      } else {
        console.log(`   ⚠️  Unknown URL format`);
      }
    }
    
    // Update profile picture field if needed
    const profile = await UserProfile.findOne({
      where: { userId: user.id }
    });
    
    if (profile) {
      const primaryImage = images.find(img => img.isPrimary);
      if (primaryImage && primaryImage.imageUrl !== profile.profilePicture) {
        console.log(`\n📝 Updating profile picture field to: ${primaryImage.imageUrl}`);
        await profile.update({
          profilePicture: primaryImage.imageUrl
        });
      }
    }
    
    // Show final state
    const updatedImages = await Image.findAll({
      where: { userId: user.id },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    
    console.log('\n📊 Final image state:');
    updatedImages.forEach((img, index) => {
      console.log(`${index + 1}. ID: ${img.id} - Primary: ${img.isPrimary}`);
      console.log(`   URL: ${img.imageUrl}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking GCS images:', error);
  } finally {
    process.exit(0);
  }
}

checkAndFixGCSImages(); 