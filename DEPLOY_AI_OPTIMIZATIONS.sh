#!/bin/bash

# AI Chat Optimizations Deployment Script
# Deploys all improvements: GPT-4, streaming, database persistence, prompt optimization, smart matching

set -e  # Exit on any error

echo "🚀 Mooves AI Optimization Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="/home/klas/Kod/mooves-project/mooves-backend"
FRONTEND_DIR="/home/klas/Kod/mooves-project/mooves-frontend"
NODEJS_DIR="$BACKEND_DIR/nodejs-backend"

# Function to print colored messages
print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo "ℹ️  $1"
}

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
  print_error "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  print_error "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

echo "📋 Deployment Checklist:"
echo "  - GPT-4 Turbo upgrade"
echo "  - Database persistence (Conversations table)"
echo "  - Response streaming"
echo "  - Improved rate limits (20 free, 200 premium)"
echo "  - Intent-based prompt optimization"
echo "  - Smart matching algorithms"
echo "  - Event rendering in frontend"
echo ""

read -p "🤔 Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_warning "Deployment cancelled"
  exit 0
fi

# Step 1: Test Backend Locally
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Testing Backend Locally"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$NODEJS_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed"
  exit 1
fi

print_info "Node.js version: $(node --version)"
print_info "npm version: $(npm --version)"

# Check environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  print_warning "OPENAI_API_KEY not set in environment"
  read -p "Do you have it set in your .env or app.yaml? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please set OPENAI_API_KEY before deploying"
    exit 1
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  print_warning "DATABASE_URL not set in environment"
  read -p "Do you have it set in your .env or app.yaml? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please set DATABASE_URL before deploying"
    exit 1
  fi
fi

print_success "Environment check complete"

# Step 2: Run Database Migration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Database Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Running Conversations table migration..."

if node migrations/create-conversations-table.js; then
  print_success "Database migration completed"
else
  print_warning "Migration may have already run (table exists)"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Deployment stopped at migration step"
    exit 1
  fi
fi

# Step 3: Install/Update Dependencies
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Checking backend dependencies..."
if [ -f "package.json" ]; then
  npm install
  print_success "Backend dependencies updated"
else
  print_error "package.json not found"
  exit 1
fi

# Step 4: Run Tests (if available)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "../test-ai-improvements.sh" ]; then
  print_info "Running AI improvements test suite..."
  cd "$BACKEND_DIR"
  if bash test-ai-improvements.sh; then
    print_success "All tests passed"
  else
    print_warning "Some tests failed or skipped"
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  print_warning "Test suite not found, skipping tests"
fi

# Step 5: Backend Deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Backend Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$BACKEND_DIR"

print_info "Select deployment method:"
echo "  1) deploy-to-bahnhof.sh"
echo "  2) deploy-to-loopia-vps.sh"
echo "  3) Custom command"
echo "  4) Skip backend deployment"

read -p "Enter choice (1-4): " deploy_choice

case $deploy_choice in
  1)
    print_info "Deploying to Bahnhof..."
    if [ -f "scripts/deploy-to-bahnhof.sh" ]; then
      bash scripts/deploy-to-bahnhof.sh
      print_success "Backend deployed to Bahnhof"
    else
      print_error "deploy-to-bahnhof.sh not found"
      exit 1
    fi
    ;;
  2)
    print_info "Deploying to Loopia VPS..."
    if [ -f "scripts/deploy-to-loopia-vps.sh" ]; then
      bash scripts/deploy-to-loopia-vps.sh
      print_success "Backend deployed to Loopia VPS"
    else
      print_error "deploy-to-loopia-vps.sh not found"
      exit 1
    fi
    ;;
  3)
    read -p "Enter custom deploy command: " custom_cmd
    eval "$custom_cmd"
    print_success "Custom deployment completed"
    ;;
  4)
    print_warning "Skipping backend deployment"
    ;;
  *)
    print_error "Invalid choice"
    exit 1
    ;;
esac

# Step 6: Run Migration on Production (if deployed)
if [ "$deploy_choice" != "4" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Step 6: Production Database Migration"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  print_warning "You need to run the migration on your production database"
  echo ""
  echo "Run this command on your server:"
  echo "  ssh your-server 'cd /opt/mooves-backend/nodejs-backend && node migrations/create-conversations-table.js'"
  echo ""
  read -p "Have you run the migration on production? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "Production migration confirmed"
  else
    print_error "Please run the migration on production before proceeding"
    exit 1
  fi
fi

# Step 7: Frontend Deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Frontend Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$FRONTEND_DIR"

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
  print_error "Flutter is not installed"
  exit 1
fi

print_info "Flutter version: $(flutter --version | head -n 1)"

read -p "Build Flutter app? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  print_info "Select build target:"
  echo "  1) Android APK"
  echo "  2) Android App Bundle (Play Store)"
  echo "  3) iOS"
  echo "  4) Skip"
  
  read -p "Enter choice (1-4): " build_choice
  
  case $build_choice in
    1)
      print_info "Building Android APK..."
      flutter build apk --release
      print_success "APK built: build/app/outputs/flutter-apk/app-release.apk"
      ;;
    2)
      print_info "Building Android App Bundle..."
      flutter build appbundle --release
      print_success "Bundle built: build/app/outputs/bundle/release/app-release.aab"
      ;;
    3)
      print_info "Building iOS app..."
      flutter build ios --release
      print_success "iOS build complete"
      ;;
    4)
      print_warning "Skipping frontend build"
      ;;
    *)
      print_error "Invalid choice"
      exit 1
      ;;
  esac
else
  print_warning "Skipping frontend deployment"
fi

# Step 8: Verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Verification & Monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Deployment complete! Now verify:"
echo ""
echo "📊 Check OpenAI Dashboard:"
echo "   https://platform.openai.com/usage"
echo "   - Monitor token usage (should see reduction)"
echo "   - Watch costs decrease"
echo ""
echo "📊 Run Analytics:"
echo "   cd $NODEJS_DIR"
echo "   node scripts/analyze-ai-usage.js"
echo ""
echo "📊 Monitor Logs:"
echo "   Look for these indicators:"
echo "   🎯 Using optimized matching service..."
echo "   🎉 Using optimized event ranking..."
echo "   AI Chat: Optimized prompt (XXX chars, ~XX% smaller)"
echo ""
echo "🧪 Test AI Chat:"
echo "   1. Open app → AI Chat"
echo "   2. Try: 'Hello' (should use minimal prompt)"
echo "   3. Try: 'Show me someone' (should show profiles)"
echo "   4. Try: 'What events?' (should show events with cards!)"
echo "   5. Verify conversation persists after app restart"
echo ""
echo "📈 Expected Improvements:"
echo "   ✅ 85% token reduction overall"
echo "   ✅ 4x more free messages (5→20)"
echo "   ✅ Better match quality (scored)"
echo "   ✅ Event cards rendering properly"
echo "   ✅ Streaming responses (instant feel)"
echo "   ✅ Conversations persist forever"
echo ""

# Step 9: Rollback Plan
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Rollback Plan (if needed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If anything goes wrong:"
echo "  1. Git revert: git revert HEAD"
echo "  2. Redeploy previous version"
echo "  3. Conversations table is safe to keep (no data loss)"
echo ""

print_success "🎉 Deployment Complete!"
echo ""
echo "Next steps:"
echo "  1. Monitor OpenAI costs for 24 hours"
echo "  2. Check user feedback"
echo "  3. Run analytics daily: node scripts/analyze-ai-usage.js"
echo "  4. Celebrate the massive improvements! 🍾"
echo ""

