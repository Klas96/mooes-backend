#!/bin/bash

# Load environment variables from .env-config.yaml
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_CONFIG_FILE="$PROJECT_ROOT/.env-config.yaml"
CLOUDRUN_ENV_FILE="$PROJECT_ROOT/cloudrun-env.yaml"

if [ ! -f "$ENV_CONFIG_FILE" ]; then
  echo "❌ .env-config.yaml not found at $ENV_CONFIG_FILE"
  exit 1
fi

echo "📁 Loading environment variables from $ENV_CONFIG_FILE..."

# Convert .env-config.yaml to cloudrun-env.yaml (remove comments and blank lines)
grep -v '^#' "$ENV_CONFIG_FILE" | grep -v '^$' > "$CLOUDRUN_ENV_FILE"

echo "✅ Generated $CLOUDRUN_ENV_FILE for Cloud Run deployment."

# Show a preview
head "$CLOUDRUN_ENV_FILE"

# Update Cloud Run with all environment variables from the file
echo "🚀 Updating Cloud Run service with all environment variables..."

gcloud run services update mooves-backend \
    --region=us-central1 \
    --project=fresh-oath-337920 \
    --env-vars-file="$CLOUDRUN_ENV_FILE"

echo "✅ Cloud Run service updated successfully!"
echo "🔄 Service is redeploying... Please wait a moment before testing image uploads and login." 