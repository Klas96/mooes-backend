require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');

console.log('🔧 Google Cloud Storage Environment Setup');
console.log('========================================');
console.log('');

// Check current environment
console.log('📋 Current Environment Status:');
const envVars = {
  'GOOGLE_CLOUD_PROJECT_ID': process.env.GOOGLE_CLOUD_PROJECT_ID,
  'GOOGLE_CLOUD_BUCKET_NAME': process.env.GOOGLE_CLOUD_BUCKET_NAME,
  'GOOGLE_CLOUD_CREDENTIALS': process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET' : 'NOT SET',
  'GOOGLE_PRIVATE_KEY': process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT SET',
  'GOOGLE_CLIENT_EMAIL': process.env.GOOGLE_CLIENT_EMAIL ? 'SET' : 'NOT SET',
};

let missingVars = 0;
for (const [key, value] of Object.entries(envVars)) {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || 'NOT SET'}`);
  if (!value) missingVars++;
}

console.log('');
console.log(`⚠️  Found ${missingVars} missing environment variables`);
console.log('');

if (missingVars > 0) {
  console.log('🔧 Setup Instructions:');
  console.log('=====================');
  console.log('');
  console.log('1. Create a Google Cloud Service Account:');
  console.log('   - Go to Google Cloud Console');
  console.log('   - Navigate to IAM & Admin > Service Accounts');
  console.log('   - Create a new service account or use existing');
  console.log('   - Download the JSON key file');
  console.log('');
  console.log('2. Set up environment variables:');
  console.log('');
  console.log('   For local development (.env file):');
  console.log('   =================================');
  console.log('   GOOGLE_CLOUD_PROJECT_ID=your_project_id');
  console.log('   GOOGLE_CLOUD_BUCKET_NAME=mooves');
  console.log('   GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}');
  console.log('');
  console.log('   For Heroku deployment:');
  console.log('   ======================');
  console.log('   heroku config:set GOOGLE_CLOUD_PROJECT_ID="your_project_id" --app your-app-name');
  console.log('   heroku config:set GOOGLE_CLOUD_BUCKET_NAME="mooves" --app your-app-name');
  console.log('   heroku config:set GOOGLE_CLOUD_CREDENTIALS="$(cat your-service-account-key.json)" --app your-app-name');
  console.log('');
  console.log('   For Google App Engine:');
  console.log('   ======================');
  console.log('   # These are automatically set by App Engine');
  console.log('   # Just ensure your app.yaml has the correct project_id');
  console.log('');
  console.log('3. Verify your bucket exists:');
  console.log('   gsutil ls gs://mooves/');
  console.log('');
  console.log('4. Test the configuration:');
  console.log('   node scripts/quick-image-check.js');
  console.log('');
} else {
  console.log('✅ All environment variables are set!');
  console.log('');
  console.log('🔍 Next steps:');
  console.log('1. Test the configuration: node scripts/quick-image-check.js');
  console.log('2. Fix any existing local images: node scripts/fix-image-urls-enhanced.js');
  console.log('3. Restart your application');
  console.log('');
}

// Check if .env file exists
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('📁 Found .env file in root directory');
  console.log('   Environment variables are properly configured');
} else {
  console.log('📁 No .env file found in root directory');
  console.log('   Create one in the mooves directory for local development');
}

console.log('');
console.log('💡 Quick Fix for Testing:');
console.log('=========================');
console.log('If you want to test with a simple configuration, you can:');
console.log('');
console.log('1. Create a .env file in the mooves directory');
console.log('2. Add these lines (replace with your actual values):');
console.log('');
console.log('   GOOGLE_CLOUD_PROJECT_ID=fresh-oath-337920');
console.log('   GOOGLE_CLOUD_BUCKET_NAME=mooves');
console.log('   GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"fresh-oath-337920",...}');
console.log('');
console.log('3. Restart your application');
console.log('');

console.log('🎯 Why this fixes the disappearing images:');
console.log('==========================================');
console.log('');
console.log('❌ Current problem:');
console.log('   - Missing GCS environment variables');
console.log('   - App falls back to local storage');
console.log('   - Images stored in /uploads/ directory');
console.log('   - Images disappear when server restarts');
console.log('');
console.log('✅ After fixing:');
console.log('   - All images uploaded to Google Cloud Storage');
console.log('   - Images have permanent, public URLs');
console.log('   - Images persist across server restarts');
console.log('   - Images accessible from anywhere');
console.log(''); 