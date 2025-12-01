const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

console.log('Seeding Google Cloud SQL database...');
console.log('Using DATABASE_URL from .env file');

// Import models after setting DATABASE_URL
const { User, UserProfile } = require('../models');

const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
  },
  {
    email: 'mike.johnson@example.com',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Johnson',
  },
  {
    email: 'sarah.wilson@example.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Wilson',
  },
  {
    email: 'david.brown@example.com',
    password: 'password123',
    firstName: 'David',
    lastName: 'Brown',
  },
  {
    email: 'emma.davis@example.com',
    password: 'password123',
    firstName: 'Emma',
    lastName: 'Davis',
  },
  {
    email: 'alex.taylor@example.com',
    password: 'password123',
    firstName: 'Alex',
    lastName: 'Taylor',
  },
  {
    email: 'lisa.anderson@example.com',
    password: 'password123',
    firstName: 'Lisa',
    lastName: 'Anderson',
  },
];

const sampleProfiles = [
  {
    bio: 'Adventure seeker and coffee enthusiast. Love hiking, photography, and trying new restaurants. Looking for someone to share life\'s adventures with!',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'New York, NY',
    keyWords: ['Hiking', 'Photography', 'Coffee', 'Travel', 'Cooking'],
    profilePicture: 'https://dummyimage.com/400x600/3498db/ffffff&text=John+Doe'
  },
  {
    bio: 'Creative soul who loves art, music, and meaningful conversations. Passionate about making a difference in the world. Let\'s create something beautiful together!',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Los Angeles, CA',
    keyWords: ['Art', 'Music', 'Volunteering', 'Yoga', 'Reading'],
    profilePicture: 'https://dummyimage.com/400x600/e74c3c/ffffff&text=Jane+Smith'
  },
  {
    bio: 'Tech enthusiast and fitness lover. Always learning new things and pushing my limits. Looking for someone who shares my passion for growth and adventure.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'San Francisco, CA',
    keyWords: ['Technology', 'Fitness', 'Learning', 'Gaming', 'Outdoor Sports'],
    profilePicture: 'https://dummyimage.com/400x600/2ecc71/ffffff&text=Mike+Johnson'
  },
  {
    bio: 'Nature lover and animal advocate. Enjoy quiet moments with a good book and exploring new places. Seeking a genuine connection with someone special.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Seattle, WA',
    keyWords: ['Nature', 'Animals', 'Reading', 'Travel', 'Cooking'],
    profilePicture: 'https://dummyimage.com/400x600/f39c12/ffffff&text=Sarah+Wilson'
  },
  {
    bio: 'Music producer and foodie. Love discovering new sounds and flavors. Looking for someone to share life\'s beautiful moments with.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Austin, TX',
    keyWords: ['Music', 'Food', 'Cooking', 'Travel', 'Fitness'],
    profilePicture: 'https://dummyimage.com/400x600/9b59b6/ffffff&text=David+Brown'
  },
  {
    bio: 'Yoga instructor and wellness coach. Passionate about helping others live their best lives. Seeking a partner who values health, growth, and authenticity.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Portland, OR',
    keyWords: ['Yoga', 'Wellness', 'Meditation', 'Healthy Living', 'Travel'],
    profilePicture: 'https://dummyimage.com/400x600/1abc9c/ffffff&text=Emma+Davis'
  },
  {
    bio: 'Entrepreneur and adventure seeker. Building businesses and exploring the world. Looking for someone who shares my drive and sense of adventure.',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Miami, FL',
    keyWords: ['Entrepreneurship', 'Travel', 'Fitness', 'Networking', 'Adventure'],
    profilePicture: 'https://dummyimage.com/400x600/e67e22/ffffff&text=Alex+Taylor'
  },
  {
    bio: 'Artist and creative director. Expressing myself through various forms of art. Seeking someone who appreciates creativity and deep conversations.',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Chicago, IL',
    keyWords: ['Art', 'Design', 'Creativity', 'Museums', 'Photography'],
    profilePicture: 'https://dummyimage.com/400x600/34495e/ffffff&text=Lisa+Anderson'
  },
];

const seedDatabase = async () => {
  try {
    console.log('Connected to Google Cloud SQL database');

    // Clear existing data
    await User.destroy({ where: {} });
    await UserProfile.destroy({ where: {} });
    console.log('Cleared existing data');

    // Create users and profiles
    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      const profileData = sampleProfiles[i];

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });

      // Create profile
      await UserProfile.create({
        ...profileData,
        userId: user.id
      });

      console.log(`Created user: ${user.email}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log(`Created ${sampleUsers.length} users with profiles`);
    
    // Close the connection
    const { sequelize } = require('../models');
    await sequelize.close();
    console.log('✅ Connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase(); 