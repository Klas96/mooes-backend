const bcrypt = require('bcryptjs');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

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

console.log('Adding dummy profiles with images to database...');

// Import models after loading .env
const { User, UserProfile, Image } = require('../models');

// Function to download a random image from Picsum
async function downloadRandomImage(userName) {
  return new Promise((resolve, reject) => {
    const width = 400;
    const height = 600;
    const imageId = Math.floor(Math.random() * 1000); // Random image ID
    const url = `https://picsum.photos/${width}/${height}?random=${imageId}`;
    
    const fileName = `dummy-${userName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    const filePath = path.join(__dirname, '../uploads', fileName);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
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
        reject(new Error(`Failed to download image: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
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

const addDummyProfilesWithImages = async () => {
  try {
    console.log('🌱 Adding dummy profiles with images to database...');

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

    console.log(`📝 Adding ${newUsers.length} new dummy profiles with images...`);

    // Create users and profiles with images
    for (let i = 0; i < newUsers.length; i++) {
      const userData = newUsers[i];
      const profileData = additionalProfiles[i];
      const fullName = `${userData.firstName} ${userData.lastName}`;

      console.log(`\n👤 Creating profile for ${fullName}...`);

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

      // Download and create image for this user
      try {
        console.log(`📸 Downloading image for ${fullName}...`);
        const imageData = await downloadRandomImage(fullName);
        
        // Create image record in database
        await Image.create({
          userId: user.id,
          imageUrl: imageData.imageUrl,
          isPrimary: true, // First image is primary
          order: 0
        });

        console.log(`✅ Image created for ${fullName}: ${imageData.fileName}`);
      } catch (imageError) {
        console.error(`❌ Failed to create image for ${fullName}:`, imageError.message);
        // Continue without image if download fails
      }

      console.log(`✅ Created user: ${user.email}`);
    }

    console.log('\n🎉 Successfully added dummy profiles with images!');
    console.log(`📊 Total new profiles added: ${newUsers.length}`);
    console.log('🔑 All users have password: password123');
    console.log('📧 All emails are verified for testing');
    console.log('🖼️ Each profile has a random profile picture');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding dummy profiles:', error);
    process.exit(1);
  }
};

addDummyProfilesWithImages(); 