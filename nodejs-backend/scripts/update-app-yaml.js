const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Read the env-config.yaml file
function readEnvConfig() {
  try {
    const envConfigPath = path.join(__dirname, '../../.env-config.yaml');
    const envConfigContent = fs.readFileSync(envConfigPath, 'utf8');
    return yaml.load(envConfigContent);
  } catch (error) {
    console.error('Error reading env-config.yaml:', error);
    process.exit(1);
  }
}

// Generate environment variables from env-config.yaml
function generateEnvVariables(config) {
  const envVars = {
    NODE_ENV: 'production',
    PORT: 8080,
    GOOGLE_CLOUD_PROJECT_ID: config.google_cloud_storage?.project_id || 'fresh-oath-337920',
    GOOGLE_CLOUD_BUCKET_NAME: config.google_cloud_storage?.bucket_name || 'mooves',
    GOOGLE_CLOUD_CREDENTIALS: "",
  };

  // Require database configuration to be present
  if (!config.database?.url) {
    console.error('❌ DATABASE_URL is required in env-config.yaml');
    console.error('Please ensure your .env-config.yaml contains a database.url field');
    process.exit(1);
  }
  
  envVars.DATABASE_URL = config.database.url;

  // Add JWT configuration
  if (config.jwt) {
    envVars.JWT_SECRET = config.jwt.secret;
    envVars.JWT_EXPIRE = config.jwt.expire;
  }

  // Add database configuration
  if (config.database) {
    envVars.DATABASE_URL = config.database.url;
  }

  // Add Stripe configuration
  if (config.stripe) {
    envVars.STRIPE_SECRET_KEY = config.stripe.secret_key;
  }

  // Add OpenAI configuration
  if (config.openai) {
    envVars.OPENAI_API_KEY = config.openai.api_key;
  }

  // Add email configuration
  if (config.email) {
    envVars.EMAIL_USER = config.email.user;
    envVars.EMAIL_PASSWORD = config.email.password;
    envVars.EMAIL_HOST = config.email.host;
    envVars.EMAIL_PORT = config.email.port;
    envVars.EMAIL_SECURE = config.email.secure;
    envVars.FRONTEND_URL = config.email.frontend_url;
  }

  return envVars;
}

// Update app.yaml file
function updateAppYaml(envVars) {
  try {
    const appYamlPath = path.join(__dirname, '../app.yaml');
    let appYamlContent = fs.readFileSync(appYamlPath, 'utf8');

    // Find the env_variables section
    const envVarsSection = 'env_variables:';
    const envVarsStart = appYamlContent.indexOf(envVarsSection);
    
    if (envVarsStart === -1) {
      console.error('Could not find env_variables section in app.yaml');
      return false;
    }

    // Find the end of the env_variables section
    const lines = appYamlContent.split('\n');
    let envVarsEnd = envVarsStart;
    for (let i = envVarsStart + 1; i < lines.length; i++) {
      if (lines[i].trim() && !lines[i].startsWith('  ')) {
        envVarsEnd = i;
        break;
      }
    }

    // Generate new env_variables section
    let newEnvVarsSection = 'env_variables:\n';
    for (const [key, value] of Object.entries(envVars)) {
      if (typeof value === 'string') {
        newEnvVarsSection += `  ${key}: ${value}\n`;
      } else {
        newEnvVarsSection += `  ${key}: ${value}\n`;
      }
    }

    // Replace the env_variables section
    const beforeEnvVars = lines.slice(0, envVarsStart).join('\n');
    const afterEnvVars = lines.slice(envVarsEnd).join('\n');
    
    const newAppYamlContent = beforeEnvVars + '\n' + newEnvVarsSection + afterEnvVars;

    // Write the updated app.yaml
    fs.writeFileSync(appYamlPath, newAppYamlContent);
    
    console.log('✅ Successfully updated app.yaml with environment variables from env-config.yaml');
    return true;
  } catch (error) {
    console.error('Error upapp.yaml:', error);
    return false;
  }
}

// Main function
function main() {
  console.log('🔧 Reading env-config.yaml...');
  const config = readEnvConfig();
  
  console.log('🔧 Generating environment variables...');
  const envVars = generateEnvVariables(config);
  
  console.log('🔧 Upapp.yaml...');
  const success = updateAppYaml(envVars);
  
  if (success) {
    console.log('✅ Environment variables updated successfully!');
      console.log('\n📋 Updated environment variables:');
  for (const [key, value] of Object.entries(envVars)) {
    if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY') || key.includes('CREDENTIALS')) {
      console.log(`  ${key}: [HIDDEN]`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
  } else {
    console.error('❌ Failed to update app.yaml');
    process.exit(1);
  }
}

// Run the script
main(); 