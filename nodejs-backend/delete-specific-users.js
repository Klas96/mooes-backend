const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

const usersToDelete = [
  'nallenalle99@gmail.com',
  'klas0holmgren@gmail.com'
];

async function deleteUsers() {
  try {
    console.log('🚀 Starting deletion of specific users...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Print all users before deletion
    const allUsers = await sequelize.query('SELECT id, email FROM "Users" ORDER BY email', { type: Sequelize.QueryTypes.SELECT });
    console.log('\n📋 All users before deletion:');
    allUsers.forEach(u => console.log(`ID: ${u.id} | Email: '${u.email}'`));

    for (const email of usersToDelete) {
      console.log(`\n🔍 Looking for user: ${email}`);
      
      // Check if user exists
      const results = await sequelize.query(
        'SELECT id, email FROM "Users" WHERE email = ?',
        {
          replacements: [email],
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (results && results.length > 0) {
        const userId = results[0].id;
        console.log(`✅ Found user: ${email} (ID: ${userId})`);
        
        // Delete user and related data
        console.log(`🗑️  Deleting user and related data for: ${email}`);
        
        // Delete in order to respect foreign key constraints
        // Only delete from tables that exist
        try {
          await sequelize.query('DELETE FROM "Images" WHERE "userId" = ?', {
            replacements: [userId]
          });
          console.log(`   ✅ Deleted from Images`);
        } catch (error) {
          console.log(`   ⚠️  Images table not found or error: ${error.message}`);
        }
        
        try {
          await sequelize.query('DELETE FROM "Matches" WHERE "user1Id" = ? OR "user2Id" = ?', {
            replacements: [userId, userId]
          });
          console.log(`   ✅ Deleted from Matches`);
        } catch (error) {
          console.log(`   ⚠️  Matches table not found or error: ${error.message}`);
        }
        
        await sequelize.query('DELETE FROM "Users" WHERE id = ?', {
          replacements: [userId]
        });
        
        console.log(`✅ Successfully deleted user: ${email}`);
      } else {
        console.log(`⚠️  User not found: ${email}`);
      }
    }
    
    console.log('✅ User deletion process completed');
    
  } catch (error) {
    console.error('❌ Error during user deletion:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

deleteUsers(); 