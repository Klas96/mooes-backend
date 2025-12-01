#!/bin/bash
# Simple deployment wrapper - automatically loads environment and deploys

set -e

echo "🚀 Mooves Backend Deployment"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the nodejs-backend directory"
    echo "   Please run: cd mooves/nodejs-backend && ./scripts/deploy.sh"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required but not installed"
    exit 1
fi

# Check if js-yaml is available
if ! node -e "require('js-yaml')" &> /dev/null; then
    echo "❌ Error: js-yaml package is required but not installed"
    echo "   Please run: npm install"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Run the deployment script
echo ""
echo "🔧 Starting deployment..."
./scripts/deploy-gcloud-run.sh

echo ""
echo "🎉 Deployment completed!"
echo "   Your app is available at: https://mooves-backend-nsx5nsymuq-uc.a.run.app" 