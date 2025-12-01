#!/bin/bash
# Setup script for Google Cloud Run deployment

# Load environment variables from project root .env
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

echo "🚀 Setting up Google Cloud Run deployment environment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed"
    echo ""
    echo "📥 Install Google Cloud CLI:"
    echo ""
    echo "macOS:"
    echo "  brew install google-cloud-sdk"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -"
    echo "  echo 'deb https://packages.cloud.google.com/apt cloud-sdk main' | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list"
    echo "  sudo apt-get update && sudo apt-get install google-cloud-cli"
    echo ""
    echo "Windows:"
    echo "  Download from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ Google Cloud CLI is installed"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo ""
    echo "📥 Install Docker:"
    echo "  https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud:"
    echo "  gcloud auth login"
    echo ""
    echo "After authentication, run this script again."
    exit 1
fi

echo "✅ Authenticated with Google Cloud"

# Set the project
echo "🏗️  Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com --project $PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project $PROJECT_ID
gcloud services enable containerregistry.googleapis.com --project $PROJECT_ID

# Configure Docker for Google Cloud
echo "🐳 Configuring Docker for Google Cloud..."
gcloud auth configure-docker --project $PROJECT_ID

echo ""a
echo "✅ Google Cloud Run environment is ready!"
echo ""
echo "📋 Next steps:"
echo "1. Set your environment variables:"
echo "   export OPENAI_API_KEY='your-openai-api-key'"
echo "   export DATABASE_URL='your-database-url'"
echo "   export JWT_SECRET='your-jwt-secret'"
echo "   export EMAIL_USER='mooves@klasholmgren.se'"
echo "   export EMAIL_PASSWORD='your-app-password'"
echo "   export EMAIL_HOST='mailcluster.loopia.se'"
echo "   export EMAIL_PORT='587'"
echo "   export EMAIL_SECURE='false'"
echo ""
echo "2. Or use the interactive setup:"
echo "   ./setup-env.sh"
echo ""
echo "3. Deploy to Cloud Run:"
echo "   ./deploy-gcloud-run.sh"
echo ""
echo "📚 For more information, see: HEROKU_TO_CLOUD_RUN_MIGRATION.md" 