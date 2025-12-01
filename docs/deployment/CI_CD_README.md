# CI/CD Setup for Mooves

This repository includes GitHub Actions workflows for automatically building iOS and Android apps.

## Workflows

### iOS Build (`ios-build.yml`)
- **Trigger**: Push to `main`/`develop` branches, pull requests, or manual dispatch
- **Runner**: macOS (required for iOS builds)
- **Outputs**: 
  - Debug build artifacts
  - Release build artifacts (no code signing)
  - Build logs

### Android Build (`android-build.yml`)
- **Trigger**: Push to `main`/`develop` branches, pull requests, or manual dispatch
- **Runner**: Ubuntu
- **Outputs**:
  - APK file
  - App Bundle (AAB) file

## How to Use

### 1. Push to GitHub
```bash
git add .
git commit -m "Add CI/CD workflows"
git push origin main
```

### 2. Check Build Status
1. Go to your GitHub repository
2. Click on the "Actions" tab
3. You'll see the workflows running automatically

### 3. Download Build Artifacts
1. Go to the Actions tab
2. Click on a completed workflow run
3. Scroll down to "Artifacts"
4. Download the build files you need

## iOS Build Notes

### Current Setup
- Builds without code signing (for CI/CD purposes)
- Creates both debug and release builds
- Uploads build artifacts for 30 days

### For App Store Distribution
To create a properly signed iOS app for App Store distribution, you'll need:

1. **Apple Developer Account**
2. **Code Signing Certificates**
3. **Provisioning Profiles**

You can add these as GitHub Secrets and modify the workflow to include proper code signing.

### Manual Code Signing Setup
If you want to add code signing later:

1. Add these secrets to your GitHub repository:
   - `APPLE_CERTIFICATE`: Your iOS certificate
   - `APPLE_CERTIFICATE_PASSWORD`: Certificate password
   - `APPLE_PROVISIONING_PROFILE`: Your provisioning profile
   - `APPLE_TEAM_ID`: Your Apple Developer Team ID

2. Update the `ios-build.yml` workflow to use these secrets

## Android Build Notes

- Creates both APK and AAB files
- APK can be installed directly on devices
- AAB is required for Google Play Store

## Troubleshooting

### Common Issues

1. **iOS Build Fails**
   - Check that all iOS dependencies are properly configured
   - Ensure `ios/Podfile` is up to date
   - Verify iOS deployment target settings

2. **Android Build Fails**
   - Check Android SDK setup
   - Verify `android/app/build.gradle` configuration
   - Ensure all Android permissions are properly declared

3. **Dependencies Issues**
   - Run `flutter pub get` locally to verify dependencies
   - Check `pubspec.yaml` for any version conflicts

### Local Testing
Before pushing, test builds locally:

```bash
# Test iOS build
cd dating_app
flutter build ios --release --no-codesign

# Test Android build
flutter build apk --release
```

## Next Steps

1. **Push your code** to trigger the first build
2. **Monitor the builds** in GitHub Actions
3. **Download artifacts** when builds complete
4. **Set up code signing** when ready for distribution

## Support

If you encounter issues:
1. Check the build logs in GitHub Actions
2. Verify your local Flutter setup with `flutter doctor`
3. Ensure all dependencies are properly configured 