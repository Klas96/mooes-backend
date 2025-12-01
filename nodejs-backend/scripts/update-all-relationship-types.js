const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateAllRelationshipTypes() {
  try {
    console.log('🔄 Starting relationship type update...');
    
    // Check current relationship types
    const beforeResult = await pool.query('SELECT id, "userId", "relationshipType" FROM "UserProfiles" ORDER BY id');
    console.log('\n📊 Current relationship types:');
    beforeResult.rows.forEach(row => {
      console.log(`User ${row.id} (UserID: ${row.userId}): ${row.relationshipType}`);
    });
    
    // Count users with different relationship types
    const countResult = await pool.query('SELECT "relationshipType", COUNT(*) as count FROM "UserProfiles" GROUP BY "relationshipType"');
    console.log('\n📈 Relationship type distribution:');
    countResult.rows.forEach(row => {
      console.log(`${row.relationshipType}: ${row.count} users`);
    });
    
    // All relationship categories
    const allCategories = ['C', 'S', 'F', 'B']; // Casual, Serious, Friendship, Business
    const allCategoriesString = allCategories.join(',');
    
    console.log(`\n🎯 Updating all users to have all categories: ${allCategoriesString}`);
    
    // Update all users to have all categories
    const updateResult = await pool.query(
      'UPDATE "UserProfiles" SET "relationshipType" = $1, "updatedAt" = NOW()',
      [allCategoriesString]
    );
    
    console.log(`✅ Successfully updated ${updateResult.rowCount} users!`);
    
    // Verify the update
    const verifyResult = await pool.query('SELECT id, "userId", "relationshipType" FROM "UserProfiles" ORDER BY id LIMIT 5');
    console.log('\n🔍 Verification - First 5 users after update:');
    verifyResult.rows.forEach(row => {
      console.log(`User ${row.id} (UserID: ${row.userId}): ${row.relationshipType}`);
    });
    
    // Final count
    const finalCountResult = await pool.query('SELECT "relationshipType", COUNT(*) as count FROM "UserProfiles" GROUP BY "relationshipType"');
    console.log('\n📊 Final relationship type distribution:');
    finalCountResult.rows.forEach(row => {
      console.log(`${row.relationshipType}: ${row.count} users`);
    });
    
    console.log('\n🎉 All users now have all relationship categories active!');
    console.log('Categories: Casual (C), Serious (S), Friendship (F), Business (B)');
    
  } catch (error) {
    console.error('❌ Error updating relationship types:', error);
  } finally {
    await pool.end();
  }
}

// Run the update
updateAllRelationshipTypes()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }); 