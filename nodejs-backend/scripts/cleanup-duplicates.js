#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ScriptCleanup {
  constructor() {
    this.scriptsDir = __dirname;
    this.duplicates = {
      migration: [
        'migrate-to-gcloud.js',
        'migrate-to-gcloud-simple.js', 
        'complete-gcloud-migration.js'
      ],
      reset: [
        'reset-database.js',
        'reset-database-simple.js',
        'gcloud-reset-db.js',
        'reset-and-seed.js',
        'reset-likes.js',
        'reset-project.js'
      ],
      seed: [
        'seed-data.js',
        'seed-gcloud.js',
        'enhanced-seed-data.js',
        'clear-and-seed-gcloud.js'
      ],
      clear: [
        'clear-database.js',
        'clear-all-tables.js',
        'clear-matches.js'
      ],
      userManagement: [
        'delete-user-simple.js',
        'delete-user-account.js',
        'give-premium.js',
        'remove-user.js',
        'remove-klas-user.js'
      ],
      test: [
        'test-network.js',
        'test-db.js',
        'test-email.js',
        'test-ai-endpoint.js',
        'test-matching.js',
        'test-filtering.js',
        'test-filtering-fix.js',
        'test-routes.js',
        'test-gcloud-connection.js',
        'test-upload.js'
      ]
    };
  }

  async run() {
    const command = process.argv[2];

    console.log('🧹 Mooves Script Cleanup Tool\n');

    switch (command) {
      case 'list':
        await this.listDuplicates();
        break;
      case 'backup':
        await this.backupDuplicates();
        break;
      case 'remove':
        await this.removeDuplicates();
        break;
      case 'dry-run':
        await this.dryRun();
        break;
      default:
        this.showHelp();
    }
  }

  showHelp() {
    console.log('Usage: node cleanup-duplicates.js <command>\n');
    console.log('Commands:');
    console.log('  list       List all duplicate scripts');
    console.log('  backup     Create backup of duplicate scripts');
    console.log('  remove     Remove duplicate scripts (after backup)');
    console.log('  dry-run    Show what would be removed without doing it');
    console.log('\nExamples:');
    console.log('  node cleanup-duplicates.js list');
    console.log('  node cleanup-duplicates.js backup');
    console.log('  node cleanup-duplicates.js remove');
  }

  async listDuplicates() {
    console.log('📋 Duplicate Scripts Found:\n');

    for (const [category, files] of Object.entries(this.duplicates)) {
      console.log(`🔸 ${category.toUpperCase()}:`);
      
      for (const file of files) {
        const filePath = path.join(this.scriptsDir, file);
        const exists = fs.existsSync(filePath);
        const status = exists ? '✅' : '❌';
        const size = exists ? this.getFileSize(filePath) : 'N/A';
        
        console.log(`   ${status} ${file} (${size})`);
      }
      console.log('');
    }

    console.log('💡 These scripts are now consolidated into:');
    console.log('   • database-manager.js (migration, reset, seed, clear)');
    console.log('   • user-manager.js (user management)');
    console.log('   • test-manager.js (testing)');
  }

  async backupDuplicates() {
    const backupDir = path.join(this.scriptsDir, 'backup-duplicates');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    console.log('💾 Creating backup of duplicate scripts...\n');

    let backedUp = 0;
    let skipped = 0;

    for (const [category, files] of Object.entries(this.duplicates)) {
      const categoryDir = path.join(backupDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir);
      }

      for (const file of files) {
        const sourcePath = path.join(this.scriptsDir, file);
        const backupPath = path.join(categoryDir, file);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, backupPath);
          console.log(`✅ Backed up: ${file}`);
          backedUp++;
        } else {
          console.log(`⚠️  Skipped (not found): ${file}`);
          skipped++;
        }
      }
    }

    console.log(`\n📊 Backup Summary:`);
    console.log(`   ✅ Backed up: ${backedUp} files`);
    console.log(`   ⚠️  Skipped: ${skipped} files`);
    console.log(`   📁 Backup location: ${backupDir}`);
  }

  async removeDuplicates() {
    console.log('🗑️  Removing duplicate scripts...\n');

    let removed = 0;
    let skipped = 0;

    for (const [category, files] of Object.entries(this.duplicates)) {
      console.log(`🔸 Removing ${category} scripts:`);
      
      for (const file of files) {
        const filePath = path.join(this.scriptsDir, file);
        
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`   ✅ Removed: ${file}`);
            removed++;
          } catch (error) {
            console.log(`   ❌ Failed to remove: ${file} (${error.message})`);
            skipped++;
          }
        } else {
          console.log(`   ⚠️  Not found: ${file}`);
          skipped++;
        }
      }
      console.log('');
    }

    console.log(`📊 Removal Summary:`);
    console.log(`   ✅ Removed: ${removed} files`);
    console.log(`   ⚠️  Skipped: ${skipped} files`);
    
    if (removed > 0) {
      console.log('\n🎉 Cleanup completed!');
      console.log('💡 You can now use the consolidated scripts:');
      console.log('   • node database-manager.js --help');
      console.log('   • node user-manager.js --help');
      console.log('   • node test-manager.js --help');
    }
  }

  async dryRun() {
    console.log('🔍 Dry Run - Files that would be removed:\n');

    let totalSize = 0;
    let fileCount = 0;

    for (const [category, files] of Object.entries(this.duplicates)) {
      console.log(`🔸 ${category.toUpperCase()}:`);
      
      for (const file of files) {
        const filePath = path.join(this.scriptsDir, file);
        
        if (fs.existsSync(filePath)) {
          const size = this.getFileSize(filePath);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          fileCount++;
          
          console.log(`   🗑️  ${file} (${size})`);
        } else {
          console.log(`   ⚠️  ${file} (not found)`);
        }
      }
      console.log('');
    }

    console.log(`📊 Summary:`);
    console.log(`   📁 Files to remove: ${fileCount}`);
    console.log(`   💾 Space to free: ${this.formatBytes(totalSize)}`);
    console.log('\n💡 Run "node cleanup-duplicates.js backup" first to create a backup!');
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return this.formatBytes(stats.size);
    } catch (error) {
      return 'N/A';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run the cleanup tool
const cleanup = new ScriptCleanup();
cleanup.run().catch(console.error); 