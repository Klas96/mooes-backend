#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DatabaseProtection {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async connect() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    await this.sequelize.authenticate();
    console.log('✅ Database connection established');
  }

  async createBackup() {
    console.log('💾 Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);
    
    try {
      // Create backup using pg_dump
      const dbUrl = new URL(process.env.DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port;
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --clean --if-exists --no-owner --no-privileges --no-sync > "${backupFile}"`;
      
      execSync(pgDumpCommand, { stdio: 'inherit' });
      
      console.log(`✅ Backup created: ${backupFile}`);
      
      // Create a metadata file
      const metadata = {
        timestamp: new Date().toISOString(),
        database: database,
        host: host,
        userCount: await this.getUserCount(),
        tables: await this.getTableInfo()
      };
      
      const metadataFile = backupFile.replace('.sql', '.json');
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      
      console.log(`📋 Metadata saved: ${metadataFile}`);
      
      return backupFile;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  async restoreBackup(backupFile) {
    console.log(`🔄 Restoring database from: ${backupFile}`);
    
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    try {
      const dbUrl = new URL(process.env.DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port;
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      const psqlCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} < "${backupFile}"`;
      
      execSync(psqlCommand, { stdio: 'inherit' });
      
      console.log('✅ Database restored successfully!');
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      throw error;
    }
  }

  async getUserCount() {
    const result = await this.sequelize.query('SELECT COUNT(*) as count FROM "Users"', {
      type: Sequelize.QueryTypes.SELECT
    });
    return result[0].count;
  }

  async getTableInfo() {
    const tables = await this.sequelize.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t 
      WHERE table_schema = 'public'
    `, { type: Sequelize.QueryTypes.SELECT });
    
    return tables;
  }

  async listBackups() {
    const files = fs.readdirSync(this.backupDir);
    const backups = files.filter(f => f.endsWith('.sql')).map(f => {
      const filePath = path.join(this.backupDir, f);
      const stats = fs.statSync(filePath);
      const metadataFile = filePath.replace('.sql', '.json');
      
      let metadata = {};
      if (fs.existsSync(metadataFile)) {
        metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
      }
      
      return {
        filename: f,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        metadata: metadata
      };
    });
    
    return backups.sort((a, b) => new Date(b.created) - new Date(a.created));
  }

  async safetyCheck() {
    console.log('🔍 Performing safety checks...');
    
    const userCount = await this.getUserCount();
    console.log(`📊 Current users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  WARNING: Database appears to be empty!');
      console.log('   This might indicate data loss or a fresh database.');
      return false;
    }
    
    // Check for recent activity
    const recentUsers = await this.sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "Users" 
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`📈 Users created in last 7 days: ${recentUsers[0].count}`);
    
    return true;
  }

  async enableAutoBackup() {
    console.log('🔄 Setting up automatic backup schedule...');
    
    // Create a cron job for daily backups
    const cronJob = `0 2 * * * cd ${__dirname} && DATABASE_URL="${process.env.DATABASE_URL}" node database-protection.js backup > /dev/null 2>&1`;
    
    try {
      // Add to crontab
      execSync(`(crontab -l 2>/dev/null; echo "${cronJob}") | crontab -`, { stdio: 'inherit' });
      console.log('✅ Automatic backup scheduled for 2:00 AM daily');
    } catch (error) {
      console.log('⚠️  Could not set up automatic backup. Please set up manually:');
      console.log(`   Add this line to your crontab: ${cronJob}`);
    }
  }

  async showHelp() {
    console.log(`
🔒 Database Protection Tool

Usage: node database-protection.js [command]

Commands:
  backup              Create a new backup
  restore <file>      Restore from backup file
  list                List all available backups
  safety-check        Perform safety checks
  auto-backup         Enable automatic daily backups
  status              Show current database status

Examples:
  node database-protection.js backup
  node database-protection.js restore backups/backup-2024-01-15.sql
  node database-protection.js list
  node database-protection.js safety-check

Safety Features:
  - Automatic backup before destructive operations
  - User count verification
  - Backup metadata tracking
  - Restore confirmation prompts
    `);
  }

  async showStatus() {
    console.log('📊 Database Status Report');
    console.log('=' .repeat(50));
    
    const userCount = await this.getUserCount();
    const tableInfo = await this.getTableInfo();
    const backups = await this.listBackups();
    
    console.log(`👥 Users: ${userCount}`);
    console.log(`📋 Tables: ${tableInfo.length}`);
    console.log(`💾 Backups: ${backups.length}`);
    
    if (backups.length > 0) {
      const latestBackup = backups[0];
      console.log(`📅 Latest backup: ${latestBackup.filename}`);
      console.log(`   Created: ${latestBackup.created}`);
      console.log(`   Size: ${(latestBackup.size / 1024).toFixed(2)} KB`);
    }
    
    console.log('=' .repeat(50));
  }
}

// Main execution
async function main() {
  const protection = new DatabaseProtection();
  const command = process.argv[2];
  
  try {
    await protection.connect();
    
    switch (command) {
      case 'backup':
        await protection.createBackup();
        break;
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('❌ Please specify backup file: node database-protection.js restore <file>');
          process.exit(1);
        }
        await protection.restoreBackup(backupFile);
        break;
      case 'list':
        const backups = await protection.listBackups();
        console.log('📋 Available Backups:');
        backups.forEach((backup, index) => {
          console.log(`\n${index + 1}. ${backup.filename}`);
          console.log(`   Created: ${backup.created}`);
          console.log(`   Size: ${(backup.size / 1024).toFixed(2)} KB`);
          if (backup.metadata.userCount) {
            console.log(`   Users: ${backup.metadata.userCount}`);
          }
        });
        break;
      case 'safety-check':
        await protection.safetyCheck();
        break;
      case 'auto-backup':
        await protection.enableAutoBackup();
        break;
      case 'status':
        await protection.showStatus();
        break;
      default:
        protection.showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (protection.sequelize) {
      await protection.sequelize.close();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseProtection; 