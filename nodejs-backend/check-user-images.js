// Set the database URL for the script
// Load environment variables from .env-config.yaml
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment config
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

async function checkUserImages() {
  try {
    console.log('Checking user images...');
    
    // List all users first
    const allUsers = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email']
    });
    
    console.log(`\nFound ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}`);
    });
    
    // Try to find user by different possible emails
    const possibleEmails = [
      'klas0holmgren@gmail.com',
      'admin@klasholmgren.se',
      'klas@klasholmgren.se'
    ];
    
    let user = null;
    let foundEmail = null;
    
    for (const email of possibleEmails) {
      user = await User.findOne({
        where: { email: email }
      });
      if (user) {
        foundEmail = email;
        break;
      }
    }
    
    if (!user) {
      console.log('\n❌ User not found with any of these emails:');
      possibleEmails.forEach(email => console.log(`  - ${email}`));
      return;
    }
    
    console.log(`\n✅ User found: ${user.firstName} ${user.lastName} (${foundEmail}) - ID: ${user.id}`);
    
    // Get user's profile
    const profile = await UserProfile.findOne({
      where: { userId: user.id }
    });
    
    if (profile) {
      console.log(`Profile found: ${profile.id}`);
      console.log(`Profile picture: ${profile.profilePicture}`);
    } else {
      console.log('No profile found');
    }
    
    // Get user's images
    const images = await Image.findAll({
      where: { userId: user.id },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    
    console.log(`\nFound ${images.length} images:`);
    images.forEach((image, index) => {
      console.log(`${index + 1}. ID: ${image.id}`);
      console.log(`   URL: ${image.imageUrl}`);
      console.log(`   Is Primary: ${image.isPrimary}`);
      console.log(`   Order: ${image.order}`);
      console.log(`   Created: ${image.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserImages(); 