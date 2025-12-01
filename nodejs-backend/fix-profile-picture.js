// Fix profile picture for user
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

async function fixProfilePicture() {
  try {
    console.log('🔧 Fixing profile picture...');
    
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
    
    // Set the first image as primary
    const firstImage = images[0];
    console.log(`🖼️  Setting image ID ${firstImage.id} as primary`);
    
    await firstImage.update({
      isPrimary: true
    });
    
    // Update profile picture field
    const profile = await UserProfile.findOne({
      where: { userId: user.id }
    });
    
    if (profile) {
      console.log(`📝 Updating profile picture field to: ${firstImage.imageUrl}`);
      await profile.update({
        profilePicture: firstImage.imageUrl
      });
    }
    
    // Verify the changes
    const updatedImages = await Image.findAll({
      where: { userId: user.id },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    
    const updatedProfile = await UserProfile.findOne({
      where: { userId: user.id }
    });
    
    console.log('\n✅ Profile picture fixed!');
    console.log(`📸 Primary image: ${updatedImages.find(img => img.isPrimary)?.imageUrl}`);
    console.log(`📝 Profile picture field: ${updatedProfile?.profilePicture}`);
    
  } catch (error) {
    console.error('❌ Error fixing profile picture:', error);
  } finally {
    process.exit(0);
  }
}

fixProfilePicture(); 