#!/bin/bash

# Load environment variables from .env-config.yaml
echo "🔧 Loading environment variables from .env-config.yaml..."

# Use Node.js to parse the YAML file and extract environment variables
cd "$(dirname "$0")/.."  # Go to nodejs-backend directory

# Extract environment variables from YAML
eval $(node -e "
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Try to find .env-config.yaml in multiple locations
let configPath = path.resolve(__dirname, '.env-config.yaml');
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, '../.env-config.yaml');
}
if (!fs.existsSync(configPath)) {
  configPath = path.resolve(__dirname, '../../.env-config.yaml');
}

if (fs.existsSync(configPath)) {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  
  // Extract database URL components
  const dbUrl = config.database.url;
  const dbMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (dbMatch) {
    console.log('export DB_PASSWORD=\"' + dbMatch[2] + '\"');
    console.log('export DB_HOST=\"' + dbMatch[3] + '\"');
  }
  
  // Extract other variables
  if (config.jwt && config.jwt.secret) {
    console.log('export JWT_SECRET=\"' + config.jwt.secret + '\"');
  }
  
  if (config.email && config.email.user) {
    console.log('export EMAIL_USER=\"' + config.email.user + '\"');
  }
  
  if (config.email && config.email.password) {
    console.log('export EMAIL_PASSWORD=\"' + config.email.password + '\"');
  }
  
  if (config.stripe && config.stripe.secret_key) {
    console.log('export STRIPE_SECRET_KEY=\"' + config.stripe.secret_key + '\"');
  }
  
  if (config.openai && config.openai.api_key) {
    console.log('export OPENAI_API_KEY=\"' + config.openai.api_key + '\"');
  }
  
  console.log('echo \"✅ Environment variables loaded from YAML config\"');
} else {
  console.log('echo \"❌ .env-config.yaml not found\"');
  process.exit(1);
}
")

echo "🚀 Running deployment script..."
cd "$(dirname "$0")"
./deploy-gcloud-run.sh 