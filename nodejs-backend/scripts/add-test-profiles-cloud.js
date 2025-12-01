#!/usr/bin/env node

const bcrypt = require('bcryptjs');
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

// Import models
const { User, UserProfile } = require('../models');

const testUsers = [
  {
    email: 'test1@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User1',
  },
  {
    email: 'test2@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User2',
  },
  {
    email: 'test3@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User3',
  },
];

const testProfiles = [
  {
    bio: 'Test user for development. Love testing apps and finding bugs!',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Test City, TS',
    keyWords: ['Testing', 'Development', 'Apps'],
    birthDate: '1990-01-01',
    locationMode: 'local'
  },
  {
    bio: 'Another test user for development. Passionate about quality assurance!',
    gender: 'F',
    genderPreference: 'M',
    relationshipType: 'C',
    location: 'Test City, TS',
    keyWords: ['QA', 'Testing', 'Quality'],
    birthDate: '1992-05-15',
    locationMode: 'local'
  },
  {
    bio: 'Third test user for development. Always ready to test new features!',
    gender: 'M',
    genderPreference: 'W',
    relationshipType: 'C',
    location: 'Test City, TS',
    keyWords: ['Features', 'Testing', 'Development'],
    birthDate: '1988-12-10',
    locationMode: 'local'
  },
];

const addTestProfiles = async () => {
  try {
    console.log('🌱 Adding test profiles to cloud database...');

    // Check if users already exist to avoid duplicates
    const existingEmails = await User.findAll({
      attributes: ['email']
    });
    const existingEmailSet = new Set(existingEmails.map(user => user.email));

    // Filter out users that already exist
    const newUsers = testUsers.filter(user => !existingEmailSet.has(user.email));

    if (newUsers.length === 0) {
      console.log('✅ All test profiles already exist in the database!');
      process.exit(0);
    }

    console.log(`📝 Adding ${newUsers.length} new test profiles...`);

    // Create users and profiles
    for (let i = 0; i < newUsers.length; i++) {
      const userData = newUsers[i];
      const profileData = testProfiles[i];
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

      console.log(`✅ Created user: ${user.email}`);
    }

    console.log('\n🎉 Successfully added test profiles!');
    console.log(`📊 Total new profiles added: ${newUsers.length}`);
    console.log('🔑 All users have password: password123');
    console.log('📧 All emails are verified for testing');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test profiles:', error);
    process.exit(1);
  }
};

addTestProfiles(); 