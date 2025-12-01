# Mooves Scripts Directory

This directory contains consolidated management scripts for the Mooves app backend.

## 🚀 Deployment Scripts

### Simple Deployment (`deploy.sh`)
**No manual exports required!** The script automatically loads environment variables from `.env-config.yaml`.

```bash
# From the nodejs-backend directory
./scripts/deploy.sh

# Or from project root
cd mooves/nodejs-backend && ./scripts/deploy.sh
```

### Advanced Deployment (`deploy-gcloud-run.sh`)
Full deployment script with safety checks and production confirmation.

```bash
# With manual environment variables
export DATABASE_URL="..." && export JWT_SECRET="..." && ./scripts/deploy-gcloud-run.sh

# Or let it auto-load from YAML (recommended)
./scripts/deploy-gcloud-run.sh
```

### Environment Setup (`setup-env-from-yaml.sh`)
Loads environment variables from YAML and runs deployment.

```bash
./scripts/setup-env-from-yaml.sh
```

## 🗄️ Consolidated Scripts

### 1. Database Manager (`database-manager.js`)
Comprehensive database management tool that consolidates migration, reset, seed, and clear functionality.

```bash
# Migration
node database-manager.js migrate [--simple]

# Reset and seed
node database-manager.js reset --seed

# Seed database
node database-manager.js seed [--enhanced]

# Clear specific data
node database-manager.js clear [--matches] [--users] [--all]

# Test connection
node database-manager.js test

# Setup schema
node database-manager.js setup
```

### 2. User Manager (`user-manager.js`)
Complete user management tool for user operations.

```bash
# Delete user
node user-manager.js delete <email>

# List users
node user-manager.js list [--with-profiles]

# Find user
node user-manager.js find <email|name>

# Give premium access
node user-manager.js give-premium <email> [days]

# Verify email
node user-manager.js verify <email>

# Get statistics
node user-manager.js stats
```

### 3. Test Manager (`test-manager.js`)
Comprehensive testing suite for all backend functionality.

```bash
# Test specific functionality
node test-manager.js network
node test-manager.js database
node test-manager.js email
node test-manager.js ai
node test-manager.js matching
node test-manager.js filtering [--fix]
node test-manager.js routes
node test-manager.js gcloud

# Run all tests
node test-manager.js all
```

## 📁 Legacy Scripts (To be removed)

The following scripts are now consolidated and can be removed:

### Migration Scripts
- `migrate-to-gcloud.js` → Use `database-manager.js migrate`
- `migrate-to-gcloud-simple.js` → Use `database-manager.js migrate --simple`
- `complete-gcloud-migration.js` → Use `database-manager.js migrate`

### Reset Scripts
- `reset-database.js` → Use `database-manager.js reset`
- `reset-database-simple.js` → Use `database-manager.js reset`
- `gcloud-reset-db.js` → Use `database-manager.js reset --seed`
- `reset-and-seed.js` → Use `database-manager.js reset --seed`
- `reset-likes.js` → Use `database-manager.js clear --matches`
- `reset-project.js` → Use `database-manager.js reset`

### Seed Scripts
- `seed-data.js` → Use `database-manager.js seed`
- `seed-gcloud.js` → Use `database-manager.js seed`
- `enhanced-seed-data.js` → Use `database-manager.js seed --enhanced`
- `clear-and-seed-gcloud.js` → Use `database-manager.js reset --seed`

### Clear Scripts
- `clear-database.js` → Use `database-manager.js clear --all`
- `clear-all-tables.js` → Use `database-manager.js clear --all`
- `clear-matches.js` → Use `database-manager.js clear --matches`

### User Management Scripts
- `delete-user-simple.js` → Use `user-manager.js delete`
- `delete-user-account.js` → Use `user-manager.js delete`
- `give-premium.js` → Use `user-manager.js give-premium`
- `remove-user.js` → Use `user-manager.js delete`
- `remove-klas-user.js` → Use `user-manager.js delete`

### Test Scripts
- `test-network.js` → Use `test-manager.js network`
- `test-db.js` → Use `test-manager.js database`
- `test-email.js` → Use `test-manager.js email`
- `test-ai-endpoint.js` → Use `test-manager.js ai`
- `test-matching.js` → Use `test-manager.js matching`
- `test-filtering.js` → Use `test-manager.js filtering`
- `test-filtering-fix.js` → Use `test-manager.js filtering --fix`
- `test-routes.js` → Use `test-manager.js routes`
- `test-gcloud-connection.js` → Use `test-manager.js gcloud`
- `test-upload.js` → Use `test-manager.js upload`

## 🛠️ Quick Start Examples

### Initial Setup
```bash
# 1. Migrate to Google Cloud
node database-manager.js migrate

# 2. Seed with sample data
node database-manager.js seed

# 3. Test everything
node test-manager.js all
```

### Daily Operations
```bash
# Check user statistics
node user-manager.js stats

# Find a specific user
node user-manager.js find john@example.com

# Give premium to a user
node user-manager.js give-premium jane@example.com 90

# Test backend health
node test-manager.js network
```

### Troubleshooting
```bash
# Reset database and reseed
node database-manager.js reset --seed

# Clear all data
node database-manager.js clear --all

# Test database connection
node test-manager.js database

# Run all tests
node test-manager.js all
```

## 🔧 Environment Setup

### Automatic Setup (Recommended)
The deployment scripts automatically load environment variables from `.env-config.yaml`:

```yaml
# .env-config.yaml
database:
  url: "postgresql://user:password@host:port/database"
jwt:
  secret: "your-jwt-secret"
email:
  user: "your-email@domain.com"
  password: "your-email-password"
  host: "mailcluster.loopia.se"
  port: 587
  secure: false
stripe:
  secret_key: "sk_test_..."
  publishable_key: "pk_test_..."
openai:
  api_key: "sk-..."
```

### Manual Setup (Legacy)
If you prefer to set environment variables manually:

```bash
# Database
export DATABASE_URL="postgresql://user:password@host:port/database"

# JWT
export JWT_SECRET="your-jwt-secret"

# Email
export EMAIL_USER="your-email@domain.com"
export EMAIL_PASSWORD="your-email-password"
export EMAIL_HOST="mailcluster.loopia.se"
export EMAIL_PORT="587"
export EMAIL_SECURE="false"

# Google Cloud
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"

# Backend URL for testing
export BACKEND_URL="https://your-backend-url.com"
```

## 📊 Script Categories

### Database Operations
- **Migration**: Set up Google Cloud SQL and configure connections
- **Reset**: Clear and recreate database schema
- **Seed**: Populate with sample data
- **Clear**: Remove specific data types

### User Management
- **CRUD Operations**: Create, read, update, delete users
- **Premium Management**: Grant/revoke premium access
- **Email Verification**: Mark emails as verified
- **Statistics**: Get user analytics

### Testing
- **Network**: Test API connectivity
- **Database**: Test database connections
- **Services**: Test email, AI, upload services
- **Business Logic**: Test matching, filtering algorithms

## 🚨 Important Notes

1. **Backup First**: Always backup your database before running destructive operations
2. **Environment**: Ensure you're in the correct environment (development/production)
3. **Permissions**: Some operations require Google Cloud CLI authentication
4. **Dependencies**: Make sure all required packages are installed

## 🔄 Migration Plan

To migrate from old scripts to new consolidated ones:

1. **Phase 1**: Use new scripts alongside old ones
2. **Phase 2**: Update documentation and workflows
3. **Phase 3**: Remove old scripts (after testing)

## 📞 Support

If you encounter issues with any script:
1. Check the help output: `node script-name.js`
2. Verify environment variables
3. Check Google Cloud authentication
4. Review error messages for specific guidance 