# Environment Configuration

## Overview
This document describes the environment configuration for the Mooves backend service.

## Environment Files

### Production Environment (`env-production.yaml`)
This is the main environment configuration file used for Cloud Run deployment. It contains all necessary environment variables for production.

**Key Features:**
- ✅ **Consolidated**: All environment variables in one file
- ✅ **Clean**: Removed deprecated Cloudinary variables
- ✅ **No Duplicates**: Eliminated duplicate entries
- ✅ **Cloud Run Compatible**: All values are strings as required by Cloud Run

### Local Development (`.env`)
Used for local development. Contains development-specific values.

## Environment Variables

### Server Configuration
- `NODE_ENV`: Environment mode (production/development)
- `PORT`: Server port (automatically set by Cloud Run)

### Authentication
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRE`: JWT token expiration time

### Database
- `DATABASE_URL`: PostgreSQL connection string

### AI Features
- `OPENAI_API_KEY`: OpenAI API key for AI chat functionality

### File Upload
- `MAX_FILE_SIZE`: Maximum file upload size in bytes
- `UPLOAD_PATH`: Directory for file uploads

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

### Email Configuration
- `EMAIL_USER`: Email service username (mooves@klasholmgren.se)
- `EMAIL_PASSWORD`: Email service password
- `EMAIL_SERVICE`: Email service provider (gmail)
- `FRONTEND_URL`: Frontend application URL

### CORS
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

### Google Cloud
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID
- `GOOGLE_CLOUD_PROJECT_ID`: Google Cloud project ID (duplicate)
- `GOOGLE_CLOUD_REGION`: Google Cloud region
- `GOOGLE_CLOUD_SQL_INSTANCE`: Cloud SQL instance name
- `GOOGLE_CLOUD_BUCKET_NAME`: Cloud Storage bucket name
- `GOOGLE_CLOUD_CREDENTIALS`: Service account credentials JSON

## Deployment

### Cloud Run Deployment
```bash
# Deploy with environment variables
gcloud run services update mooves-backend --region=us-central1 --env-vars-file=env-production.yaml
```

### Local Development
```bash
# Copy environment template
cp env.example .env

# Edit .env with your local values
nano .env
```

## Migration Notes

### Removed Variables
- ❌ `CLOUDINARY_CLOUD_NAME` - Deprecated, using Google Cloud Storage
- ❌ `CLOUDINARY_API_KEY` - Deprecated
- ❌ `CLOUDINARY_API_SECRET` - Deprecated

### Consolidated Variables
- ✅ All environment variables now in `env-production.yaml`
- ✅ Removed duplicate entries
- ✅ Consistent formatting and documentation

## Security Notes

1. **Never commit sensitive values** to version control
2. **Use environment variables** for all sensitive configuration
3. **Rotate secrets regularly** (JWT_SECRET, API keys, etc.)
4. **Use service accounts** for Google Cloud authentication

## Troubleshooting

### Common Issues

1. **"Not authorized, token failed"**
   - Check that `JWT_SECRET` is set correctly
   - Verify token format and expiration

2. **Database connection errors**
   - Verify `DATABASE_URL` is correct
   - Check network connectivity to Cloud SQL

3. **File upload failures**
   - Verify Google Cloud credentials
   - Check bucket permissions

4. **AI chat not working**
   - Verify `OPENAI_API_KEY` is set
   - Check OpenAI API quota and billing

### Environment Variable Validation
```bash
# Check current environment variables
gcloud run services describe mooves-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env[].name)" | sort

# View specific variable value
gcloud run services describe mooves-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env[].name,spec.template.spec.containers[0].env[].value)" | grep JWT_SECRET
``` 