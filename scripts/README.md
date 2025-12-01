# Mooves Deployment Scripts

This directory contains scripts to automate the deployment process for Mooves to F-Droid.

## Scripts

### 1. `update-version.sh` - Version Update Script

Updates version numbers in both `pubspec.yaml` and `build.gradle` files.

#### Usage:

**Interactive mode:**
```bash
./scripts/update-version.sh
```

**Command line mode:**
```bash
# Update version and auto-increment version code
./scripts/update-version.sh 1.0.4

# Update both version and version code
./scripts/update-version.sh 1.0.4 108
```

#### Options in interactive mode:
1. **Auto-increment patch version** (e.g., 1.0.2 → 1.0.3)
2. **Auto-increment minor version** (e.g., 1.0.2 → 1.1.0)
3. **Auto-increment major version** (e.g., 1.0.2 → 2.0.0)
4. **Enter custom version**
5. **Exit**

### 2. `deploy-to-fdroid.sh` - F-Droid Deployment Script

Automates the entire process of building and deploying Mooves to F-Droid.

#### Usage:
```bash
./scripts/deploy-to-fdroid.sh
```

#### What it does:
1. ✅ Gets current version information
2. ✅ Cleans Flutter project
3. ✅ Gets Flutter dependencies
4. ✅ Checks keystore configuration
5. ✅ Builds release APK with proper signing
6. ✅ Verifies APK signature
7. ✅ Copies APK to F-Droid repository
8. ✅ Updates F-Droid repository index
9. ✅ Commits and pushes changes to GitHub

#### Prerequisites:
- Valid `android/key.properties` file
- Valid `android/release.keystore` file
- F-Droid repository at `../fdroid`
- `fdroid` command available in PATH

## Complete Workflow

### For a new release:

1. **Update version:**
   ```bash
   ./scripts/update-version.sh
   ```

2. **Test your changes:**
   ```bash
   cd dating_app
   flutter test
   flutter run
   ```

3. **Deploy to F-Droid:**
   ```bash
   ./scripts/deploy-to-fdroid.sh
   ```

4. **Commit version changes:**
   ```bash
   git add .
   git commit -m "Release version 1.0.4"
   git push origin development
   ```

### Quick deployment (if version is already updated):
```bash
./scripts/deploy-to-fdroid.sh
```

## Repository URLs

- **Main app repository:** https://github.com/Klas96/mooves
- **F-Droid repository:** https://github.com/Klas96/fdroid
- **F-Droid repo URL:** https://klas96.github.io/fdroid/repo

## Troubleshooting

### Common Issues:

1. **"APK is still debug signed"**
   - Check that `android/key.properties` exists and points to the correct keystore
   - Ensure `android/release.keystore` exists

2. **"Could not find Flutter project"**
   - Make sure you're running the script from the `mooves` directory

3. **"Could not find F-Droid repository"**
   - Ensure the F-Droid repository exists at `../fdroid`

4. **"fdroid command not found"**
   - Install F-Droid server tools: `pip install fdroidserver`

### Manual Steps (if scripts fail):

1. **Build APK manually:**
   ```bash
   cd dating_app
   flutter clean
   flutter pub get
   flutter build apk --release --target-platform android-arm64
   ```

2. **Copy to F-Droid:**
   ```bash
   cp dating_app/build/app/outputs/flutter-apk/app-release.apk ../fdroid/repo/com.mooves.app_107.apk
   ```

3. **Update F-Droid index:**
   ```bash
   cd ../fdroid
   fdroid update -c
   git add .
   git commit -m "Manual deployment"
   git push origin master
   ```

## Security Notes

- Keep your `android/release.keystore` and `android/key.properties` files secure
- Never commit these files to version control
- Back up your keystore file - losing it means you can't update your app
- The keystore password in this setup is `mooves123` - change it for production use 