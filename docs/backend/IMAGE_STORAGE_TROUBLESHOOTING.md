# Image Storage Troubleshooting Guide

This guide helps diagnose and fix issues with profile pictures disappearing or not loading correctly in the Mooves app.

## Common Issues

### 1. Profile Pictures Disappearing After a While

**Symptoms:**
- Images load initially but disappear after some time
- Images show broken image icons
- Images work on some devices but not others

**Possible Causes:**
- Images stored locally instead of Google Cloud Storage
- Broken URLs in database
- Google Cloud Storage permissions issues
- Orphaned files without database records

### 2. Images Not Uploading

**Symptoms:**
- Upload fails with error messages
- Images don't appear after upload
- Upload appears successful but image doesn't show

**Possible Causes:**
- Google Cloud Storage not configured
- Missing environment variables
- Insufficient permissions
- Network connectivity issues

## Diagnostic Tools

### 1. Run the Diagnostic Script

First, run the comprehensive diagnostic script to identify issues:

```bash
cd mooves/nodejs-backend
node scripts/diagnose-image-issues.js
```

This script will:
- Check environment configuration
- Analyze database image records
- Verify Google Cloud Storage access
- Find orphaned files
- Check for broken URLs
- Provide recommendations

### 2. Run the Enhanced Fix Script

If issues are found, run the enhanced fix script:

```bash
cd mooves/nodejs-backend
node scripts/fix-image-urls-enhanced.js
```

This script will:
- Fix local storage URLs by uploading to Google Cloud Storage
- Repair broken GCS URLs
- Clean up orphaned files
- Provide a detailed summary

## Manual Troubleshooting Steps

### Step 1: Check Environment Variables

Ensure these environment variables are set correctly:

```bash
# Required for Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name

# Either set credentials as JSON string
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}

# Or set individual credential fields
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
```

### Step 2: Verify Google Cloud Storage Access

Test bucket access manually:

```bash
cd mooves/nodejs-backend
node test-bucket-access.js
```

### Step 3: Check Database Records

Query the database to see image storage status:

```sql
-- Check all images and their storage types
SELECT 
  id,
  userId,
  imageUrl,
  googleStorageDestination,
  isPrimary,
  createdAt
FROM Images
ORDER BY createdAt DESC
LIMIT 20;

-- Check for local storage images
SELECT COUNT(*) as local_images
FROM Images 
WHERE imageUrl LIKE '/uploads/%';

-- Check for GCS images
SELECT COUNT(*) as gcs_images
FROM Images 
WHERE imageUrl LIKE '%storage.googleapis.com%';
```

### Step 4: Verify File Existence

Check if files actually exist in Google Cloud Storage:

```bash
# List files in the dating-app folder
gsutil ls gs://your-bucket-name/dating-app/
```

## Common Fixes

### Fix 1: Migrate Local Images to Google Cloud Storage

If you have images still stored locally:

```bash
cd mooves/nodejs-backend
node scripts/fix-image-urls.js
```

### Fix 2: Clean Up Orphaned Files

Remove files that don't have database records:

```bash
cd mooves/nodejs-backend
node scripts/cleanup-missing-images.js
```

### Fix 3: Update Environment Variables

If Google Cloud Storage is not configured:

```bash
# Set project ID
heroku config:set GOOGLE_CLOUD_PROJECT_ID="your-project-id" --app your-app-name

# Set bucket name
heroku config:set GOOGLE_CLOUD_BUCKET_NAME="your-bucket-name" --app your-app-name

# Set credentials
heroku config:set GOOGLE_CLOUD_CREDENTIALS="$(cat your-service-account-key.json)" --app your-app-name
```

### Fix 4: Repair Broken URLs

If images have incorrect URLs in the database:

```javascript
// Example: Update a specific image URL
const { Image } = require('./models');

async function fixSpecificImage(imageId, correctUrl) {
  const image = await Image.findByPk(imageId);
  if (image) {
    await image.update({
      imageUrl: correctUrl,
      googleStorageDestination: 'dating-app/filename.jpg'
    });
    console.log('Image URL updated successfully');
  }
}
```

## Prevention Measures

### 1. Add Image URL Validation

Add validation to the upload process:

```javascript
// In uploadProfilePicture function
const validateImageUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
```

### 2. Implement Retry Logic

Add retry logic for failed uploads:

```javascript
const uploadWithRetry = async (filePath, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await googleStorage.uploadImage(filePath);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Upload attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 3. Regular Cleanup Scripts

Set up automated cleanup:

```bash
# Add to cron job or scheduled task
0 2 * * * cd /path/to/mooves/nodejs-backend && node scripts/cleanup-missing-images.js
```

## Monitoring

### 1. Set Up Logging

Enable detailed logging for image operations:

```javascript
// In googleStorageService.js
console.log(`📤 Upload attempt: ${filePath}`);
console.log(`✅ Upload successful: ${destination}`);
console.log(`❌ Upload failed: ${error.message}`);
```

### 2. Monitor Google Cloud Storage Usage

Track storage usage and costs:

```bash
# Check bucket usage
gsutil du -sh gs://your-bucket-name/

# List recent files
gsutil ls -l gs://your-bucket-name/dating-app/ | head -20
```

### 3. Database Monitoring

Monitor image-related database operations:

```sql
-- Check for recent image uploads
SELECT COUNT(*) as uploads_today
FROM Images 
WHERE DATE(createdAt) = CURDATE();

-- Check for failed uploads (images without GCS destination)
SELECT COUNT(*) as local_images
FROM Images 
WHERE googleStorageDestination IS NULL;
```

## Emergency Recovery

If images are completely lost:

1. **Check backups** - Restore from database backup
2. **Re-upload** - Ask users to re-upload their images
3. **Use fallback** - Temporarily use local storage while fixing GCS

## Support

If you're still experiencing issues:

1. Run the diagnostic script and share the output
2. Check the application logs for error messages
3. Verify Google Cloud Storage permissions
4. Test with a simple image upload

## Quick Commands Reference

```bash
# Run diagnostic
node scripts/diagnose-image-issues.js

# Fix image URLs
node scripts/fix-image-urls-enhanced.js

# Clean up orphaned files
node scripts/cleanup-missing-images.js

# Test bucket access
node test-bucket-access.js

# Check environment
echo $GOOGLE_CLOUD_PROJECT_ID
echo $GOOGLE_CLOUD_BUCKET_NAME
``` 