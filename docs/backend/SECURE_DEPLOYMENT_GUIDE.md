# 🔒 Secure Deployment Guide

## Security Issue Resolved ✅

The hardcoded secrets detected by GitGuardian have been removed from version control and added to `.gitignore`.

## 🚨 What Was Fixed

### Removed from Version Control:
- `.gcloud-connection.json` - Database credentials
- `.gcloud-passwords.json` - Database passwords
- `.env.gcloud` - API keys and database URL

### Added to `.gitignore`:
- `.env.gcloud`
- `.gcloud-connection.json`
- `.gcloud-passwords.json`
- `cloud-sql-proxy-key.json`
- `connect-cloud-sql.sh`
- `cloud_sql_proxy`

## 🔐 Secure Deployment Process

### 1. Local Development
```bash
# Copy the template and fill in your values
cp env.gcloud.template .env.gcloud

# Edit .env.gcloud with your actual values
nano .env.gcloud
```

### 2. Production Deployment (Heroku)
```bash
# Set environment variables directly in Heroku (NOT in files)
heroku config:set DATABASE_URL="postgresql://mooves_user:[PASSWORD]@34.63.76.2:5432/mooves_db"
heroku config:set GOOGLE_CLOUD_PROJECT="fresh-oath-337920"
heroku config:set GOOGLE_CLOUD_REGION="us-central1"
heroku config:set GOOGLE_CLOUD_SQL_INSTANCE="mooves-db"
heroku config:set JWT_SECRET="your-secure-jwt-secret"
heroku config:set OPENAI_API_KEY="your-openai-key"
# ... other environment variables
```

### 3. Environment Variables to Set
```bash
# Required for Google Cloud SQL
DATABASE_URL=postgresql://mooves_user:[PASSWORD]@34.63.76.2:5432/mooves_db
GOOGLE_CLOUD_PROJECT=fresh-oath-337920
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_SQL_INSTANCE=mooves-db

# Your existing variables
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
OPENAI_API_KEY=your-openai-key
EMAIL_USER=mooves@klasholmgren.se
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=https://your-app.com
EMAIL_SERVICE=gmail
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://your-app.com,http://localhost:3000
```

## 🛡️ Security Best Practices

### ✅ DO:
- Use environment variables for all secrets
- Set secrets in Heroku config (not in files)
- Use strong, unique passwords
- Rotate secrets regularly
- Use SSL/TLS for database connections
- Monitor for security alerts

### ❌ DON'T:
- Commit secrets to version control
- Share secrets in chat/messages
- Use default passwords
- Store secrets in client-side code
- Log sensitive information

## 🔄 Database Password Rotation

If you need to rotate the database password:

```bash
# Generate new password
openssl rand -base64 16

# Update in Google Cloud
gcloud sql users set-password mooves_user --instance=mooves-db --password=NEW_PASSWORD

# Update in Heroku
heroku config:set DATABASE_URL="postgresql://mooves_user:[PASSWORD]@34.63.76.2:5432/mooves_db"
```

## 📋 Deployment Checklist

- [ ] Environment variables set in Heroku
- [ ] Database connection tested
- [ ] SSL certificates configured
- [ ] Secrets not in version control
- [ ] Monitoring enabled
- [ ] Backup strategy in place

## 🚨 Emergency Response

If secrets are ever compromised:

1. **Immediately rotate all passwords**
2. **Revoke and regenerate API keys**
3. **Check for unauthorized access**
4. **Review logs for suspicious activity**
5. **Update all deployment environments**

## 📞 Support

- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [Google Cloud Security](https://cloud.google.com/security)
- [Heroku Security](https://devcenter.heroku.com/articles/security)

---

**Remember**: Security is an ongoing process. Regularly review and update your security practices! 