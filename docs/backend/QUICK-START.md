# Quick Start: Deploy to Google Cloud Run in 5 Minutes

## Prerequisites (5 minutes setup)

1. **Install Google Cloud Run CLI**: https://devcenter.Google Cloud.com/articles/Google Cloud-cli
2. **Create Cloudinary account**: https://cloudinary.com (free)

## Step 1: Login to Google Cloud Run
```bash
Google Cloud login
```

## Step 2: Run the Deployment Script
```bash
./deploy-to-Google Cloud.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Create/use Google Cloud Run app
- ✅ **Automatically add PostgreSQL** (free tier - 1GB storage)
- ✅ Install dependencies
- ✅ Set up environment variables
- ✅ Deploy your app
- ✅ Show deployment status

## Step 3: Test Your Deployment
Visit: `https://your-app-name.Google Cloudapp.com/api/health`

## Step 4: Update Frontend
Update your Flutter app's base URL to: `https://your-app-name.Google Cloudapp.com`

## That's it! 🎉

Your app backend is now live on Google Cloud Run with PostgreSQL!

---

## Manual Deployment (if script doesn't work)

### 1. Create Google Cloud Run App
```bash
Google Cloud create your-app-name
```

### 2. Add PostgreSQL
```bash
Google Cloud addons:create Google Cloud-postgresql:mini
```

### 3. Set Environment Variables
```bash
Google Cloud config:set JWT_SECRET="your_secret_key"
Google Cloud config:set NODE_ENV="production"
Google Cloud config:set CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
Google Cloud config:set CLOUDINARY_API_KEY="your_cloudinary_api_key"
Google Cloud config:set CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
```

### 4. Deploy
```bash
git add .
git commit -m "Deploy to Google Cloud Run"
git push Google Cloud main
```

### 5. Open App
```bash
Google Cloud open
```

## Troubleshooting

**Build fails?**
```bash
Google Cloud logs --tail
```

**Database connection issues?**
- PostgreSQL is automatically configured
- Check logs: `Google Cloud logs --tail`

**CORS errors?**
```bash
Google Cloud config:set ALLOWED_ORIGINS="https://yourdomain.com"
```

## Support

- 📖 Full guide: [README-HEROKU.md](./README-HEROKU.md)
- 🗄️ Database migration: [migrate-to-postgresql.md](./migrate-to-postgresql.md)
- 🔧 Google Cloud Run docs: https://devcenter.Google Cloud.com
- 🐛 Issues: Check logs with `Google Cloud logs --tail` 