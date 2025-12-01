#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

console.log('🔍 Verifying dummy profiles in database...');

// Import models after loading environment
const { sequelize, User, UserProfile } = require('../models');

const verifyProfiles = async () => {
  try {
    console.log('🔍 Checking database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get counts
    const userCount = await User.count();
    const profileCount = await UserProfile.count();
    
    console.log('\n📊 Database Summary:');
    console.log(`  Users: ${userCount}`);
    console.log(`  UserProfiles: ${profileCount}`);

    if (userCount === 0) {
      console.log('❌ No users found in database!');
      process.exit(1);
    }

    // Get sample users with their profiles
    const usersWithProfiles = await User.findAll({
      include: [{
        model: UserProfile,
        as: 'profile',
        attributes: ['bio', 'gender', 'genderPreference', 'relationshipType', 'location', 'locationMode']
      }],
      attributes: ['id', 'email', 'firstName', 'lastName', 'emailVerified'],
      limit: 5
    });

    console.log('\n👥 Sample Users:');
    usersWithProfiles.forEach((user, index) => {
      const profile = user.profile;
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   📧 Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
      console.log(`   👤 Gender: ${profile.gender} | Preference: ${profile.genderPreference}`);
      console.log(`   💕 Relationship: ${profile.relationshipType}`);
      console.log(`   📍 Location: ${profile.location} (${profile.locationMode})`);
      console.log(`   📝 Bio: ${profile.bio.substring(0, 60)}...`);
    });

    // Check gender distribution
    const genderStats = await UserProfile.findAll({
      attributes: ['gender'],
      raw: true
    });

    const maleCount = genderStats.filter(p => p.gender === 'M').length;
    const femaleCount = genderStats.filter(p => p.gender === 'F').length;

    console.log('\n📈 Gender Distribution:');
    console.log(`  Male: ${maleCount}`);
    console.log(`  Female: ${femaleCount}`);

    // Check location mode distribution
    const locationStats = await UserProfile.findAll({
      attributes: ['locationMode'],
      raw: true
    });

    const localCount = locationStats.filter(p => p.locationMode === 'local').length;
    const globalCount = locationStats.filter(p => p.locationMode === 'global').length;

    console.log('\n🌍 Location Mode Distribution:');
    console.log(`  Local: ${localCount}`);
    console.log(`  Global: ${globalCount}`);

    // Check unique locations
    const locations = await UserProfile.findAll({
      attributes: ['location'],
      raw: true
    });

    const uniqueLocations = [...new Set(locations.map(p => p.location))];
    console.log('\n📍 Unique Locations:');
    uniqueLocations.forEach(location => {
      const count = locations.filter(p => p.location === location).length;
      console.log(`  ${location}: ${count} users`);
    });

    console.log('\n✅ Verification completed successfully!');
    console.log('🎉 Your Google Cloud database is properly seeded with dummy profiles!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

verifyProfiles(); 