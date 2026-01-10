# ✅ Vercel Deployment Complete!

Your backend has been successfully deployed to Vercel!

**Production URL:** https://mooves-backend.vercel.app  
**Dashboard:** https://vercel.com/klas-projects-ee322207/mooves-backend

## ⚠️ Important: Environment Variables Required

The deployment is currently failing because environment variables are not set. You need to add them before the API will work.

## Quick Setup Guide

### Option 1: Using Vercel CLI (Recommended)

Run these commands to add environment variables:

```bash
cd /home/klas/Kod/mooves/mooves-backend/nodejs-backend

# Required: Database
vercel env add DATABASE_URL production
# Paste your PostgreSQL connection string when prompted

# Required: JWT Secret
vercel env add JWT_SECRET production
# Enter a secure random string (or generate: openssl rand -base64 32)

# Required: Cloudinary
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
# Enter your Cloudinary credentials when prompted

# Optional: CORS
vercel env add ALLOWED_ORIGINS production
# Enter: https://your-frontend-domain.com,https://*.github.io

# Optional: Frontend URL
vercel env add FRONTEND_URL production
# Enter: https://your-frontend-domain.com
```

### Option 2: Using Vercel Dashboard

1. Go to: https://vercel.com/klas-projects-ee322207/mooves-backend/settings/environment-variables
2. Click "Add New" for each variable
3. Add variables for **Production**, **Preview**, and **Development** environments

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Secret key for JWT tokens | (generate with `openssl rand -base64 32`) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-secret-key` |

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins for CORS |
| `FRONTEND_URL` | Your frontend URL (for email links) |
| `EMAIL_USER` | Email address for sending emails |
| `EMAIL_PASSWORD` | Email password |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port (usually 587) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_FIT_CLIENT_ID` | Google Fit API client ID |
| `GOOGLE_FIT_CLIENT_SECRET` | Google Fit API secret |

## After Adding Environment Variables

1. **Redeploy to apply changes:**
   ```bash
   vercel --prod
   ```

2. **Test the deployment:**
   ```bash
   curl https://mooves-backend.vercel.app/api/health
   ```

3. **Check logs if there are issues:**
   ```bash
   vercel logs
   ```

## Setting Up Cloudinary

If you don't have a Cloudinary account yet:

1. Sign up at https://cloudinary.com (free tier available)
2. Go to your Dashboard
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

## Database Setup

You need a PostgreSQL database. Options:

- **Vercel Postgres** (integrated): https://vercel.com/docs/storage/vercel-postgres
- **Supabase** (free tier): https://supabase.com
- **Neon** (serverless PostgreSQL): https://neon.tech
- **Any PostgreSQL provider**

## Testing Your Deployment

Once environment variables are set and you've redeployed:

```bash
# Health check
curl https://mooves-backend.vercel.app/api/health

# Database test
curl https://mooves-backend.vercel.app/api/test-db
```

## Updating Frontend to Use Vercel Backend

Update your Flutter app's API configuration:

```dart
// In constants/api_config.dart or similar
const String baseUrl = 'https://mooves-backend.vercel.app/api';
```

Or set it as an environment variable.

## Monitoring & Logs

- **View logs:** `vercel logs` or visit the Vercel dashboard
- **Monitor functions:** https://vercel.com/klas-projects-ee322207/mooves-backend/functions
- **View metrics:** https://vercel.com/klas-projects-ee322207/mooves-backend/analytics

## Troubleshooting

### Issue: "FUNCTION_INVOCATION_FAILED"

**Cause:** Missing environment variables or database connection issues.

**Solution:**
1. Check that all required environment variables are set
2. Verify `DATABASE_URL` is correct and accessible
3. Check logs: `vercel logs --follow`

### Issue: "Database connection failed"

**Solution:**
1. Verify your database allows connections from Vercel IPs
2. Check SSL settings (Vercel requires SSL for remote databases)
3. Ensure connection string format is correct

### Issue: "Cloudinary is not configured"

**Solution:**
1. Verify all three Cloudinary environment variables are set
2. Check they match your Cloudinary dashboard
3. Redeploy after adding: `vercel --prod`

## Next Steps

1. ✅ Add environment variables (see above)
2. ✅ Redeploy: `vercel --prod`
3. ✅ Test the API endpoints
4. ✅ Update frontend to use new backend URL
5. ✅ Set up custom domain (optional) in Vercel settings

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Check deployment logs: `vercel logs`
- View function invocations: Vercel Dashboard → Functions

