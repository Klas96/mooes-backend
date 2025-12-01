#!/bin/bash

# Version Release Script
# This script helps create version branches and trigger Google Play Store deployments

set -e

echo "🚀 Version Release Script"
echo "========================"

# Function to validate version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "❌ Error: Version must be in format X.Y.Z (e.g., 0.0.1, 1.2.3)"
        exit 1
    fi
}

# Function to check if version branch exists
version_exists() {
    local version=$1
    if git show-ref --verify --quiet refs/heads/v.$version; then
        return 0
    else
        return 1
    fi
}

# Get version from user
read -p "Enter version number (e.g., 0.0.3): " VERSION
validate_version "$VERSION"

# Check if version branch already exists
if version_exists "$VERSION"; then
    echo "⚠️  Warning: Version branch v.$VERSION already exists!"
    read -p "Do you want to continue? (y/n): " continue_choice
    if [[ ! $continue_choice =~ ^[Yy]$ ]]; then
        echo "❌ Aborted."
        exit 1
    fi
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"

# Create version branch
echo "🔧 Creating version branch v.$VERSION..."
git checkout -b v.$VERSION

# Update version in build.gradle
echo "📝 Updating version in build.gradle..."
sed -i "s/versionCode = [0-9]*/versionCode = $(date +%s)/" dating_app/android/app/build.gradle
sed -i "s/versionName = \"[^\"]*\"/versionName = \"$VERSION\"/" dating_app/android/app/build.gradle

# Commit changes
echo "💾 Committing version changes..."
git add dating_app/android/app/build.gradle
git commit -m "Bump version to $VERSION"

# Push to remote
echo "📤 Pushing version branch to remote..."
git push origin v.$VERSION

# Switch back to original branch
echo "🔄 Switching back to $CURRENT_BRANCH..."
git checkout $CURRENT_BRANCH

echo
echo "✅ Version release setup complete!"
echo
echo "📊 What happens next:"
echo "1. GitHub Actions will automatically trigger the 'Google Play Store Deployment' workflow"
echo "2. The app will be built and signed"
echo "3. The AAB will be uploaded to Google Play Store internal testing track"
echo "4. A GitHub release will be created with the AAB file"
echo
echo "🔗 Monitor the deployment:"
echo "   GitHub Actions: https://github.com/Klas96/mooves/actions"
echo "   Google Play Console: https://play.google.com/console"
echo
echo "📋 Version branch: v.$VERSION"
echo "📋 Version code: $(date +%s)"
echo "📋 Version name: $VERSION" 