# 🔒 Security Guide for Mooves Backend

## ✅ Current Security Status

Your project is properly configured for security:

- ✅ **`.env` file is gitignored** - Won't be committed to repository
- ✅ **`.env.gcloud` file is gitignored** - Won't be committed to repository
- ✅ **Sensitive files are protected** - All credential files are excluded
- ✅ **Deployment is secure** - Environment variables loaded safely

## 🛡️ What's Protected

### Files in `.gitignore`:
```
.env                    # Your main environment file with real keys
.env.gcloud            # Google Cloud specific environment file
.gcloud-connection.json # Database connection details
.gcloud-passwords.json  # Database passwords
cloud-sql-proxy-key.json # Cloud SQL proxy credentials
```

### Sensitive Information Protected:
- 🔑 **OpenAI API Key** - Your AI service credentials
- 🔐 **JWT Secret** - Authentication token signing key
- 🗄️ **Database URL** - PostgreSQL connection string with password
- 📧 **Email Credentials** - Gmail app password
- ☁️ **Google Cloud Credentials** - Service account JSON

## 🚨 Security Best Practices

### 1. Never Commit Sensitive Files
```bash
# ✅ Good - These files are already gitignored
.env
.env.gcloud
*.json (credential files)

# ❌ Bad - Never do this
git add .env
git commit -m "Add API keys"  # NEVER!
```

### 2. Use Environment Variables
```bash
# ✅ Good - Load from .env file
export $(grep -v '^#' .env | xargs)

# ❌ Bad - Hardcode in scripts
OPENAI_API_KEY="sk-1234567890abcdef"
```

### 3. Rotate Keys Regularly
- **OpenAI API Keys**: Rotate every 90 days
- **JWT Secrets**: Rotate every 30 days
- **Database Passwords**: Rotate every 60 days
- **Email App Passwords**: Rotate every 90 days

### 4. Monitor for Exposures
```bash
# Check if any sensitive files are tracked
git ls-files | grep -E "\.(env|key|pem|json)$"

# Should return empty or only safe files
```

## 🔧 Secure Deployment Process

### 1. Local Development
```bash
# Your .env file is already set up securely
cd nodejs-backend
./setup-env.sh  # Checks security status
```

### 2. Production Deployment
```bash
# Deploy securely to Google Cloud Run
./deploy-gcloud-run.sh  # Loads from .env safely
```

### 3. CI/CD Security
```bash
# GitHub Actions uses test keys only
# No real credentials in CI/CD
```

## 🚨 What to Do If Keys Are Exposed

### 1. Immediate Actions
```bash
# 1. Revoke exposed keys immediately
# 2. Generate new keys
# 3. Update .env file
# 4. Redeploy application
```

### 2. Key Rotation Commands
```bash
# Generate new JWT secret
openssl rand -base64 64

# Update OpenAI API key
# Go to: https://platform.openai.com/api-keys

# Update database password
# Use Google Cloud Console or gcloud CLI

# Update email app password
# Go to: https://myaccount.google.com/apppasswords
```

## 📋 Security Checklist

### Before Each Deployment:
- [ ] `.env` file is not tracked by git
- [ ] No hardcoded credentials in code
- [ ] All API keys are valid and active
- [ ] Database connection is secure
- [ ] JWT secret is strong and unique

### Monthly Security Review:
- [ ] Rotate JWT secrets
- [ ] Check API key usage and limits
- [ ] Review database access logs
- [ ] Update dependencies for security patches
- [ ] Audit environment variables

### Quarterly Security Review:
- [ ] Rotate all API keys
- [ ] Update database passwords
- [ ] Review Google Cloud IAM permissions
- [ ] Check for exposed credentials in logs
- [ ] Update security documentation

## 🔍 Monitoring and Alerts

### 1. Google Cloud Monitoring
```bash
# Set up billing alerts
gcloud billing budgets create --billing-account=YOUR_ACCOUNT \
    --budget-amount=10USD \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.8 \
    --threshold-rule=percent=1.0
```

### 2. Application Monitoring
```bash
# Monitor logs for security events
gcloud logs tail --service=mooves-backend --region=us-central1

# Check for authentication failures
gcloud logs read "resource.type=cloud_run_revision AND severity>=WARNING"
```

### 3. API Usage Monitoring
- **OpenAI**: Monitor usage at https://platform.openai.com/usage
- **Google Cloud**: Monitor at https://console.cloud.google.com/billing
- **Database**: Monitor connections and queries

## 🆘 Emergency Contacts

### If You Suspect a Breach:
1. **Immediate**: Revoke all exposed credentials
2. **Within 1 hour**: Generate new keys and update .env
3. **Within 24 hours**: Redeploy application
4. **Within 48 hours**: Audit all access logs
5. **Within 1 week**: Complete security review

### Key Services:
- **OpenAI**: https://platform.openai.com/api-keys
- **Google Cloud**: https://console.cloud.google.com/iam-admin
- **Gmail**: https://myaccount.google.com/apppasswords
- **GitHub**: https://github.com/settings/tokens

## 📚 Additional Resources

- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OpenAI API Security](https://platform.openai.com/docs/guides/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

## ✅ Security Verification

Run this command to verify your security setup:
```bash
cd nodejs-backend
./setup-env.sh
```

This will confirm that:
- ✅ Your .env file exists and is properly configured
- ✅ Sensitive files are gitignored
- ✅ No credentials are exposed in the repository
- ✅ You're ready for secure deployment 