const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function removeExampleUsers() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // First, let's see what users exist
    const allUsers = await sequelize.query(`
      SELECT id, email, "firstName", "lastName", "emailVerified", "isActive"
      FROM "Users"
      ORDER BY id
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Found ${allUsers.length} total users:`);
    allUsers.forEach(user => {
      console.log(`   ${user.id}: ${user.firstName} ${user.lastName} (${user.email})`);
    });

    // Define real users to keep (your actual accounts)
    const realUsers = [
      'klas0holmgren@gmail.com',
      'admin@klasholmgren.se'
    ];

    // Find example users (those with @example.com emails)
    const exampleUsers = allUsers.filter(user => 
      user.email.includes('@example.com') && !realUsers.includes(user.email)
    );

    console.log(`\n🗑️  Found ${exampleUsers.length} example users to remove:`);
    exampleUsers.forEach(user => {
      console.log(`   ${user.id}: ${user.firstName} ${user.lastName} (${user.email})`);
    });

    if (exampleUsers.length === 0) {
      console.log('✅ No example users found to remove');
      return;
    }

    // Get user IDs to remove
    const userIdsToRemove = exampleUsers.map(user => user.id);

    console.log(`\n⚠️  About to remove ${exampleUsers.length} example users...`);
    console.log('This will also remove their profiles and related data.');
    
    // Confirm deletion
    console.log('\n🔍 Users to be removed:');
    exampleUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
    });

    // Remove related data in the correct order (due to foreign key constraints)
    
    // 1. Remove messages first
    console.log('\n🗑️  Removing messages...');
    await sequelize.query(`
      DELETE FROM "Messages" 
      WHERE "matchId" IN (
        SELECT id FROM "Matches" 
        WHERE "user1Id" IN (:userIds) OR "user2Id" IN (:userIds)
      )
    `, {
      replacements: { userIds: userIdsToRemove },
      type: Sequelize.QueryTypes.DELETE
    });

    // 2. Remove matches
    console.log('🗑️  Removing matches...');
    await sequelize.query(`
      DELETE FROM "Matches" 
      WHERE "user1Id" IN (:userIds) OR "user2Id" IN (:userIds)
    `, {
      replacements: { userIds: userIdsToRemove },
      type: Sequelize.QueryTypes.DELETE
    });

    // 3. Remove user images
    console.log('🗑️  Removing user images...');
    await sequelize.query(`
      DELETE FROM "Images" 
      WHERE "userId" IN (:userIds)
    `, {
      replacements: { userIds: userIdsToRemove },
      type: Sequelize.QueryTypes.DELETE
    });

    // 4. Remove user profiles
    console.log('🗑️  Removing user profiles...');
    await sequelize.query(`
      DELETE FROM "UserProfiles" 
      WHERE "userId" IN (:userIds)
    `, {
      replacements: { userIds: userIdsToRemove },
      type: Sequelize.QueryTypes.DELETE
    });

    // 5. Finally remove users
    console.log('🗑️  Removing users...');
    await sequelize.query(`
      DELETE FROM "Users" 
      WHERE id IN (:userIds)
    `, {
      replacements: { userIds: userIdsToRemove },
      type: Sequelize.QueryTypes.DELETE
    });

    console.log('✅ Example users removed successfully!');

    // Show remaining users
    const remainingUsers = await sequelize.query(`
      SELECT id, email, "firstName", "lastName", "emailVerified", "isActive"
      FROM "Users"
      ORDER BY id
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Remaining users (${remainingUsers.length}):`);
    remainingUsers.forEach(user => {
      console.log(`   ${user.id}: ${user.firstName} ${user.lastName} (${user.email})`);
    });

  } catch (error) {
    console.error('❌ Error removing example users:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
removeExampleUsers(); 