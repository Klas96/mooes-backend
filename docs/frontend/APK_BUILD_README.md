# Mooves APK Build & Upload Guide

This guide explains how to build and upload APK files to Google Drive using the provided scripts.

## 📱 Quick Start

### Option 1: Simple Build (Recommended)
```bash
cd dating_app
./build-apk.sh
```

### Option 2: Direct Script
```bash
cd dating_app
./scripts/build-and-upload-apk.sh
```

## 🔧 Prerequisites

### 1. Flutter Installation
Make sure Flutter is installed and configured:
```bash
flutter --version
flutter doctor
```

### 2. Android SDK
Ensure Android SDK is properly configured:
```bash
flutter doctor --android-licenses
```

### 3. rclone Setup (for Google Drive upload)
If you haven't set up rclone yet:
```bash
./scripts/setup-rclone.sh
```

Or manually:
1. Install rclone: https://rclone.org/install/
2. Configure Google Drive: `rclone config`
3. Name the remote `gdrive`

## 📋 What the Scripts Do

### Main Build Script (`build-and-upload-apk.sh`)
1. ✅ Validates Flutter installation
2. ✅ Extracts version from `pubspec.yaml`
3. ✅ Cleans previous builds
4. ✅ Gets dependencies
5. ✅ Builds release APK
6. ✅ Creates timestamped backup
7. ✅ Uploads to Google Drive
8. ✅ Creates build summary

### Upload Script (`upload-apk-to-gdrive.sh`)
- Uploads existing APK file to Google Drive
- Usage: `./scripts/upload-apk-to-gdrive.sh <path-to-apk>`

## 📁 Google Drive Structure

The scripts create this folder structure:
```
Google Drive/
└── Mooves/
    └── releases/
        └── android/
            ├── mooves_v1.0.0_20250630_143022.apk  (latest)
            └── backups/
                └── mooves_v1.0.0_20250630_143022.apk  (backup)
```

## 🚀 Build Process

### 1. Version Management
- Version is automatically extracted from `pubspec.yaml`
- APK filename format: `mooves_v{VERSION}_{TIMESTAMP}.apk`
- Example: `mooves_v1.0.0_20250630_143022.apk`

### 2. Build Steps
```bash
flutter clean
flutter pub get
flutter build apk --release
```

### 3. Upload Process
- Uploads to `gdrive:Mooves/releases/android/`
- Creates backup in `gdrive:Mooves/releases/android/backups/`
- Generates build summary file

## 📊 Output Files

### Local Files
- `build/app/outputs/flutter-apk/app-release.apk` (original)
- `build/app/outputs/flutter-apk/mooves_v{VERSION}_{TIMESTAMP}.apk` (timestamped)
- `build_info_{TIMESTAMP}.txt` (build summary)

### Google Drive Files
- `Mooves/releases/android/mooves_v{VERSION}_{TIMESTAMP}.apk` (latest)
- `Mooves/releases/android/backups/mooves_v{VERSION}_{TIMESTAMP}.apk` (backup)

## 🔍 Troubleshooting

### Common Issues

#### 1. Flutter not found
```bash
# Install Flutter
curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.19.6-stable.tar.xz
tar xf flutter_linux_3.19.6-stable.tar.xz
export PATH="$PATH:`pwd`/flutter/bin"
```

#### 2. Android SDK issues
```bash
flutter doctor --android-licenses
flutter config --android-sdk /path/to/android/sdk
```

#### 3. rclone not configured
```bash
./scripts/setup-rclone.sh
```

#### 4. Google Drive API issues
1. Go to https://console.developers.google.com/
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Reconfigure rclone: `rclone config`

### Error Messages

| Error | Solution |
|-------|----------|
| `pubspec.yaml not found` | Run from `dating_app` directory |
| `Flutter is not installed` | Install Flutter |
| `Android SDK not configured` | Run `flutter doctor` |
| `rclone is not installed` | Install rclone |
| `Google Drive remote not configured` | Run `./scripts/setup-rclone.sh` |

## 📈 Build Summary

After each build, a summary file is created with:
- Build date and time
- Version number
- APK filename
- File size
- Flutter version
- Upload locations

## 🔗 Useful Commands

### Check current version
```bash
grep 'version:' pubspec.yaml
```

### List uploaded APKs
```bash
rclone ls gdrive:Mooves/releases/android/ --human-readable
```

### Download specific APK
```bash
rclone copy gdrive:Mooves/releases/android/mooves_v1.0.0_20250630_143022.apk ./
```

### Test Google Drive connection
```bash
rclone lsd gdrive:
```

## 📝 Notes

- The script automatically handles versioning and timestamps
- APKs are backed up automatically
- Build summaries are saved locally
- The script includes comprehensive error checking
- Colored output makes it easy to follow progress

## 🎯 Next Steps

After building and uploading:
1. Share the Google Drive link with testers
2. Update version in `pubspec.yaml` for next release
3. Consider setting up automated builds with GitHub Actions 