const path = require('path');
require('dotenv').config();

const checkUserIds = async () => {
  try {
    console.log('🔍 Loading database connection...');
    
    // Import models after loading environment
    const { User } = require('../nodejs-backend/models');
    
    console.log('🔍 Finding all users...');
    
    // Find all users
    const users = await User.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName', 'emailVerified'],
      order: [['id', 'ASC']]
    });

    console.log(`📧 Found ${users.length} total users`);

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log('\n📋 User IDs in database:');
    users.forEach(user => {
      console.log(`   ID: ${user.id} | Email: ${user.email} | Name: ${user.firstName} ${user.lastName} | Verified: ${user.emailVerified}`);
    });

    // Check for specific IDs mentioned in logs
    const specificIds = [21, 88];
    console.log('\n🔍 Checking for specific IDs from logs:');
    specificIds.forEach(id => {
      const user = users.find(u => u.id === id);
      if (user) {
        console.log(`   ✅ ID ${id} exists: ${user.email}`);
      } else {
        console.log(`   ❌ ID ${id} NOT FOUND in database`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking user IDs:', error);
  } finally {
    process.exit(0);
  }
};

checkUserIds(); 