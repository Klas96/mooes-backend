#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const https = require('https');

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
// ...repeat for any other env vars you need

console.log('Adding dummy profiles to database...');

// Import models after loading .env
const { User, UserProfile, Image } = require('../models');
const GoogleStorageService = require('../services/googleStorageService');

// Parse command-line flags
const useLocalImages = process.argv.includes('--local-images');
const useRandomImages = process.argv.includes('--random-images');
const removeTestProfiles = process.argv.includes('--remove-test-profiles');
const help = process.argv.includes('--help') || process.argv.includes('-h');

// Show help if requested
if (help) {
  console.log(`
Usage: node add-dummy-profiles.js [options]

Options:
  --help, -h                    Show this help message
  --local-images                Use local test images from test-profiles-images directory
  --random-images               Download random images from Picsum
  --remove-test-profiles        Remove all test profiles (users with @example.com emails)

Examples:
  node add-dummy-profiles.js                    # Add profiles without images
  node add-dummy-profiles.js --local-images     # Add profiles with local test images
  node add-dummy-profiles.js --random-images    # Add profiles with random internet images
  node add-dummy-profiles.js --remove-test-profiles  # Remove all test profiles
  node add-dummy-profiles.js --local-images --remove-test-profiles  # Remove then add with images
`);
  process.exit(0);
}

// Function to copy local image to uploads directory
function copyLocalImage(imageFileName, userName) {
  const sourcePath = path.join(__dirname, 'test-profiles-images', imageFileName);
  const fileName = `dummy-${userName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpeg`;
  const targetPath = path.join(__dirname, '../uploads', fileName);
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Copy the file
  fs.copyFileSync(sourcePath, targetPath);
  
  return {
    fileName,
    imageUrl: `/uploads/${fileName}`
  };
}

// Function to remove all test profiles
async function removeAllTestProfiles() {
  try {
    console.log('🗑️ Removing all test profiles...');
    
    // Find all users with @example.com emails
    const testUsers = await User.findAll({
      where: {
        email: {
          [require('sequelize').Op.like]: '%@example.com'
        }
      },
      include: [
        { model: UserProfile, as: 'profile' },
        { model: Image, as: 'images' }
      ]
    });

    if (testUsers.length === 0) {
      console.log('ℹ️ No test profiles found to remove');
      return;
    }

    console.log(`📝 Found ${testUsers.length} test profiles to remove`);

    // Remove associated images from uploads directory
    for (const user of testUsers) {
      if (user.images) {
        for (const image of user.images) {
          if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', image.imageUrl);
            if (fs.existsSync(imagePath)) {
              try {
                fs.unlinkSync(imagePath);
                console.log(`🗑️ Removed image file: ${image.imageUrl}`);
              } catch (error) {
                console.warn(`⚠️ Could not remove image file: ${image.imageUrl}`, error.message);
              }
            }
          }
        }
      }
    }

    // First, delete any matches involving test users
    const { Match } = require('../models');
    const testUserIds = testUsers.map(user => user.id);
    
    console.log('🗑️ Removing matches involving test users...');
    const deletedMatches = await Match.destroy({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: { [require('sequelize').Op.in]: testUserIds } },
          { user2Id: { [require('sequelize').Op.in]: testUserIds } }
        ]
      }
    });
    console.log(`🗑️ Removed ${deletedMatches} matches involving test users`);

    // Now delete users (this will cascade delete profiles and images)
    const deletedCount = await User.destroy({
      where: {
        email: {
          [require('sequelize').Op.like]: '%@example.com'
        }
      }
    });

    console.log(`✅ Successfully removed ${deletedCount} test profiles and their associated data`);
    
  } catch (error) {
    console.error('❌ Error removing test profiles:', error);
    throw error;
  }
}

// Available test images
const testImages = [
  'female28.jpeg',
  'male28.jpeg', 
  'male32.jpeg',
  'male34.jpeg',
  'female45.jpeg',
  'male46.jpeg',
  'femlae35.jpeg', // Note: typo in filename
  'female30.jpeg',
  'male45.jpeg',
  'thispersondoesnotexist.jpeg'
];

// Function to check if test images directory exists and has images
function checkTestImagesAvailability() {
  const testImagesDir = path.join(__dirname, 'test-profiles-images');
  if (!fs.existsSync(testImagesDir)) {
    console.warn('⚠️ Test images directory not found:', testImagesDir);
    console.log('📁 Please ensure the test-profiles-images directory exists with test images');
    return false;
  }
  
  const availableImages = fs.readdirSync(testImagesDir).filter(file => 
    file.match(/\.(jpg|jpeg|png|gif)$/i)
  );
  
  if (availableImages.length === 0) {
    console.warn('⚠️ No image files found in test-profiles-images directory');
    return false;
  }
  
  console.log(`📸 Found ${availableImages.length} test images available`);
  return true;
}

// Additional diverse dummy profiles
const additionalUsers = [
  {
    email: 'maria.garcia@example.com',
    password: 'password123',
    firstName: 'Maria',
    lastName: 'Garcia',
  },
  {
    email: 'james.wilson@example.com',
    password: 'password123',
    firstName: 'James',
    lastName: 'Wilson',
  },
  {
    email: 'sophia.chen@example.com',
    password: 'password123',
    firstName: 'Sophia',
    lastName: 'Chen',
  },
  {
    email: 'michael.rodriguez@example.com',
    password: 'password123',
    firstName: 'Michael',
    lastName: 'Rodriguez',
  },
  {
    email: 'olivia.thompson@example.com',
    password: 'password123',
    firstName: 'Olivia',
    lastName: 'Thompson',
  },
  {
    email: 'william.lee@example.com',
    password: 'password123',
    firstName: 'William',
    lastName: 'Lee',
  },
  {
    email: 'ava.martinez@example.com',
    password: 'password123',
    firstName: 'Ava',
    lastName: 'Martinez',
  },
  {
    email: 'benjamin.anderson@example.com',
    password: 'password123',
    firstName: 'Benjamin',
    lastName: 'Anderson',
  },
  {
    email: 'isabella.white@example.com',
    password: 'password123',
    firstName: 'Isabella',
    lastName: 'White',
  },
  {
    email: 'ethan.harris@example.com',
    password: 'password123',
    firstName: 'Ethan',
    lastName: 'Harris',
  },
  {
    email: 'mia.clark@example.com',
    password: 'password123',
    firstName: 'Mia',
    lastName: 'Clark',
  },
  {
    email: 'alexander.lewis@example.com',
    password: 'password123',
    firstName: 'Alexander',
    lastName: 'Lewis',
  },
  {
    email: 'charlotte.robinson@example.com',
    password: 'password123',
    firstName: 'Charlotte',
    lastName: 'Robinson',
  },
  {
    email: 'daniel.walker@example.com',
    password: 'password123',
    firstName: 'Daniel',
    lastName: 'Walker',
  },
  {
    email: 'amelia.young@example.com',
    password: 'password123',
    firstName: 'Amelia',
    lastName: 'Young',
  },
  {
    email: 'matthew.king@example.com',
    password: 'password123',
    firstName: 'Matthew',
    lastName: 'King',
  },
  {
    email: 'harper.wright@example.com',
    password: 'password123',
    firstName: 'Harper',
    lastName: 'Wright',
  },
  {
    email: 'andrew.lopez@example.com',
    password: 'password123',
    firstName: 'Andrew',
    lastName: 'Lopez',
  },
  {
    email: 'evelyn.hill@example.com',
    password: 'password123',
    firstName: 'Evelyn',
    lastName: 'Hill',
  },
  {
    email: 'joshua.scott@example.com',
    password: 'password123',
    firstName: 'Joshua',
    lastName: 'Scott',
  }
];

const additionalProfiles = [
  {
    bio: 'Bilingual teacher passionate about education and cultural exchange. Love cooking traditional dishes and exploring new languages.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Houston, TX',
    keyWords: ['Teaching', 'Languages', 'Cooking', 'Culture', 'Travel'],
    birthDate: '1992-05-15',
    locationMode: 'local'
  },
  {
    bio: 'Software engineer by day, musician by night. Building apps and playing guitar. Looking for someone to share both passions with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Denver, CO',
    keyWords: ['Programming', 'Music', 'Guitar', 'Technology', 'Outdoors'],
    birthDate: '1989-08-22',
    locationMode: 'local'
  },
  {
    bio: 'Data scientist and yoga enthusiast. Finding balance between logic and mindfulness. Seeking someone who values both intellect and wellness.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Boston, MA',
    keyWords: ['Data Science', 'Yoga', 'Meditation', 'Analytics', 'Wellness'],
    birthDate: '1991-03-10',
    locationMode: 'global'
  },
  {
    bio: 'Chef and food blogger. Creating culinary experiences and sharing recipes. Looking for someone to taste life\'s flavors with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'New Orleans, LA',
    keyWords: ['Cooking', 'Food', 'Blogging', 'Travel', 'Culture'],
    birthDate: '1988-11-05',
    locationMode: 'local'
  },
  {
    bio: 'Environmental scientist and nature photographer. Documenting the beauty of our planet. Seeking someone who shares my love for Earth.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Portland, OR',
    keyWords: ['Environment', 'Photography', 'Nature', 'Science', 'Conservation'],
    birthDate: '1990-07-18',
    locationMode: 'global'
  },
  {
    bio: 'Financial analyst and marathon runner. Balancing spreadsheets and finish lines. Looking for someone to run through life with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Chicago, IL',
    keyWords: ['Finance', 'Running', 'Marathons', 'Fitness', 'Analytics'],
    birthDate: '1987-12-03',
    locationMode: 'local'
  },
  {
    bio: 'Nurse and animal rescue volunteer. Caring for both humans and furry friends. Seeking someone with a big heart.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Phoenix, AZ',
    keyWords: ['Nursing', 'Animals', 'Volunteering', 'Healthcare', 'Compassion'],
    birthDate: '1993-01-25',
    locationMode: 'local'
  },
  {
    bio: 'Architect and urban planner. Designing spaces that bring people together. Looking for someone to build a future with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Atlanta, GA',
    keyWords: ['Architecture', 'Design', 'Urban Planning', 'Creativity', 'Building'],
    birthDate: '1986-09-14',
    locationMode: 'global'
  },
  {
    bio: 'Marketing director and wine enthusiast. Crafting campaigns and tasting vintages. Seeking someone to savor life\'s moments with.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Napa Valley, CA',
    keyWords: ['Marketing', 'Wine', 'Travel', 'Networking', 'Luxury'],
    birthDate: '1991-06-30',
    locationMode: 'local'
  },
  {
    bio: 'Firefighter and community volunteer. Serving others and staying active. Looking for someone who values courage and kindness.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Dallas, TX',
    keyWords: ['Firefighting', 'Community', 'Fitness', 'Service', 'Adventure'],
    birthDate: '1989-04-12',
    locationMode: 'local'
  },
  {
    bio: 'Graphic designer and street artist. Creating visual stories on walls and screens. Seeking someone who sees beauty in everything.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Brooklyn, NY',
    keyWords: ['Design', 'Art', 'Street Art', 'Creativity', 'Urban Culture'],
    birthDate: '1992-10-08',
    locationMode: 'global'
  },
  {
    bio: 'Lawyer and social justice advocate. Fighting for what\'s right and making a difference. Looking for someone with strong values.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Washington, DC',
    keyWords: ['Law', 'Justice', 'Advocacy', 'Politics', 'Reading'],
    birthDate: '1988-02-20',
    locationMode: 'local'
  },
  {
    bio: 'Doctor and humanitarian worker. Healing bodies and helping communities. Seeking someone who shares my passion for service.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Seattle, WA',
    keyWords: ['Medicine', 'Humanitarian', 'Healthcare', 'Travel', 'Service'],
    birthDate: '1987-07-07',
    locationMode: 'global'
  },
  {
    bio: 'Police officer and fitness trainer. Protecting communities and building strength. Looking for someone who values safety and health.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Las Vegas, NV',
    keyWords: ['Law Enforcement', 'Fitness', 'Training', 'Community', 'Safety'],
    birthDate: '1990-11-28',
    locationMode: 'local'
  },
  {
    bio: 'Veterinarian and animal behaviorist. Understanding and caring for all creatures. Seeking someone with a gentle heart.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'San Diego, CA',
    keyWords: ['Veterinary', 'Animals', 'Behavior', 'Science', 'Compassion'],
    birthDate: '1993-03-15',
    locationMode: 'local'
  },
  {
    bio: 'Pilot and adventure photographer. Flying high and capturing moments. Looking for someone to soar through life with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Miami, FL',
    keyWords: ['Aviation', 'Photography', 'Adventure', 'Travel', 'Flying'],
    birthDate: '1989-12-10',
    locationMode: 'global'
  },
  {
    bio: 'Journalist and documentary filmmaker. Telling stories that matter and giving voice to the voiceless.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Los Angeles, CA',
    keyWords: ['Journalism', 'Film', 'Documentary', 'Storytelling', 'Media'],
    birthDate: '1991-08-05',
    locationMode: 'global'
  },
  {
    bio: 'Mechanic and classic car enthusiast. Fixing engines and restoring beauty. Looking for someone to take life\'s journey with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Detroit, MI',
    keyWords: ['Mechanics', 'Cars', 'Restoration', 'Classic Cars', 'Engineering'],
    birthDate: '1988-05-18',
    locationMode: 'local'
  },
  {
    bio: 'Librarian and book club organizer. Curating knowledge and fostering community through literature.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Portland, ME',
    keyWords: ['Books', 'Literature', 'Community', 'Reading', 'Knowledge'],
    birthDate: '1990-09-22',
    locationMode: 'local'
  },
  {
    bio: 'Electrician and renewable energy advocate. Powering homes and promoting sustainability. Seeking someone who cares about the future.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Austin, TX',
    keyWords: ['Electricity', 'Renewable Energy', 'Sustainability', 'Technology', 'Green Living'],
    birthDate: '1987-01-30',
    locationMode: 'global'
  }
];

// Function to download a random image from Picsum
async function downloadRandomImage(userName) {
  return new Promise((resolve, reject) => {
    const width = 400;
    const height = 600;
    const imageId = Math.floor(Math.random() * 1000); // Random image ID
    
    // Try multiple image services as fallback
    const imageServices = [
      `https://picsum.photos/${width}/${height}?random=${imageId}`,
      `https://source.unsplash.com/${width}x${height}/?portrait&sig=${imageId}`,
      `https://via.placeholder.com/${width}x${height}/random?text=Profile+Image`
    ];
    
    let currentServiceIndex = 0;
    
    function tryDownload() {
      const url = imageServices[currentServiceIndex];
      console.log(`🖼️ Trying image service ${currentServiceIndex + 1}: ${url.split('?')[0]}`);
      
      const fileName = `dummy-${userName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      const filePath = path.join(__dirname, '../uploads', fileName);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const file = fs.createWriteStream(filePath);
      
      const request = https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const newUrl = response.headers.location;
          if (newUrl) {
            console.log(`🔄 Following redirect to: ${newUrl}`);
            https.get(newUrl, (redirectResponse) => {
              if (redirectResponse.statusCode === 200) {
                redirectResponse.pipe(file);
                file.on('finish', () => {
                  file.close();
                  resolve({
                    filePath,
                    fileName,
                    imageUrl: `/uploads/${fileName}`
                  });
                });
              } else {
                tryNextService();
              }
            }).on('error', (err) => {
              tryNextService();
            });
            return;
          }
        }
        
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve({
              filePath,
              fileName,
              imageUrl: `/uploads/${fileName}`
            });
          });
        } else {
          tryNextService();
        }
      });
      
      request.on('error', (err) => {
        tryNextService();
      });
      
      // Set timeout to prevent hanging
      request.setTimeout(10000, () => {
        request.destroy();
        tryNextService();
      });
    }
    
    function tryNextService() {
      currentServiceIndex++;
      if (currentServiceIndex < imageServices.length) {
        console.log(`🔄 Retrying with service ${currentServiceIndex + 1}...`);
        tryDownload();
      } else {
        reject(new Error('All image services failed'));
      }
    }
    
    tryDownload();
  });
}

const addDummyProfiles = async () => {
  try {
    // Handle remove test profiles option
    if (removeTestProfiles) {
      await removeAllTestProfiles();
      if (!useLocalImages && !useRandomImages) {
        console.log('✅ Test profiles removed successfully');
        process.exit(0);
      }
      console.log('🔄 Continuing to add new profiles...');
    }

    console.log('🌱 Adding dummy profiles to database...');

    // Check test images availability if using local images
    if (useLocalImages && !checkTestImagesAvailability()) {
      console.error('❌ Cannot proceed with local images. Please add test images to the test-profiles-images directory.');
      process.exit(1);
    }

    // Check if users already exist to avoid duplicates
    const existingEmails = await User.findAll({
      attributes: ['email']
    });
    const existingEmailSet = new Set(existingEmails.map(user => user.email));

    // Filter out users that already exist
    const newUsers = additionalUsers.filter(user => !existingEmailSet.has(user.email));

    if (newUsers.length === 0) {
      console.log('✅ All dummy profiles already exist in the database!');
      process.exit(0);
    }

    console.log(`📝 Adding ${newUsers.length} new dummy profiles...`);

    const googleStorage = new GoogleStorageService();

    // Create users and profiles
    for (let i = 0; i < newUsers.length; i++) {
      const userData = newUsers[i];
      const profileData = additionalProfiles[i];
      const fullName = `${userData.firstName} ${userData.lastName}`;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        emailVerified: true // Mark as verified for testing
      });

      // Create profile
      await UserProfile.create({
        ...profileData,
        userId: user.id
      });

      // Image logic based on flag
      let localImagePath = null;
      let localImageFileName = null;
      if (useLocalImages) {
        // Get available images from the test-profiles-images directory
        const testImagesDir = path.join(__dirname, 'test-profiles-images');
        const availableImages = fs.readdirSync(testImagesDir).filter(file => 
          file.match(/\.(jpg|jpeg|png|gif)$/i)
        );
        if (availableImages.length > 0) {
          const imageFileName = availableImages[i % availableImages.length];
          try {
            const imageData = copyLocalImage(imageFileName, fullName);
            localImagePath = path.join(__dirname, '../uploads', imageData.fileName);
            localImageFileName = imageData.fileName;
          } catch (imageError) {
            console.error(`❌ Failed to assign local image for ${fullName}:`, imageError.message);
          }
        } else {
          console.warn(`⚠️ No test images available for ${fullName}`);
        }
      } else if (useRandomImages) {
        try {
          const imageData = await downloadRandomImage(fullName);
          localImagePath = imageData.filePath;
          localImageFileName = imageData.fileName;
        } catch (imageError) {
          console.error(`❌ Failed to download random image for ${fullName}:`, imageError.message);
        }
      }
      // Upload to GCS if we have a local image
      if (localImagePath && fs.existsSync(localImagePath)) {
        try {
          const uploadResult = await googleStorage.uploadImage(localImagePath, 'dating-app');
          await Image.create({
            userId: user.id,
            imageUrl: uploadResult.url,
            googleStorageDestination: uploadResult.destination,
            isPrimary: true,
            order: 0
          });
          console.log(`✅ GCS image assigned to ${fullName}: ${uploadResult.url}`);
        } catch (gcsError) {
          console.error(`❌ Failed to upload image to GCS for ${fullName}:`, gcsError.message);
        } finally {
          // Clean up local file
          try { fs.unlinkSync(localImagePath); } catch (e) {}
        }
      } else if (localImagePath) {
        console.warn(`⚠️ Local image file not found for ${fullName}: ${localImagePath}`);
      } else {
        // No image assigned
        console.log(`ℹ️ No image assigned to ${fullName}`);
      }

      console.log(`✅ Created user: ${user.email}`);
    }

    console.log('\n🎉 Successfully added dummy profiles!');
    console.log(`📊 Total new profiles added: ${newUsers.length}`);
    console.log('🔑 All users have password: password123');
    console.log('📧 All emails are verified for testing');
    if (useLocalImages) {
      console.log('🖼️ Each profile has a local test image from test-profiles-images directory');
    } else if (useRandomImages) {
      console.log('🖼️ Each profile has a random internet image from Picsum');
    } else {
      console.log('🖼️ No images assigned to profiles');
    }
    
    console.log('\n💡 Usage tips:');
    console.log('   • Use --help to see all options');
    console.log('   • Use --remove-test-profiles to clean up test data');
    console.log('   • Use --local-images to assign test images from test-profiles-images/');
    console.log('   • Use --random-images to download random images from the internet');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding dummy profiles:', error);
    process.exit(1);
  }
};

addDummyProfiles(); 