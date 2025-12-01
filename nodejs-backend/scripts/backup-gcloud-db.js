#!/usr/bin/env node

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load .env-config.yaml from the root
const configPath = path.resolve(__dirname, '../../.env-config.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// Set environment variables from YAML config
if (config.database && config.database.url) {
  process.env.DATABASE_URL = config.database.url;
}
if (config.jwt && config.jwt.secret) {
  process.env.JWT_SECRET = config.jwt.secret;
}

const backupDatabase = async () => {
  try {
    console.log('💾 Creating Google Cloud Database Backup...');
    
    // Create backup directory
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `gcloud-backup-${timestamp}.sql`);
    
    // Parse database URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    const host = dbUrl.hostname;
    const port = dbUrl.port;
    const database = dbUrl.pathname.slice(1);
    const username = dbUrl.username;
    const password = dbUrl.password;

    console.log(`📊 Database: ${database}`);
    console.log(`🌐 Host: ${host}:${port}`);
    console.log(`👤 User: ${username}`);
    console.log(`💾 Backup file: ${backupFile}`);

    // Use Google Cloud SQL export instead of pg_dump
    console.log('\n🔄 Using Google Cloud SQL export...');
    
    const instanceName = 'mooves-db';
    const gcsBucket = 'mooves-backups'; // You might need to create this bucket
    
    // Create a unique export name
    const exportName = `backup-${Date.now()}`;
    
    // Try to export to Google Cloud Storage first
    try {
      console.log('📤 Attempting to export to Google Cloud Storage...');
      
      // Check if bucket exists, if not create it
      try {
        execSync(`gsutil ls gs://${gcsBucket}`, { stdio: 'pipe' });
        console.log(`✅ Bucket ${gcsBucket} exists`);
      } catch (bucketError) {
        console.log(`📦 Creating bucket ${gcsBucket}...`);
        execSync(`gsutil mb gs://${gcsBucket}`, { stdio: 'inherit' });
        console.log(`✅ Bucket ${gcsBucket} created`);
      }
      
      const gcsUri = `gs://${gcsBucket}/${exportName}.sql`;
      
      const exportCommand = `gcloud sql export sql ${instanceName} ${gcsUri} --database=${database} --offload`;
      
      console.log(`🔄 Running: ${exportCommand}`);
      execSync(exportCommand, { stdio: 'inherit' });
      
      console.log('✅ Export to Google Cloud Storage successful!');
      console.log(`📁 Backup available at: ${gcsUri}`);
      
      // Download the backup file locally
      console.log('📥 Downloading backup file locally...');
      execSync(`gsutil cp ${gcsUri} "${backupFile}"`, { stdio: 'inherit' });
      
      console.log(`✅ Backup downloaded to: ${backupFile}`);
      
    } catch (gcsError) {
      console.log('⚠️  Google Cloud Storage export failed, trying alternative method...');
      console.log('Error:', gcsError.message);
      
      // Fallback: Try to use Cloud SQL Proxy for direct connection
      console.log('\n🔄 Trying Cloud SQL Proxy method...');
      
      // Check if Cloud SQL Proxy is available
      const proxyPath = path.join(__dirname, 'cloud_sql_proxy');
      if (!fs.existsSync(proxyPath)) {
        console.log('📥 Downloading Cloud SQL Proxy...');
        execSync('wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy', { stdio: 'inherit' });
        execSync('chmod +x cloud_sql_proxy', { stdio: 'inherit' });
      }
      
      // Start Cloud SQL Proxy in background
      console.log('🔗 Starting Cloud SQL Proxy...');
      const proxyProcess = execSync(`./cloud_sql_proxy -instances=fresh-oath-337920:us-central1-c:mooves-db=tcp:5433 &`, { stdio: 'pipe' });
      
      // Wait a moment for proxy to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try pg_dump through proxy
      const proxyDumpCommand = `PGPASSWORD="${password}" pg_dump -h localhost -p 5433 -U ${username} -d ${database} --no-owner --no-privileges`;
      
      try {
        console.log('🔄 Trying pg_dump through Cloud SQL Proxy...');
        execSync(`${proxyDumpCommand} > "${backupFile}"`, { stdio: 'inherit' });
        console.log(`✅ Backup successful through Cloud SQL Proxy!`);
      } catch (proxyError) {
        console.log('❌ Cloud SQL Proxy method also failed:', proxyError.message);
        throw new Error('All backup methods failed');
      }
    }

    // Get file size
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      console.log(`📏 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    }

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      database: database,
      host: host,
      backupFile: path.basename(backupFile),
      method: 'google_cloud_export'
    };
    
    const metadataFile = backupFile.replace('.sql', '.json');
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    
    console.log(`📋 Metadata saved: ${metadataFile}`);
    console.log('\n✅ Google Cloud Database backup completed successfully!');

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    console.log('\n💡 Alternative solutions:');
    console.log('1. Use Google Cloud Console: SQL > Export');
    console.log('2. Update PostgreSQL client: sudo apt install postgresql-client-15');
    console.log('3. Use Cloud SQL Proxy manually');
    process.exit(1);
  }
};

// Run the backup
backupDatabase(); 