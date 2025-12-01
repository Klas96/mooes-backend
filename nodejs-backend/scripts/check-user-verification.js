// Load DATABASE_URL from .env-config.yaml if not set
const fs = require('fs');
const path = require('path');
if (!process.env.DATABASE_URL) {
  const yamlPath = path.join(__dirname, '../../.env-config.yaml');
  console.log('Checking for config file at:', yamlPath);
  if (fs.existsSync(yamlPath)) {
    console.log('.env-config.yaml found!');
    const yaml = fs.readFileSync(yamlPath, 'utf8');
    const match = yaml.match(/url:\s*([^\n]+)/);
    if (match) {
      process.env.DATABASE_URL = match[1];
      console.log('Loaded DATABASE_URL from .env-config.yaml');
    } else {
      console.error('DATABASE_URL not found in .env-config.yaml');
      process.exit(1);
    }
  } else {
    console.error('.env-config.yaml not found at', yamlPath);
    process.exit(1);
  }
}

const { User } = require('../models');

async function checkUserVerification() {
  try {
    const email = 'klas0holmgren@gmail.com';
    console.log(`Checking user: ${email}`);
    
    const user = await User.findOne({ 
      where: { email: email },
      attributes: ['id', 'firstName', 'lastName', 'email', 'emailVerified', 'emailVerificationToken', 'emailVerificationExpiry']
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Email Verified: ${user.emailVerified}`);
      console.log(`  Verification Token: ${user.emailVerificationToken ? 'exists' : 'null'}`);
      console.log(`  Verification Expiry: ${user.emailVerificationExpiry}`);
      
      if (!user.emailVerified) {
        console.log('\n❌ User is NOT verified. This is why you\'re being redirected to verification.');
      } else {
        console.log('\n✅ User IS verified. The issue might be in the frontend or backend response.');
      }
    } else {
      console.log('❌ User not found in database');
    }
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    process.exit(0);
  }
}

checkUserVerification(); 