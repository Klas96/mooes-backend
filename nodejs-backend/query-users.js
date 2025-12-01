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

async function queryUsers() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all users with detailed information
    const users = await sequelize.query(`
      SELECT 
        u.id,
        u.email,
        u."firstName",
        u."lastName",
        u."emailVerified",
        u."isPremium",
        u."premiumExpiry",
        u."isActive",
        u."lastLogin",
        u."createdAt",
        u."updatedAt",
        up.id as profile_id,
        up.bio,
        up."birthDate",
        up.gender,
        up."genderPreference",
        up."relationshipType",
        up.location,
        up."locationMode"
      FROM "Users" u
      LEFT JOIN "UserProfiles" up ON u.id = up."userId"
      ORDER BY u."createdAt" DESC
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Found ${users.length} user(s) in database:`);
    console.log('=' .repeat(80));

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Premium: ${user.isPremium ? '✅ Yes' : '❌ No'}`);
      if (user.premiumExpiry) {
        console.log(`   Premium Expiry: ${user.premiumExpiry}`);
      }
      console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Updated: ${user.updatedAt}`);
      
      if (user.profile_id) {
        console.log(`\n   📋 Profile Information:`);
        console.log(`   Profile ID: ${user.profile_id}`);
        console.log(`   Bio: ${user.bio || 'Not set'}`);
        console.log(`   Birth Date: ${user.birthDate || 'Not set'}`);
        console.log(`   Gender: ${user.gender || 'Not set'}`);
        console.log(`   Gender Preference: ${user.genderPreference || 'Not set'}`);
        console.log(`   Relationship Type: ${user.relationshipType || 'Not set'}`);
        console.log(`   Location: ${user.location || 'Not set'}`);
        console.log(`   Location Mode: ${user.locationMode || 'Not set'}`);
      } else {
        console.log(`\n   📋 Profile: ❌ No profile created`);
      }
      
      console.log('─' .repeat(80));
    });

    // Get additional statistics
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN "emailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isPremium" = true THEN 1 END) as premium_users,
        COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_users,
        COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) as users_with_profiles
      FROM "Users" u
      LEFT JOIN "UserProfiles" up ON u.id = up."userId"
    `, { type: Sequelize.QueryTypes.SELECT });

    const stat = stats[0];
    console.log(`\n📈 Database Statistics:`);
    console.log(`   Total Users: ${stat.total_users}`);
    console.log(`   Verified Users: ${stat.verified_users}`);
    console.log(`   Premium Users: ${stat.premium_users}`);
    console.log(`   Active Users: ${stat.active_users}`);
    console.log(`   Users with Profiles: ${stat.users_with_profiles}`);

  } catch (error) {
    console.error('❌ Error querying users:', error);
  } finally {
    await sequelize.close();
  }
}

queryUsers(); 