# Privacy Policy Setup for Mooves

## Google Play Store Requirements

Your app uses camera permissions (`android.permission.CAMERA`) which requires a privacy policy to be published on Google Play Store.

## Current Privacy Policy

The privacy policy is already created and available at:
- `privacy-policy.html` - HTML version
- `PRIVACY_POLICY.md` - Markdown version

## Hosting Options

### Option 1: GitHub Pages (Recommended)
1. Create a GitHub repository for your privacy policy
2. Upload the `privacy-policy.html` file
3. Enable GitHub Pages in repository settings
4. Your privacy policy will be available at: `https://yourusername.github.io/repository-name/privacy-policy.html`

### Option 2: Netlify (Free)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `privacy-policy.html` file
3. Get a free URL like: `https://your-app-name.netlify.app/privacy-policy.html`

### Option 3: Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize Firebase: `firebase init hosting`
3. Upload the privacy policy file
4. Deploy: `firebase deploy`

## Google Play Console Setup

1. Go to your app in Google Play Console
2. Navigate to "App content" → "Privacy policy"
3. Add your hosted privacy policy URL
4. Save and submit for review

## Version Code Fix

The version code has been updated from 2 to 3 in:
- `android/app/build.gradle` (versionCode = 3)
- `pubspec.yaml` (version: 1.0.1+3)

## Next Steps

1. Choose a hosting option above
2. Update the privacy policy URL in Google Play Console
3. Build and upload your new APK/AAB with version code 3
4. Submit for review

## Privacy Policy Content

The privacy policy already covers:
- Camera permissions usage
- Location data collection
- Profile information handling
- Data sharing practices
- User rights
- Contact information

No changes needed to the privacy policy content itself. 