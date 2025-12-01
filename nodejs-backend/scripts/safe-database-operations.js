#!/usr/bin/env node

const readline = require('readline');
const { DatabaseProtection } = require('./database-protection.js');

class SafeDatabaseOperations {
  constructor() {
    this.protection = new DatabaseProtection();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async confirmAction(action, details = '') {
    console.log(`\n⚠️  WARNING: You are about to ${action}`);
    if (details) {
      console.log(`   Details: ${details}`);
    }
    
    const answer = await this.askQuestion('\nAre you sure you want to continue? (yes/no): ');
    return answer.toLowerCase() === 'yes';
  }

  async safeSyncDatabase() {
    console.log('🔄 Safe Database Sync');
    console.log('=' .repeat(40));
    
    // Check current state
    await this.protection.connect();
    const userCount = await this.protection.getUserCount();
    
    console.log(`📊 Current database state:`);
    console.log(`   Users: ${userCount}`);
    
    if (userCount > 0) {
      console.log('\n⚠️  WARNING: This will DESTROY all existing data!');
      
      const confirmed = await this.confirmAction(
        'sync database (this will DROP and RECREATE all tables)',
        `This will delete ${userCount} users and all related data`
      );
      
      if (!confirmed) {
        console.log('❌ Operation cancelled by user');
        return;
      }
      
      // Create backup before destructive operation
      console.log('\n💾 Creating backup before sync...');
      await this.protection.createBackup();
    }
    
    // Perform the sync
    console.log('\n🔄 Syncing database...');
    await this.protection.sequelize.sync({ force: true });
    console.log('✅ Database synced successfully!');
  }

  async safeResetDatabase() {
    console.log('🗄️  Safe Database Reset');
    console.log('=' .repeat(40));
    
    await this.protection.connect();
    const userCount = await this.protection.getUserCount();
    
    console.log(`📊 Current database state:`);
    console.log(`   Users: ${userCount}`);
    
    if (userCount > 0) {
      console.log('\n⚠️  WARNING: This will DESTROY all existing data!');
      
      const confirmed = await this.confirmAction(
        'reset database (this will DELETE all data and recreate tables)',
        `This will delete ${userCount} users and all related data`
      );
      
      if (!confirmed) {
        console.log('❌ Operation cancelled by user');
        return;
      }
      
      // Create backup before destructive operation
      console.log('\n💾 Creating backup before reset...');
      await this.protection.createBackup();
    }
    
    // Perform the reset
    console.log('\n🗄️  Resetting database...');
    await this.protection.sequelize.sync({ force: true });
    console.log('✅ Database reset successfully!');
  }

  async safeSeedDatabase() {
    console.log('🌱 Safe Database Seeding');
    console.log('=' .repeat(40));
    
    await this.protection.connect();
    const userCount = await this.protection.getUserCount();
    
    if (userCount > 0) {
      console.log(`⚠️  WARNING: Database already contains ${userCount} users`);
      
      const answer = await this.askQuestion(
        'Do you want to:\n' +
        '1. Clear database and seed fresh data\n' +
        '2. Add sample data to existing data\n' +
        '3. Cancel\n' +
        'Enter choice (1/2/3): '
      );
      
      if (answer === '3') {
        console.log('❌ Operation cancelled by user');
        return;
      }
      
      if (answer === '1') {
        const confirmed = await this.confirmAction(
          'clear database and seed fresh data',
          `This will delete ${userCount} existing users`
        );
        
        if (!confirmed) {
          console.log('❌ Operation cancelled by user');
          return;
        }
        
        // Create backup before clearing
        console.log('\n💾 Creating backup before clearing...');
        await this.protection.createBackup();
        
        // Clear database
        console.log('\n🗑️  Clearing database...');
        await this.protection.sequelize.sync({ force: true });
      }
    }
    
    // Seed the database
    console.log('\n🌱 Seeding database...');
    // You can add your seeding logic here
    console.log('✅ Database seeded successfully!');
  }

  async showHelp() {
    console.log(`
🛡️  Safe Database Operations

Usage: node safe-database-operations.js [command]

Commands:
  sync                Safely sync database (with backup)
  reset               Safely reset database (with backup)
  seed                Safely seed database
  status              Show database status
  backup              Create backup
  restore <file>      Restore from backup

Safety Features:
  - Automatic backup before destructive operations
  - User confirmation for dangerous operations
  - User count verification
  - Backup creation before data loss

Examples:
  node safe-database-operations.js sync
  node safe-database-operations.js reset
  node safe-database-operations.js seed
    `);
  }

  async run() {
    const command = process.argv[2];
    
    try {
      switch (command) {
        case 'sync':
          await this.safeSyncDatabase();
          break;
        case 'reset':
          await this.safeResetDatabase();
          break;
        case 'seed':
          await this.safeSeedDatabase();
          break;
        case 'status':
          await this.protection.connect();
          await this.protection.showStatus();
          break;
        case 'backup':
          await this.protection.connect();
          await this.protection.createBackup();
          break;
        case 'restore':
          const backupFile = process.argv[3];
          if (!backupFile) {
            console.error('❌ Please specify backup file');
            process.exit(1);
          }
          await this.protection.connect();
          await this.protection.restoreBackup(backupFile);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
      if (this.protection.sequelize) {
        await this.protection.sequelize.close();
      }
    }
  }
}

if (require.main === module) {
  const safeOps = new SafeDatabaseOperations();
  safeOps.run();
}

module.exports = SafeDatabaseOperations; 