#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupDatabase = async () => {
  try {
    console.log('💾 Creating Mooves Database Backup...');
    
    // Create backup directory
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `mooves-backup-${timestamp}.sql`);
    
    console.log(`📊 Database: mooves_db`);
    console.log(`🌐 Instance: mooves-db`);
    console.log(`💾 Backup file: ${backupFile}`);
    
    // Try to create a bucket for backups if it doesn't exist
    const bucketName = 'mooves-backups';
    try {
      console.log(`📦 Checking bucket ${bucketName}...`);
      execSync(`gsutil ls gs://${bucketName}`, { stdio: 'pipe' });
      console.log(`✅ Bucket ${bucketName} exists`);
    } catch (bucketError) {
      console.log(`📦 Creating bucket ${bucketName}...`);
      try {
        execSync(`gsutil mb gs://${bucketName}`, { stdio: 'inherit' });
        console.log(`✅ Bucket ${bucketName} created`);
      } catch (createError) {
        console.log(`⚠️  Could not create bucket: ${createError.message}`);
        console.log('💡 You may need to create the bucket manually in Google Cloud Console');
        return;
      }
    }
    
    // Create a unique export name
    const exportName = `backup-${Date.now()}`;
    const gcsUri = `gs://${bucketName}/${exportName}.sql`;
    
    console.log(`🔄 Exporting database to Google Cloud Storage...`);
    console.log(`📤 Destination: ${gcsUri}`);
    
    const exportCommand = `gcloud sql export sql mooves-db ${gcsUri} --database=mooves_db --offload`;
    
    try {
      execSync(exportCommand, { stdio: 'inherit' });
      console.log('✅ Export to Google Cloud Storage successful!');
      console.log(`📁 Backup available at: ${gcsUri}`);
      
      // Download the backup file locally
      console.log('📥 Downloading backup file locally...');
      execSync(`gsutil cp ${gcsUri} "${backupFile}"`, { stdio: 'inherit' });
      
      console.log(`✅ Backup downloaded to: ${backupFile}`);
      
      // Get file size
      if (fs.existsSync(backupFile)) {
        const stats = fs.statSync(backupFile);
        console.log(`📏 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      }
      
      // Create metadata file
      const metadata = {
        timestamp: new Date().toISOString(),
        database: 'mooves_db',
        instance: 'mooves-db',
        backupFile: path.basename(backupFile),
        gcsUri: gcsUri,
        method: 'google_cloud_export'
      };
      
      const metadataFile = backupFile.replace('.sql', '.json');
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      
      console.log(`📋 Metadata saved: ${metadataFile}`);
      console.log('\n✅ Mooves database backup completed successfully!');
      console.log(`📁 Local backup: ${backupFile}`);
      console.log(`☁️  Cloud backup: ${gcsUri}`);
      
    } catch (exportError) {
      console.error('❌ Export failed:', exportError.message);
      console.log('\n💡 Alternative solutions:');
      console.log('1. Use Google Cloud Console: SQL > Export');
      console.log('2. Check service account permissions');
      console.log('3. Create bucket manually: gsutil mb gs://mooves-backups');
      throw exportError;
    }
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
};

// Run the backup
backupDatabase(); 