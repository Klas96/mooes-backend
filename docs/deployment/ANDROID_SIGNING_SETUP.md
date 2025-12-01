# Android Signing Setup Guide

This guide will help you fix the `:app:validateSigningRelease` build failure by properly configuring Android app signing.

## Quick Fix

### Option 1: Set up passwords for existing keystore (Recommended)

1. **Run the password setup script:**
   ```bash
   ./scripts/setup-keystore-passwords.sh
   ```
   This will prompt you for the keystore passwords and update the `key.properties` file.

2. **Test the build:**
   ```bash
   cd dating_app
   flutter build apk --release
   ```

### Option 2: Generate a new keystore

If you don't remember the passwords for the existing keystore:

1. **Generate a new keystore:**
   ```bash
   ./scripts/generate-keystore.sh
   ```

2. **Set up passwords:**
   ```bash
   ./scripts/setup-keystore-passwords.sh
   ```

## What was fixed

### 1. Updated `build.gradle`
- Added support for `key.properties` file for local development
- Maintained environment variable support for CI/CD
- Proper fallback logic for signing configuration

### 2. Created `key.properties` template
- Located at `dating_app/android/key.properties`
- Contains keystore configuration for local builds
- Already in `.gitignore` for security

### 3. Enhanced signing configuration
- Local development: Uses `key.properties` file
- CI/CD: Uses GitHub secrets via environment variables
- Fallback: Uses debug signing if no keystore is available

## GitHub Actions Setup

For CI/CD builds, you need to set up these secrets in your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `KEYSTORE_BASE64`: Base64 encoded keystore file
   - `KEYSTORE_PASSWORD`: Keystore password
   - `KEY_ALIAS`: Key alias (usually "upload")
   - `KEY_PASSWORD`: Key password

### Generate base64 keystore for GitHub:
```bash
base64 -i dating_app/android/app/key.jks
```

## File Structure

```
dating_app/android/
├── app/
│   ├── key.jks                    # Keystore file (not in git)
│   └── build.gradle              # Updated with signing config
├── key.properties                # Keystore properties (not in git)
└── .gitignore                   # Excludes keystore files
```

## Troubleshooting

### Build still fails with signing error
1. Make sure `key.properties` has correct passwords
2. Verify keystore file exists at `dating_app/android/app/key.jks`
3. Check that passwords match the keystore

### "Invalid keystore format" error
1. Regenerate the keystore using the script
2. Make sure you're using the correct passwords

### Local build works but CI fails
1. Check GitHub secrets are set correctly
2. Verify the base64 keystore is properly encoded
3. Ensure all required secrets are present

## Security Notes

- Never commit keystore files or `key.properties` to version control
- Keep your keystore passwords secure
- Use different keystores for development and production
- The keystore file is required for Play Store uploads

## Next Steps

After setting up signing:

1. **Test local build:**
   ```bash
   cd dating_app
   flutter build apk --release
   ```

2. **Test CI/CD build:**
   - Go to GitHub Actions
   - Manually trigger the Android build workflow

3. **For Play Store deployment:**
   - Use the same keystore for all future releases
   - Keep the keystore file secure and backed up 