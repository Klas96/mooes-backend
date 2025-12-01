const path = require('path');
require('dotenv').config();

const verifySampleUsers = async () => {
  try {
    console.log('🔍 Loading database connection...');
    
    // Import models after loading environment
    const { User } = require('../nodejs-backend/models');
    
    if (!User || typeof User.findAll !== 'function') {
      console.log('❌ Database connection failed. Checking DATABASE_URL...');
      console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      return;
    }
    
    console.log('🔍 Finding sample users...');
    
    // Find all users with example.com emails
    const sampleUsers = await User.findAll({
      where: {
        email: {
          [require('sequelize').Op.like]: '%@example.com'
        }
      }
    });

    if (sampleUsers.length === 0) {
      console.log('❌ No sample users found. Please run add-sample-data.js first.');
      return;
    }

    console.log(`📧 Found ${sampleUsers.length} sample users to verify`);

    // Update all sample users to be verified
    for (const user of sampleUsers) {
      await user.update({
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpires: null
      });
      console.log(`✅ Verified: ${user.email}`);
    }

    console.log('\n🎉 All sample users have been verified!');
    console.log('📱 You can now log in with any sample account:');
    console.log('   Email: any of the sample emails (e.g., john.doe@example.com)');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error verifying sample users:', error);
  } finally {
    process.exit(0);
  }
};

verifySampleUsers(); 