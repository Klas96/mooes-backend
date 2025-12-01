const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Load environment variables from .env-config.yaml
const envConfigPath = path.join(__dirname, '..', '..', '.env-config.yaml');
let databaseUrl;

try {
  const envConfig = yaml.load(fs.readFileSync(envConfigPath, 'utf8'));
  databaseUrl = envConfig.database.url;
  console.log('✅ Loaded database URL from .env-config.yaml');
} catch (error) {
  console.error('❌ Could not load .env-config.yaml');
  console.error('Please ensure your .env-config.yaml contains a database.url field');
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function listProfiles() {
  try {
    console.log('🔍 Connecting to Google Cloud database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    console.log('\n📊 Listing all profiles in database...\n');
    
    // Get all profiles with user information
    const profiles = await sequelize.query(`
      SELECT 
        p.id,
        p.bio,
        p.gender,
        p."genderPreference",
        p."relationshipType",
        p.location,
        p."keyWords",
        p."profilePicture",
        p."createdAt",
        p."updatedAt",
        u.id as "userId",
        u.email,
        u."firstName",
        u."lastName",
        u."createdAt" as "userCreatedAt"
      FROM "UserProfiles" p
      LEFT JOIN "Users" u ON p."userId" = u.id
      ORDER BY p."createdAt" DESC
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (profiles && profiles.length > 0) {
      console.log(`✅ Found ${profiles.length} profile(s) in database:\n`);
      
      profiles.forEach((profile, index) => {
        console.log(`📋 Profile #${index + 1}:`);
        console.log(`   ID: ${profile.id}`);
        console.log(`   User: ${profile.firstName || 'N/A'} ${profile.lastName || 'N/A'} (${profile.email})`);
        console.log(`   User ID: ${profile.userId}`);
        console.log(`   Bio: ${profile.bio || 'No bio'}`);
        console.log(`   Gender: ${profile.gender || 'N/A'}`);
        console.log(`   Gender Preference: ${profile.genderPreference || 'N/A'}`);
        console.log(`   Relationship Type: ${profile.relationshipType || 'N/A'}`);
        console.log(`   Location: ${profile.location || 'N/A'}`);
        let keywords = 'None';
        if (Array.isArray(profile.keyWords)) {
          keywords = profile.keyWords.join(', ');
        } else if (typeof profile.keyWords === 'string') {
          keywords = profile.keyWords;
        }
        console.log(`   Keywords: ${keywords}`);
        console.log(`   Profile Picture: ${profile.profilePicture || 'No picture'}`);
        console.log(`   Created: ${profile.createdAt}`);
        console.log(`   Updated: ${profile.updatedAt}`);
        console.log(''); // Empty line for readability
      });
      
      // Summary statistics
      console.log('📈 Summary Statistics:');
      const genderStats = profiles.reduce((acc, p) => {
        acc[p.gender] = (acc[p.gender] || 0) + 1;
        return acc;
      }, {});
      
      const locationStats = profiles.reduce((acc, p) => {
        acc[p.location] = (acc[p.location] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`   Total Profiles: ${profiles.length}`);
      console.log(`   Gender Distribution:`, genderStats);
      console.log(`   Top Locations:`, Object.entries(locationStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .reduce((acc, [loc, count]) => {
          acc[loc] = count;
          return acc;
        }, {}));
      
    } else {
      console.log('❌ No profiles found in database');
    }
    
  } catch (error) {
    console.error('❌ Error listing profiles:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

listProfiles(); 