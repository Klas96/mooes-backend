# 🔒 Security Guide for Mooves Project

## GitGuardian Alert Resolution

This guide addresses the GitGuardian alerts detected in pull request #69 and provides best practices to prevent future security issues.

## 🚨 Immediate Actions Required

### 1. Remove Sensitive Files
Run the cleanup script to remove all flagged sensitive files:
```bash
./scripts/cleanup-secrets.sh
```

### 2. Set Up GitHub Secrets
Add the following secrets to your GitHub repository settings:

**Required for CI/CD:**
- `TEST_POSTGRES_PASSWORD` - Test database password
- `TEST_EMAIL_USER` - Test email username
- `TEST_EMAIL_PASSWORD` - Test email password
- `TEST_JWT_SECRET` - Test JWT secret
- `TEST_OPENAI_API_KEY` - Test OpenAI API key

**Production secrets (if needed):**
- `PROD_POSTGRES_PASSWORD`
- `PROD_EMAIL_USER`
- `PROD_EMAIL_PASSWORD`
- `PROD_JWT_SECRET`
- `PROD_OPENAI_API_KEY`
- `GOOGLE_CLOUD_CREDENTIALS`

### 3. Update Environment Configuration
Replace hardcoded values with environment variables in all configuration files.

## 📋 Files Flagged by GitGuardian

| File | Issue | Status |
|------|-------|--------|
| `nodejs-backend/env-vars.yaml` | PostgreSQL Credentials | ❌ Needs removal |
| `.env.template` | Generic High Entropy Secret | ❌ Needs removal |
| `nodejs-backend/.env.backup` | PostgreSQL Credentials | ❌ Needs removal |
| `complete-env.yaml` | Google Cloud Keys | ❌ Needs removal |
| `nodejs-backend/deploy-cloud-run-fixed.sh` | Google Cloud Keys | ❌ Needs removal |
| `.github/workflows/pr-tests.yml` | Generic Password | ✅ Fixed |

## 🔧 Security Best Practices

### 1. Environment Variables
Always use environment variables for sensitive data:

```javascript
// ❌ Bad
const password = "hardcoded_password_123";

// ✅ Good
const password = process.env.DATABASE_PASSWORD;
```

### 2. Configuration Files
Use template files without real secrets:

```yaml
# env.template.yaml
database:
  host: ${DB_HOST}
  password: ${DB_PASSWORD}
  user: ${DB_USER}
```

### 3. Git Ignore Patterns
Keep your `.gitignore` updated with these patterns:

```gitignore
# Environment files
.env*
*.env
env-*.yaml
*-env.yaml

# Credentials
*credential*
*password*
*secret*
*token*
*api_key*

# Cloud credentials
google-services.json
GoogleService-Info.plist
service-account*.json
```

### 4. Pre-commit Hooks
Install pre-commit hooks to catch secrets before they're committed:

```bash
# Install pre-commit
pip install pre-commit

# Install detect-secrets
pip install detect-secrets

# Create .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### 5. Regular Security Audits
Run security scans regularly:

```bash
# GitGuardian CLI
pip install ggshield
ggshield scan

# TruffleHog
pip install trufflehog
trufflehog --regex --entropy=False .

# Detect-secrets
detect-secrets scan --baseline .secrets.baseline
```

## 🛠️ Development Workflow

### 1. Local Development
Create a `.env.local` file for local development:

```bash
# .env.local (not committed)
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=your_local_secret
OPENAI_API_KEY=your_local_key
```

### 2. Testing
Use dedicated test credentials:

```javascript
// test/config.js
module.exports = {
  testDatabase: {
    host: process.env.TEST_DB_HOST || 'localhost',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    // ...
  }
};
```

### 3. Deployment
Use cloud provider secrets management:

**Google Cloud:**
```bash
# Set secrets
gcloud secrets create DATABASE_PASSWORD --data-file=password.txt
gcloud secrets create JWT_SECRET --data-file=jwt-secret.txt

# Access in deployment
DATABASE_PASSWORD=$(gcloud secrets versions access latest --secret=DATABASE_PASSWORD)
```

**Heroku:**
```bash
heroku config:set DATABASE_PASSWORD=your_password
heroku config:set JWT_SECRET=your_secret
```

## 📚 Additional Resources

### Security Tools
- [GitGuardian](https://www.gitguardian.com/) - Secret detection
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) - Secret scanning
- [Detect-secrets](https://github.com/Yelp/detect-secrets) - Secret detection
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) - Git history cleaning

### Documentation
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)
- [Heroku Config Vars](https://devcenter.heroku.com/articles/config-vars)

### Best Practices
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure)

## 🚨 Emergency Procedures

### If Secrets Are Exposed

1. **Immediate Actions:**
   - Rotate all exposed secrets immediately
   - Revoke API keys and tokens
   - Change database passwords
   - Update deployment credentials

2. **Repository Cleanup:**
   ```bash
   # Remove from git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push
   git push --force-with-lease
   ```

3. **Notification:**
   - Notify team members
   - Update security documentation
   - Review access logs if available

## 📞 Support

For security-related questions or issues:
- Review this guide first
- Check the [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Open a security issue in the repository
- Contact the security team if needed

---

**Remember: Security is everyone's responsibility. When in doubt, ask before committing sensitive data.** 