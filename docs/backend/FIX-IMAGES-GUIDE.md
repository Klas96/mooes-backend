# 🖼️ Fix Disappearing Images on Heroku

## The Problem

Your images are disappearing because **Heroku has an ephemeral filesystem**. This means:

- ❌ **Files are lost on dyno restarts** (happens daily)
- ❌ **Files are lost on deployments** (filesystem is wiped)
- ❌ **Files are lost on scaling events** (new dynos don't have files)

## The Solution: Google Cloud Storage Integration

I've implemented Google Cloud Storage integration to solve this problem. Here's how to set it up:

### Step 1: Create Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Cloud Storage API
4. Create a storage bucket (e.g., `mooves-images`)

### Step 2: Create Service Account

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name like "mooves-storage"
4. Grant "Storage Object Admin" role
5. Create and download the JSON key file

### Step 3: Configure Heroku Environment Variables

```bash
# Replace with your actual Google Cloud credentials
heroku config:set GOOGLE_CLOUD_PROJECT_ID="your_project_id" --app mooves-dating-app
heroku config:set GOOGLE_CLOUD_BUCKET_NAME="your_bucket_name" --app mooves-dating-app
heroku config:set GOOGLE_CLOUD_CREDENTIALS="$(cat your-service-account-key.json)" --app mooves-dating-app
```

### Step 4: Deploy the Updated Code

```bash
cd nodejs-backend
git add .
git commit -m "Add Google Cloud Storage integration for persistent image storage"
git push origin development
# Then create PR and merge to main
```

### Step 5: Run Database Migration

```bash
heroku run node scripts/add-google-storage-column.js --app mooves-dating-app
```

## How It Works

### Before (Local Storage - ❌ Disappears)
```
User uploads image → Stored in /uploads/ → Lost on Heroku restart
```

### After (Google Cloud Storage - ✅ Persistent)
```
User uploads image → Uploaded to Google Cloud Storage → URL stored in database → Never lost
```

## Features Added

✅ **Automatic Google Cloud Storage upload** for new images  
✅ **Fallback to local storage** if Google Cloud Storage fails  
✅ **Automatic cleanup** of Google Cloud Storage images when deleted  
✅ **Image optimization** (resized to 800x800, quality optimized)  
✅ **Database tracking** of Google Cloud Storage destinations  
✅ **Public URLs** for direct image access  

## Testing the Fix

1. **Upload a new image** - Should be stored in Google Cloud Storage
2. **Restart your Heroku dyno** - Image should still be available
3. **Deploy new code** - Image should persist
4. **Delete an image** - Should be removed from both database and Google Cloud Storage

## Migration of Existing Images

If you have existing images that disappeared, they're unfortunately lost due to Heroku's ephemeral filesystem. However:

1. **New uploads** will be stored in Google Cloud Storage
2. **Database records** are preserved (just the URLs are broken)
3. **Users can re-upload** their images

## Cost

- **Google Cloud Storage**: ~$0.02/GB/month for storage
- **Network egress**: ~$0.12/GB for downloads
- **Typical app usage**: ~$1-5/month for small to medium apps
- **Free tier**: 5GB storage, 1GB network egress/month

## Troubleshooting

### Images still disappearing?
1. Check if Google Cloud Storage is configured:
   ```bash
   heroku config --app mooves-dating-app | grep GOOGLE_CLOUD
   ```

2. Check logs for Google Cloud Storage errors:
   ```bash
   heroku logs --tail --app mooves-dating-app
   ```

### Google Cloud Storage upload fails?
- The app falls back to local storage
- Check your service account credentials
- Verify your bucket exists and is accessible

### Database migration fails?
```bash
heroku run bash --app mooves-dating-app
node scripts/add-google-storage-column.js
```

## Alternative Solutions

If you don't want to use Google Cloud Storage:

1. **AWS S3** - Similar to Google Cloud Storage
2. **Cloudinary** - Easier setup, but more expensive
3. **Firebase Storage** - Good for Firebase users
4. **DigitalOcean Spaces** - S3-compatible, simple pricing

## Quick Setup Commands

```bash
# 1. Set up Google Cloud Storage (replace with your credentials)
heroku config:set GOOGLE_CLOUD_PROJECT_ID="your_project_id" --app mooves-dating-app
heroku config:set GOOGLE_CLOUD_BUCKET_NAME="your_bucket_name" --app mooves-dating-app
heroku config:set GOOGLE_CLOUD_CREDENTIALS="$(cat your-service-account-key.json)" --app mooves-dating-app

# 2. Deploy the fix (after PR merge)
# The deployment will happen automatically when you merge the PR

# 3. Run migration
heroku run node scripts/add-google-storage-column.js --app mooves-dating-app

# 4. Test
curl https://mooves-dating-app.herokuapp.com/api/health
```

## Support

- 📖 [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- 🆘 [Google Cloud Support](https://cloud.google.com/support)
- 💬 [Heroku Support](https://help.heroku.com)

---

**🎉 Your images will never disappear again!** 