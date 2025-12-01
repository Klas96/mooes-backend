# Android Signing Setup Guide

This guide will help you set up proper signing configuration for your Android app to fix the CI/CD build failures.

## Step 1: Generate a Keystore

Run the following command to generate a keystore file:

```bash
keytool -genkey -v -keystore key.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

When prompted:
- Enter a keystore password (save this for later)
- Enter your name, organization, city, state, country
- Enter a key password (can be the same as keystore password)

## Step 2: Move Keystore to Project

Move the generated `key.jks` file to `dating_app/android/app/` directory.

## Step 3: Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

1. **KEYSTORE_BASE64**: The base64 encoded keystore file
   ```bash
   base64 -i dating_app/android/app/key.jks | pbcopy  # macOS
   # or
   base64 -i dating_app/android/app/key.jks | xclip -selection clipboard  # Linux
   ```

2. **KEYSTORE_PASSWORD**: The keystore password you entered during generation

3. **KEY_ALIAS**: `upload` (or whatever alias you used)

4. **KEY_PASSWORD**: The key password you entered during generation

## Step 4: Test Local Build

For local development, you can still build without the keystore:
```bash
cd dating_app
flutter build apk --release
```

The build.gradle is configured to fall back to debug signing for local development.

## Step 5: Test CI/CD Build

Trigger the Android build workflow manually from GitHub Actions to test the signing configuration.

## Troubleshooting

If you encounter issues:

1. **Invalid keystore format**: Make sure the keystore was generated correctly
2. **Password mismatch**: Double-check the passwords in GitHub secrets
3. **Base64 encoding**: Ensure the keystore is properly base64 encoded
4. **File path**: Verify the keystore file is in the correct location

## Security Notes

- Never commit the keystore file to version control
- Keep your keystore passwords secure
- Consider using a different keystore for production vs development
- The keystore file is required for Play Store uploads 