# Vercel Deployment Setup Guide

This guide will help you deploy the Mooves backend to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com)
2. A Cloudinary account (for image storage)
3. A PostgreSQL database (can use Vercel Postgres, Supabase, or any other PostgreSQL provider)
4. Node.js 20.18.0 or later

## Step 1: Set Up Cloudinary

1. Sign up for a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard and copy your credentials:
   - Cloud Name
   - API Key
   - API Secret

## Step 2: Prepare Your Database

The backend requires a PostgreSQL database. You can use:
- **Vercel Postgres** (recommended, integrates seamlessly)
- **Supabase** (free tier available)
- **Any PostgreSQL provider** (Neon, Railway, etc.)

Make sure your database has all the required tables. Run your migrations if needed.

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to the backend directory:
   ```bash
   cd mooves-backend/nodejs-backend
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. Follow the prompts to configure your project.

### Option B: Using GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure the settings:
   - **Framework Preset**: Other
   - **Root Directory**: `mooves-backend/nodejs-backend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

## Step 4: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://*.github.io

# Frontend URL (for email links)
FRONTEND_URL=https://your-frontend-domain.com

# Email (optional, if using email features)
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Google OAuth (optional, if using Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id

# Google Fit (optional, if using Google Fit integration)
GOOGLE_FIT_CLIENT_ID=your-google-fit-client-id
GOOGLE_FIT_CLIENT_SECRET=your-google-fit-client-secret
GOOGLE_FIT_REDIRECT_URI=https://your-vercel-url.vercel.app/api/google-fit/callback
```

### Optional Variables

```bash
# Use Cloudinary (set to '1' to force Cloudinary even on non-Vercel deployments)
USE_CLOUDINARY=1

# Serverless mode (automatically detected on Vercel, but can be manually set)
SERVERLESS=1

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# File upload settings
MAX_FILE_SIZE=5242880  # 5MB in bytes
```

## Step 5: Run Database Migrations

After deploying, you may need to run database migrations. You can do this by:

1. **Using Vercel CLI:**
   ```bash
   vercel env pull .env.local
   # Edit .env.local with your DATABASE_URL
   node migrations/run-store-website-migration.js
   ```

2. **Using a database management tool:**
   - Connect to your database
   - Run the migration SQL manually

3. **Using a one-time Vercel function:**
   - Create a temporary API endpoint that runs migrations
   - Call it once
   - Remove it after

## Step 6: Update Frontend API URL

Update your frontend to point to your Vercel deployment:

```dart
// In Flutter app
const String baseUrl = 'https://your-app.vercel.app/api';
```

Or set it as an environment variable in your frontend.

## Step 7: Test Your Deployment

1. Check the health endpoint:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

2. Test database connection:
   ```bash
   curl https://your-app.vercel.app/api/test-db
   ```

3. Test an authenticated endpoint (after logging in):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://your-app.vercel.app/api/profiles/me
   ```

## Important Notes

### File Uploads

- **Vercel uses Cloudinary** for file storage (configured automatically)
- File uploads are limited to 4.5MB by default (can be increased with Pro plan)
- Images are automatically optimized and served via CDN

### Database Connections

- Vercel uses **serverless functions**, which means each function instance gets its own database connection
- Connection pooling is optimized for serverless (max 1 connection per instance)
- Make sure your database allows enough connections

### Cold Starts

- First request after inactivity may be slower (cold start)
- Consider using Vercel Pro plan for better cold start performance
- Use edge functions for simple endpoints if needed

### Static Files

- Static files should be served from Cloudinary or a CDN
- The `/uploads` route will proxy to Cloudinary URLs
- Don't rely on local file storage on Vercel (it's ephemeral)

## Troubleshooting

### Issue: "Database connection failed"

**Solution:**
- Check that `DATABASE_URL` is correctly set
- Ensure your database allows connections from Vercel's IP ranges
- Verify SSL settings if using a remote database

### Issue: "Cloudinary is not configured"

**Solution:**
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
- Or set `USE_CLOUDINARY=0` if you want to use a different storage solution

### Issue: "Request timeout"

**Solution:**
- Vercel free tier has a 10-second timeout
- Pro tier has a 60-second timeout (configurable up to 5 minutes)
- Optimize slow endpoints or upgrade to Pro

### Issue: "Function exceeded maximum duration"

**Solution:**
- The function execution time exceeded the limit
- Check `vercel.json` for `maxDuration` setting
- Optimize database queries or upgrade to Pro plan

## Monitoring

- Use Vercel's dashboard to monitor function invocations
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor database connection pool usage
- Track API response times

## Cost Considerations

**Vercel Free Tier:**
- 100GB bandwidth/month
- 100 serverless function executions/second
- 10-second function timeout

**Vercel Pro Tier ($20/month):**
- Unlimited bandwidth
- Better performance
- 60-second timeout (up to 5 minutes)
- Better analytics

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [PostgreSQL Best Practices for Serverless](https://vercel.com/guides/postgres-best-practices)


