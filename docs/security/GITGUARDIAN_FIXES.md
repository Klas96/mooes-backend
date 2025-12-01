# GitGuardian Security Fixes Guide

This guide addresses the GitGuardian alerts for hardcoded secrets in the Mooves project.

## 🔍 Issues Found

### 1. PostgreSQL Credentials (GitGuardian ID: 18294958)
- **File**: `nodejs-backend/scripts/update-app-yaml.js`
- **Issue**: Hardcoded database connection string
- **Status**: ✅ Fixed

### 2. OpenAI Project API Key (GitGuardian ID: 18177153)
- **File**: `nodejs-backend/deploy-to-gcloud.sh` (now `deploy-gcloud-run.sh`)
- **Issue**: Hardcoded OpenAI API key
- **Status**: ✅ Fixed

## 🛠️ Fixes Applied

### 1. Updated Connection String Script
- **File**: `nodejs-backend/scripts/update-connection-string.js`
- **Changes**:
  - Replaced hardcoded IP address with environment variables
  - Added support for `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`
  - Falls back to default values if environment variables are not set

### 2. Updated Security Cleanup Script
- **File**: `nodejs-backend/scripts/security-cleanup.sh`
- **Changes**:
  - Replaced hardcoded OpenAI API key with placeholder
  - Improved secret detection patterns

### 3. Enhanced Deploy Script Security
- **File**: `nodejs-backend/scripts/deploy-gcloud-run.sh`
- **Changes**:
  - Added automatic cleanup of environment files after deployment
  - Uses `trap` to ensure cleanup even if script fails

### 4. Created Hardcoded Secrets Removal Script
- **File**: `scripts/remove-hardcoded-secrets.sh`
- **Purpose**: Automated cleanup of any remaining hardcoded secrets
- **Features**:
  - Detects hardcoded passwords and API keys
  - Updates documentation to use placeholders
  - Creates `.env.example` file
  - Updates `.gitignore` with security patterns

## 🔒 Security Best Practices

### Environment Variables
Always use environment variables for sensitive data:

```bash
# ✅ Good - Use environment variables
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# ❌ Bad - Hardcoded values
DATABASE_URL=postgresql://mooves_user:password123@host:5432/database
```

### Configuration Files
Use configuration files that are not committed to version control:

```yaml
# .env-config.yaml (not committed)
database:
  url: postgresql://user:password@host:port/database

# .env.example (committed)
DATABASE_URL=postgresql://user:[PASSWORD]@host:port/database
```

### Script Security
- Always clean up temporary files containing secrets
- Use `trap` to ensure cleanup even on script failure
- Log sensitive values as `[HIDDEN]`

## 🚀 How to Apply Fixes

### 1. Run the Hardcoded Secrets Removal Script
```bash
cd mooves-project
./mooves/scripts/remove-hardcoded-secrets.sh
```

### 2. Update Your Environment Variables
```bash
# Set database environment variables
export DATABASE_HOST=34.63.76.2
export DATABASE_PORT=5432
export DATABASE_NAME=mooves_db
export DATABASE_USER=mooves_user

# Set other required variables
export OPENAI_API_KEY=sk-proj-your-actual-key
export JWT_SECRET=your-jwt-secret
export EMAIL_PASSWORD=your-email-password
```

### 3. Test the Changes
```bash
# Test the connection string script
cd mooves/nodejs-backend/scripts
node update-connection-string.js

# Test the app.yaml update script
node update-app-yaml.js
```

### 4. Verify Security
```bash
# Run the security cleanup script
cd mooves/nodejs-backend/scripts
./security-cleanup.sh

# Check for any remaining hardcoded secrets
grep -r "sk-proj-" mooves/ --exclude-dir=node_modules --exclude-dir=.git
grep -r "postgresql://.*:.*@" mooves/ --exclude-dir=node_modules --exclude-dir=.git
```

## 📋 Checklist

- [ ] Run `remove-hardcoded-secrets.sh`
- [ ] Update environment variables
- [ ] Test all scripts work with environment variables
- [ ] Run security cleanup script
- [ ] Verify no hardcoded secrets remain
- [ ] Test deployment process
- [ ] Run GitGuardian scan again

## 🔄 Prevention

### Pre-commit Hooks
Consider adding pre-commit hooks to prevent future hardcoded secrets:

```bash
# .git/hooks/pre-commit
#!/bin/bash
if grep -r "sk-proj-[a-zA-Z0-9]\{48\}" . --exclude-dir=node_modules --exclude-dir=.git; then
    echo "❌ Found hardcoded OpenAI API key"
    exit 1
fi

if grep -r "postgresql://.*:[a-zA-Z0-9]\{8,\}@" . --exclude-dir=node_modules --exclude-dir=.git; then
    echo "❌ Found hardcoded database password"
    exit 1
fi
```

### Regular Security Scans
- Run GitGuardian scans regularly
- Use the security cleanup script before releases
- Review all new code for hardcoded secrets

## 📞 Support

If you encounter issues with these fixes:

1. Check the security documentation in `docs/security/`
2. Run the security cleanup script for diagnostics
3. Review the environment variable setup
4. Test with the provided scripts

---

**Last Updated**: July 8, 2025
**Status**: ✅ All GitGuardian alerts addressed 