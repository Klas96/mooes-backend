const db = require('./models');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function syncDatabase() {
  try {
    console.log('🔄 Database Sync Tool');
    console.log('=' .repeat(40));
    
    // Check current database state
    const userCount = await db.sequelize.query('SELECT COUNT(*) as count FROM "Users"', {
      type: db.sequelize.QueryTypes.SELECT
    });
    
    console.log(`📊 Current database state:`);
    console.log(`   Users: ${userCount[0].count}`);
    
    if (userCount[0].count > 0) {
      console.log('\n⚠️  WARNING: This will DESTROY all existing data!');
      console.log(`   This will delete ${userCount[0].count} users and all related data`);
      
      const answer = await askQuestion('\nAre you sure you want to continue? (yes/no): ');
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Operation cancelled by user');
        return;
      }
      
      // Create backup before destructive operation
      console.log('\n💾 Creating backup before sync...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backup-before-sync-${timestamp}.sql`;
      
      try {
        const dbUrl = new URL(process.env.DATABASE_URL);
        const host = dbUrl.hostname;
        const port = dbUrl.port;
        const database = dbUrl.pathname.slice(1);
        const username = dbUrl.username;
        const password = dbUrl.password;

        const { execSync } = require('child_process');
        const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --clean --if-exists --no-owner --no-privileges > "${backupFile}"`;
        
        execSync(pgDumpCommand, { stdio: 'inherit' });
        console.log(`✅ Backup created: ${backupFile}`);
      } catch (backupError) {
        console.log('⚠️  Warning: Could not create backup, but continuing...');
        console.log('   Error:', backupError.message);
      }
    }
    
    console.log('\n🔄 Syncing database...');
    
    // Force sync will drop and recreate all tables
    await db.sequelize.sync({ force: true });
    
    console.log('✅ Database synced successfully!');
    console.log('📋 Tables created:');
    
    // List all tables
    const tables = await db.sequelize.showAllSchemas();
    console.log(tables);
    
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  } finally {
    rl.close();
    await db.sequelize.close();
  }
}

// Run the sync
syncDatabase(); 