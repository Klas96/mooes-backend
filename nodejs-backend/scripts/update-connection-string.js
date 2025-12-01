#!/usr/bin/env node

const fs = require('fs');

// Read the password file
const passwordData = JSON.parse(fs.readFileSync('.gcloud-passwords.json', 'utf8'));
const connectionInfo = JSON.parse(fs.readFileSync('.gcloud-connection.json', 'utf8'));

// URL encode the new password
const encodedPassword = encodeURIComponent(passwordData.userPassword);

// Get database host from environment or use default
const dbHost = process.env.DATABASE_HOST || '34.63.76.2';
const dbPort = process.env.DATABASE_PORT || '5432';
const dbName = process.env.DATABASE_NAME || 'mooves_db';
const dbUser = process.env.DATABASE_USER || 'mooves_user';

// Create new connection string
const newConnectionString = `postgresql://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}`;

// Update the connection info
connectionInfo.connectionString = newConnectionString;

// Write back to file
fs.writeFileSync('.gcloud-connection.json', JSON.stringify(connectionInfo, null, 2));

console.log('✅ Updated connection string with new password');
console.log(`New connection string: ${newConnectionString}`);

    // Also update the .env file
const envVars = {
  NODE_ENV: 'production',
  DATABASE_URL: newConnectionString, // Use the generated connection string
  GOOGLE_CLOUD_PROJECT: 'fresh-oath-337920',
  GOOGLE_CLOUD_REGION: 'us-central1',
  GOOGLE_CLOUD_SQL_INSTANCE: 'mooves-db',
  JWT_SECRET: process.env.JWT_SECRET || '[JWT_SECRET]',
  JWT_EXPIRE: '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '[CLOUDINARY_CLOUD_NAME]',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '[CLOUDINARY_API_KEY]',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '[CLOUDINARY_API_SECRET]',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '[OPENAI_API_KEY]',
  EMAIL_USER: process.env.EMAIL_USER || 'mooves@klasholmgren.se',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '[EMAIL_PASSWORD]',
  EMAIL_SERVICE: 'gmail',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080,http://localhost:8000'
};

const envContent = `# Google Cloud SQL Configuration
DATABASE_URL=${envVars.DATABASE_URL}
GOOGLE_CLOUD_PROJECT=${envVars.GOOGLE_CLOUD_PROJECT}
GOOGLE_CLOUD_REGION=${envVars.GOOGLE_CLOUD_REGION}
GOOGLE_CLOUD_SQL_INSTANCE=${envVars.GOOGLE_CLOUD_SQL_INSTANCE}

# Other existing variables (copy from your current .env)
NODE_ENV=${envVars.NODE_ENV}
JWT_SECRET=${envVars.JWT_SECRET}
JWT_EXPIRE=${envVars.JWT_EXPIRE}
CLOUDINARY_CLOUD_NAME=${envVars.CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${envVars.CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${envVars.CLOUDINARY_API_SECRET}
OPENAI_API_KEY=${envVars.OPENAI_API_KEY}
EMAIL_USER=${envVars.EMAIL_USER}
EMAIL_PASSWORD=${envVars.EMAIL_PASSWORD}
FRONTEND_URL=${envVars.FRONTEND_URL}
EMAIL_SERVICE=${envVars.EMAIL_SERVICE}
RATE_LIMIT_WINDOW_MS=${envVars.RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX_REQUESTS=${envVars.RATE_LIMIT_MAX_REQUESTS}
ALLOWED_ORIGINS=${envVars.ALLOWED_ORIGINS}
`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ Updated .env file'); 