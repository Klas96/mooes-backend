require('dotenv').config({ path: '.env.production' });
const { User, UserProfile } = require('../models');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Test user credentials
    const testEmail = 'test@mooves.app';
    const testPassword = 'Test1234!';
    const firstName = 'Test';
    const lastName = 'User';

    // Check if user already exists - delete and recreate to ensure fresh password hash
    const existingUser = await User.findOne({ where: { email: testEmail } });
    if (existingUser) {
      console.log('⚠️  Test user already exists! Deleting and recreating...');
      // Delete existing profile first (if exists)
      const existingProfile = await UserProfile.findOne({ where: { userId: existingUser.id } });
      if (existingProfile) {
        await existingProfile.destroy();
      }
      // Delete user
      await existingUser.destroy();
      console.log('   Old user deleted, creating new one...');
    }

    // Set plain text password - the User model's beforeSave hook will hash it
    // Create user
    const user = await User.create({
      email: testEmail,
      password: testPassword, // Plain text - hook will hash it
      firstName: firstName,
      lastName: lastName,
      emailVerified: true, // Skip email verification for test user
      isActive: true,
    });

    console.log('✅ Test user created successfully!');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${firstName} ${lastName}`);

    // Create profile
    await UserProfile.create({
      userId: user.id,
    });

    console.log('✅ User profile created!');
    console.log('\nYou can now login with:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createTestUser();

