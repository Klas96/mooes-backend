#!/usr/bin/env node

const { execSync } = require('child_process');
require('dotenv').config();

async function addSampleData() {
  console.log('📝 Adding sample data to database...');
  
  try {
    // Run the seed script
    console.log('🌱 Running seed script...');
    execSync('npm run seed', { stdio: 'inherit' });
    
    console.log('✅ Sample data added successfully!');
    console.log('📋 Database now contains sample users and data for testing.');
    
  } catch (error) {
    console.error('❌ Failed to add sample data:', error.message);
    process.exit(1);
  }
}

addSampleData(); 