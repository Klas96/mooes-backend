#!/bin/bash

# 🔒 Security Cleanup Script
# This script helps with post-security-fix cleanup and secret rotation

echo "🔒 Security Cleanup Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "nodejs-backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting security cleanup process..."

# 1. Check for any remaining hardcoded secrets
print_status "Checking for remaining hardcoded secrets..."

SECRETS_FOUND=0

# Check for actual secrets (not placeholders or examples)
PATTERNS=(
    "sk-proj-[a-zA-Z0-9]{48}"
    "-----BEGIN PRIVATE KEY-----"
    "postgresql://.*:[a-zA-Z0-9]{8,}@"
    "mooves@klasholmgren.se"
    "jeul qcqe yliq bije"
    "JAEtqketWyrDztwB"
    "1l2IQThhppHR7ko1IomVdg"
    "Feuille300"
)

for pattern in "${PATTERNS[@]}"; do
    # Exclude false positives
    if grep -r "$pattern" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=coverage --exclude-dir=build --exclude-dir=test/generated_mocks --exclude=*.template --exclude=SECURITY_FIXES.md --exclude=scripts/security-cleanup.sh 2>/dev/null; then
        print_warning "Found potential secret pattern: $pattern"
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
    print_success "No hardcoded secrets found!"
else
    print_warning "Found $SECRETS_FOUND potential secret patterns. Please review manually."
fi

# 2. Check environment variables
print_status "Checking environment variable setup..."

REQUIRED_VARS=(
    "DATABASE_URL"
    "GOOGLE_CLOUD_CREDENTIALS"
    "OPENAI_API_KEY"
    "EMAIL_USER"
    "EMAIL_PASSWORD"
    "JWT_SECRET"
)

MISSING_VARS=0

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_warning "Environment variable $var is not set"
        MISSING_VARS=$((MISSING_VARS + 1))
    else
        print_success "Environment variable $var is set"
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    print_success "All required environment variables are set!"
else
    print_warning "Missing $MISSING_VARS environment variables"
fi

# 3. Check .gitignore
print_status "Checking .gitignore for security patterns..."

GITIGNORE_SECURITY=0

SECURITY_PATTERNS=(
    "\.env"
    "\.env\.backup"
    "gcs-env\.yaml"
    "complete-env\.yaml"
    "service-account.*\.json"
    "\*\.key"
    "\*\.pem"
)

for pattern in "${SECURITY_PATTERNS[@]}"; do
    if grep -q "$pattern" .gitignore; then
        print_success "Security pattern '$pattern' found in .gitignore"
    else
        print_warning "Security pattern '$pattern' not found in .gitignore"
        GITIGNORE_SECURITY=$((GITIGNORE_SECURITY + 1))
    fi
done

if [ $GITIGNORE_SECURITY -eq 0 ]; then
    print_success ".gitignore has good security coverage!"
else
    print_warning ".gitignore missing $GITIGNORE_SECURITY security patterns"
fi

# 4. Generate new secrets (if needed)
print_status "Generating new secrets..."

# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)
print_success "Generated new JWT secret"

# Generate new database password
NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
print_success "Generated new database password"

# 5. Create environment template
print_status "Creating environment template..."

cat > .env.template << EOF
# 🔒 Environment Variables Template
# Copy this file to .env and fill in your actual values
# DO NOT commit .env to version control

# Database
DATABASE_URL=postgresql://mooves_user:[PASSWORD]@34.63.76.2:5432/mooves_db

# Google Cloud
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"fresh-oath-337920",...}
GOOGLE_CLOUD_PROJECT_ID=fresh-oath-337920
GOOGLE_CLOUD_BUCKET_NAME=mooves

# OpenAI
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_API_KEY]

# Email
EMAIL_USER=mooves@klasholmgren.se
EMAIL_PASSWORD=your-app-password

# JWT
JWT_SECRET=$NEW_JWT_SECRET

# Cloudinary (if used)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend
FRONTEND_URL=https://your-frontend-url.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:8000,https://your-frontend-url.com
EOF

print_success "Created .env.template with new JWT secret"

# 6. Summary and next steps
echo ""
echo "🔒 Security Cleanup Summary"
echo "=========================="

if [ $SECRETS_FOUND -eq 0 ] && [ $MISSING_VARS -eq 0 ] && [ $GITIGNORE_SECURITY -eq 0 ]; then
    print_success "✅ Security cleanup completed successfully!"
else
    print_warning "⚠️  Some issues found. Please address them:"
    [ $SECRETS_FOUND -gt 0 ] && echo "   - $SECRETS_FOUND potential secrets found"
    [ $MISSING_VARS -gt 0 ] && echo "   - $MISSING_VARS missing environment variables"
    [ $GITIGNORE_SECURITY -gt 0 ] && echo "   - $GITIGNORE_SECURITY missing .gitignore patterns"
fi

echo ""
echo "🔄 Next Steps:"
echo "1. Rotate all exposed secrets:"
echo "   - Generate new Google Cloud service account keys"
echo "   - Change database password to: $NEW_DB_PASSWORD"
echo "   - Rotate OpenAI API keys"
echo "   - Update email app passwords"
echo "   - Use new JWT secret: $NEW_JWT_SECRET"
echo ""
echo "2. Set environment variables in your deployment platform:"
echo "   - Heroku: heroku config:set VAR_NAME=value"
echo "   - Google Cloud Run: Use --env-vars-file"
echo "   - Local: Copy .env.template to .env and fill values"
echo ""
echo "3. Test your application with new secrets"
echo ""
echo "4. Run GitGuardian scan again to verify fixes"
echo ""
echo "📚 For more information, see SECURITY_FIXES.md"

print_success "Security cleanup script completed!" 