# Google Play Store Deployment Setup Guide

This guide will help you set up automatic deployment to Google Play Store when you push version branches.

## Prerequisites

1. **Google Play Console Account** with developer access
2. **Service Account** for API access
3. **App already created** in Google Play Console

## Step 1: Create Google Play Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Play Android Developer API
4. Create a Service Account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name like "play-store-deploy"
   - Grant "Editor" role
   - Create and download the JSON key file

## Step 2: Configure Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to "Setup" → "API access"
4. Link your Google Cloud project
5. Grant access to your service account with "Release apps to testing tracks" permission

## Step 3: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

### Required Secrets (you already have these):
- `KEYSTORE_BASE64` - Your keystore file in base64
- `KEYSTORE_PASSWORD` - Keystore password
- `KEY_ALIAS` - Key alias
- `KEY_PASSWORD` - Key password

### New Secrets for Play Store:
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` - The entire JSON content of your service account key file

## Step 4: Test the Setup

1. **Push a version branch:**
   ```bash
   git checkout -b v.0.0.3
   git push origin v.0.0.3
   ```

2. **Monitor the workflow:**
   - Go to GitHub Actions tab
   - Look for "Google Play Store Deployment" workflow
   - Check that it builds and uploads successfully

## Step 5: Deployment Tracks

The workflow is configured to deploy to different tracks:

- **Internal Testing** (default): For initial testing
- **Production**: For public release

To change the track, modify the `track` parameter in `dating_app/fastlane/Fastfile`.

## Workflow Features

### ✅ **Automatic Triggers:**
- Triggers on any branch starting with `v.` (e.g., `v.0.0.1`, `v.0.0.2`)
- Manual trigger available via GitHub Actions

### ✅ **Build Process:**
- Builds signed AAB (Android App Bundle)
- Uses your keystore for signing
- Uploads artifact for backup

### ✅ **Deployment:**
- Uploads to Google Play Store internal track
- Creates GitHub release with AAB file
- Handles errors gracefully

### ✅ **Security:**
- All credentials stored as GitHub secrets
- Service account with minimal required permissions
- No hardcoded secrets in code

## Troubleshooting

### Common Issues:

1. **Service Account Permission Error:**
   - Ensure service account has "Release apps to testing tracks" permission
   - Check that Google Play Android Developer API is enabled

2. **AAB Upload Fails:**
   - Verify the AAB file is properly signed
   - Check that version code is higher than previous releases

3. **Workflow Not Triggering:**
   - Ensure branch name starts with `v.`
   - Check that branch is pushed to remote repository

### Manual Deployment:

If you need to deploy manually:
```bash
cd dating_app
fastlane deploy_to_play_store
```

## Next Steps

1. **Set up version management** in your app
2. **Configure release notes** automation
3. **Set up staging/production environments**
4. **Add automated testing** before deployment

## Security Notes

- Never commit service account JSON files to version control
- Rotate service account keys regularly
- Use least privilege principle for service account permissions
- Monitor deployment logs for any security issues 