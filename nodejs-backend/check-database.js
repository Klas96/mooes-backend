const { Sequelize } = require('sequelize');
const path = require('path');

// Load environment variables from the parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection and schema...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Show connection details
    console.log('\n📊 Database Connection Details:');
    console.log('Host:', sequelize.config.host);
    console.log('Port:', sequelize.config.port);
    console.log('Database:', sequelize.config.database);
    console.log('Username:', sequelize.config.username);
    
    // Check if tables exist
    console.log('\n🗄️  Checking database tables...');
    
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (tables && tables.length > 0) {
      console.log(`✅ Found ${tables.length} table(s):`);
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('❌ No tables found in database');
    }
    
    // Check Users table specifically
    console.log('\n👥 Checking Users table...');
    try {
      const [userCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM "Users"',
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`✅ Users table exists with ${userCount.count} user(s)`);
      
      if (userCount.count > 0) {
        const users = await sequelize.query(
          'SELECT id, email, "firstName", "lastName" FROM "Users" ORDER BY "createdAt" DESC LIMIT 10',
          { type: Sequelize.QueryTypes.SELECT }
        );
        console.log('📋 Recent users:');
        users.forEach(user => {
          console.log(`   - ${user.email} (${user.firstName || 'N/A'} ${user.lastName || 'N/A'})`);
        });
      }
    } catch (error) {
      console.log('❌ Users table does not exist or has issues:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

checkDatabase(); 