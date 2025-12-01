# Mooves Documentation

Welcome to the Mooves documentation! This directory contains all project documentation organized by category.

## 📚 Documentation Structure

### 🏗️ [Backend Documentation](./backend/)
Backend-specific documentation for the Node.js API server.

- **Core Documentation**
  - [README.md](./backend/README.md) - Main backend documentation
  - [AI Chat Implementation](./backend/AI_CHAT_README.md) - AI chat feature guide
  - [Environment Setup](./backend/ENVIRONMENT_SETUP.md) - Environment configuration
  - [Dummy Profiles](./backend/DUMMY_PROFILES_README.md) - Test data management

- **Database & Migration**
  - [PostgreSQL Migration](./backend/migrate-to-postgresql.md) - Database migration guide
  - [Google Cloud Migration](./backend/GCLOUD_MIGRATION_GUIDE.md) - GCloud migration
  - [Heroku Database Options](./backend/heroku-database-options.md) - Heroku DB setup
  - [Images Fix Guide](./backend/FIX-IMAGES-GUIDE.md) - Image handling fixes

- **Deployment & Infrastructure**
  - [Heroku to Cloud Run Migration](./backend/HEROKU_TO_CLOUD_RUN_MIGRATION.md) - Migration guide
  - [Secure Deployment](./backend/SECURE_DEPLOYMENT_GUIDE.md) - Security deployment
  - [Quick Start GCloud](./backend/QUICK_START_GCLOUD.md) - GCloud quick start
  - [Quick Start](./backend/QUICK-START.md) - General quick start
  - [Heroku README](./backend/README-HEROKU.md) - Heroku deployment

- **Authentication & Security**
  - [SuperTokens Setup](./backend/supertokens-setup.md) - Auth system setup
  - [OpenAI API Fix](./backend/OPENAI_API_FIX.md) - OpenAI integration fixes

### 📱 [Frontend Documentation](./frontend/)
Flutter app documentation and guides.

- **Core Documentation**
  - [README.md](./frontend/README.md) - Main frontend documentation
  - [APK Build Guide](./frontend/APK_BUILD_README.md) - Android APK building
  - [Error Handling](./frontend/ERROR_HANDLING_GUIDE.md) - Error handling patterns
  - [Session Persistence](./frontend/SESSION_PERSISTENCE_GUIDE.md) - Session management

- **Billing & Payments**
  - [Billing Implementation Summary](./frontend/BILLING_IMPLEMENTATION_SUMMARY.md) - Payment system overview
  - [Google Play Billing](./frontend/GOOGLE_PLAY_BILLING_SETUP.md) - Android billing setup
  - [iOS App Store Billing](./frontend/IOS_APP_STORE_BILLING_SETUP.md) - iOS billing setup

- **Authentication & Privacy**
  - [Email Verification Setup](./frontend/EMAIL_VERIFICATION_SETUP.md) - Email verification
  - [Privacy Policy](./frontend/PRIVACY_POLICY.md) - Privacy policy
  - [Privacy Policy Setup](./frontend/PRIVACY_POLICY_SETUP.md) - Privacy setup guide
  - [Privacy Policy Template](./frontend/PRIVACY_POLICY_TEMPLATE.md) - Privacy template
  - [SuperTokens Flutter Setup](./frontend/supertokens-flutter-setup.md) - Flutter auth setup

### 🚀 [Deployment Documentation](./deployment/)
Deployment and CI/CD guides.

- **General Deployment**
  - [Deployment Guide](./deployment/DEPLOYMENT.md) - General deployment instructions
  - [CI/CD README](./deployment/CI_CD_README.md) - Continuous integration/deployment
  - [GCloud Redeployment Summary](./deployment/GCLOUD_REDEPLOYMENT_SUMMARY.md) - GCloud deployment

- **Platform-Specific**
  - [Android Signing Setup](./deployment/ANDROID_SIGNING_SETUP.md) - Android app signing
  - [Google Cloud Storage Setup](./deployment/setup-google-cloud-storage.md) - GCS configuration
  - [Heroku Secret Setup](./deployment/setup-heroku-secret.md) - Heroku secrets
  - [Play Store Deployment](./deployment/setup-play-store-deployment.md) - Play Store setup

### 🔐 [Security Documentation](./security/)
Security guides and fixes.

- **Security Guides**
  - [Security Guide](./security/SECURITY_GUIDE.md) - Main security documentation
  - [Security Fixes](./security/SECURITY_FIXES.md) - Security fixes applied
  - [GitGuardian Resolution](./security/GITGUARDIAN_RESOLUTION_SUMMARY.md) - Secret scanning fixes
  - [GitGuardian Fixes Summary](./security/GITGUARDIAN_FIXES_SUMMARY.md) - Security fixes summary

### 📖 [General Guides](./guides/)
General project guides and documentation.

- **Project Setup**
  - [Setup Instructions](./guides/SETUP_INSTRUCTIONS.md) - Project setup guide
  - [Testing Guide](./guides/TESTING.md) - Testing documentation
  - [Contributing Guide](./guides/CONTRIBUTING.md) - Contribution guidelines
  - [Branch Structure](./guides/BRANCH_STRUCTURE.md) - Git branch organization

- **Feature Guides**
  - [GPS Implementation](./guides/GPS_IMPLEMENTATION_README.md) - GPS feature guide
  - [Notification Setup](./guides/NOTIFICATION_SETUP.md) - Push notifications
  - [Network Error Troubleshooting](./guides/NETWORK_ERROR_TROUBLESHOOTING.md) - Network issues

## 🗂️ Quick Navigation

### For New Developers
1. Start with [Setup Instructions](./guides/SETUP_INSTRUCTIONS.md)
2. Read [Contributing Guide](./guides/CONTRIBUTING.md)
3. Check [Testing Guide](./guides/TESTING.md)

### For Backend Development
1. [Backend README](./backend/README.md)
2. [Environment Setup](./backend/ENVIRONMENT_SETUP.md)
3. [Quick Start](./backend/QUICK-START.md)

### For Frontend Development
1. [Frontend README](./frontend/README.md)
2. [Error Handling Guide](./frontend/ERROR_HANDLING_GUIDE.md)
3. [APK Build Guide](./frontend/APK_BUILD_README.md)

### For Deployment
1. [Deployment Guide](./deployment/DEPLOYMENT.md)
2. [CI/CD README](./deployment/CI_CD_README.md)
3. [Security Guide](./security/SECURITY_GUIDE.md)

## 📝 Documentation Standards

- All documentation should be clear and concise
- Include code examples where appropriate
- Keep guides up-to-date with code changes
- Use consistent formatting and structure
- Include troubleshooting sections for complex topics

## 🔄 Maintenance

This documentation structure should be maintained as the project evolves:
- Update links when files are moved
- Add new documentation to appropriate categories
- Remove outdated documentation
- Keep the main README.md files updated 