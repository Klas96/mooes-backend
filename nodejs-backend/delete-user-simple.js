const db = require('./models');
const { User, UserProfile } = db;

async function deleteUserAccount(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find the user with their profile
    const user = await User.findOne({
      where: { email: email },
      include: [
        { model: UserProfile, as: 'profile' }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`📊 User data to be deleted:`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Profile ID: ${user.profile?.id || 'None'}`);

    // Delete the user (this will cascade delete the profile)
    await user.destroy();
    
    console.log('✅ User account and profile deleted successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error deleting user account:', error);
    return false;
  }
}

// Main execution
async function main() {
  const email = 'mooves@klasholmgren.se';
  
  try {
    console.log('🚀 Starting user account deletion...');
    
    // Delete the user account
    const success = await deleteUserAccount(email);
    
    if (success) {
      console.log('🎉 User account deletion completed successfully!');
    } else {
      console.log('❌ User account deletion failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 