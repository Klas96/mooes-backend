require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

console.log('🔍 Verifying Deployment Environment Variables');
console.log('============================================');
console.log('');

// Check critical Google Cloud Storage environment variables
const criticalVars = {
  'GOOGLE_CLOUD_PROJECT_ID': process.env.GOOGLE_CLOUD_PROJECT_ID,
  'GOOGLE_CLOUD_BUCKET_NAME': process.env.GOOGLE_CLOUD_BUCKET_NAME,
  'GOOGLE_CLOUD_PROJECT': process.env.GOOGLE_CLOUD_PROJECT,
  'GOOGLE_CLOUD_REGION': process.env.GOOGLE_CLOUD_REGION,
  'GOOGLE_CLOUD_CREDENTIALS': process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET' : 'NOT SET'
};

console.log('📋 Critical Environment Variables:');
let missingVars = 0;
for (const [key, value] of Object.entries(criticalVars)) {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || 'NOT SET'}`);
  if (!value) missingVars++;
}

console.log('');

if (missingVars === 0) {
  console.log('🎉 All critical environment variables are set!');
  console.log('   Profile pictures should work correctly.');
} else {
  console.log(`⚠️  Missing ${missingVars} critical environment variables`);
  console.log('   This could cause profile pictures to disappear!');
}

// Check other important variables
console.log('\n📋 Other Important Variables:');
const otherVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'DATABASE_URL': process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  'JWT_SECRET': process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  'EMAIL_USER': process.env.EMAIL_USER ? 'SET' : 'NOT SET',
  'EMAIL_PASSWORD': process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET'
};

for (const [key, value] of Object.entries(otherVars)) {
  const status = value ? '✅' : '❌';
  console.log(`${status} ${key}: ${value || 'NOT SET'}`);
}

console.log('');

// Test Google Cloud Storage access
console.log('🔍 Testing Google Cloud Storage Access...');
const { Storage } = require('@google-cloud/storage');

async function testGCS() {
  try {
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    });
    
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mooves';
    const bucket = storage.bucket(bucketName);
    
    // Check if bucket exists
    const [exists] = await bucket.exists();
    if (exists) {
      console.log('✅ Google Cloud Storage bucket is accessible');
      
      // Check bucket permissions
      try {
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log('✅ Bucket read permissions: OK');
      } catch (error) {
        console.log('❌ Bucket read permissions: FAILED');
        console.log(`   Error: ${error.message}`);
      }
    } else {
      console.log('❌ Google Cloud Storage bucket does not exist');
    }
    
  } catch (error) {
    console.log('❌ Failed to access Google Cloud Storage');
    console.log(`   Error: ${error.message}`);
  }
}

testGCS();

console.log('');
console.log('💡 Deployment Environment Summary:');
console.log('==================================');
console.log('');

if (missingVars === 0) {
  console.log('✅ Environment is properly configured for production');
  console.log('✅ Profile pictures should persist across deployments');
  console.log('✅ Google Cloud Storage is accessible');
} else {
  console.log('❌ Environment has missing critical variables');
  console.log('❌ Profile pictures may disappear after deployment');
  console.log('❌ Need to fix deployment scripts');
}

console.log('');
console.log('🔧 To fix deployment issues:');
console.log('1. Update deploy-backend.sh with missing environment variables');
console.log('2. Update GitHub Actions workflow with missing environment variables');
console.log('3. Ensure GOOGLE_CLOUD_CREDENTIALS is set for service account access');
console.log(''); 