#!/bin/bash

# Script to help set up Vercel environment variables
# Usage: ./setup-vercel-env.sh

echo "🚀 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""
echo "This script will help you add environment variables to your Vercel project."
echo "Make sure you have the following information ready:"
echo ""
echo "Required:"
echo "  - DATABASE_URL (PostgreSQL connection string)"
echo "  - JWT_SECRET (a secure random string)"
echo "  - CLOUDINARY_CLOUD_NAME"
echo "  - CLOUDINARY_API_KEY"
echo "  - CLOUDINARY_API_SECRET"
echo ""
echo "Optional:"
echo "  - ALLOWED_ORIGINS (comma-separated list)"
echo "  - FRONTEND_URL"
echo "  - Email configuration (EMAIL_USER, EMAIL_PASSWORD, etc.)"
echo "  - Google OAuth credentials"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local var_value=$2
    local environments=${3:-production,preview,development}
    
    echo "Adding $var_name..."
    echo "$var_value" | vercel env add "$var_name" "$environments"
}

# Check if .env file exists and load it
if [ -f .env ]; then
    echo ""
    echo "📋 Found .env file. Do you want to use values from .env file? (y/n)"
    read -r use_env
    if [ "$use_env" = "y" ]; then
        echo "Loading from .env file..."
        export $(grep -v '^#' .env | xargs)
    fi
fi

echo ""
echo "=== Required Variables ==="
echo ""

# DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Enter DATABASE_URL (PostgreSQL connection string):"
    read -r DATABASE_URL
fi
add_env_var "DATABASE_URL" "$DATABASE_URL"

# JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    echo ""
    echo "Enter JWT_SECRET (or press Enter to generate one):"
    read -r JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        echo "Generated JWT_SECRET: $JWT_SECRET"
    fi
fi
add_env_var "JWT_SECRET" "$JWT_SECRET"

# Cloudinary variables
if [ -z "$CLOUDINARY_CLOUD_NAME" ]; then
    echo ""
    echo "Enter CLOUDINARY_CLOUD_NAME:"
    read -r CLOUDINARY_CLOUD_NAME
fi
add_env_var "CLOUDINARY_CLOUD_NAME" "$CLOUDINARY_CLOUD_NAME"

if [ -z "$CLOUDINARY_API_KEY" ]; then
    echo ""
    echo "Enter CLOUDINARY_API_KEY:"
    read -r CLOUDINARY_API_KEY
fi
add_env_var "CLOUDINARY_API_KEY" "$CLOUDINARY_API_KEY"

if [ -z "$CLOUDINARY_API_SECRET" ]; then
    echo ""
    echo "Enter CLOUDINARY_API_SECRET:"
    read -r CLOUDINARY_API_SECRET
fi
add_env_var "CLOUDINARY_API_SECRET" "$CLOUDINARY_API_SECRET"

echo ""
echo "=== Optional Variables ==="
echo ""

# ALLOWED_ORIGINS
echo "Enter ALLOWED_ORIGINS (comma-separated, or press Enter to skip):"
read -r ALLOWED_ORIGINS
if [ -n "$ALLOWED_ORIGINS" ]; then
    add_env_var "ALLOWED_ORIGINS" "$ALLOWED_ORIGINS"
fi

# FRONTEND_URL
echo ""
echo "Enter FRONTEND_URL (or press Enter to skip):"
read -r FRONTEND_URL
if [ -n "$FRONTEND_URL" ]; then
    add_env_var "FRONTEND_URL" "$FRONTEND_URL"
fi

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "Next steps:"
echo "1. Redeploy your project: vercel --prod"
echo "2. Test the health endpoint: curl https://nodejs-backend-rust.vercel.app/api/health"
echo "3. Check logs if issues: vercel logs"
echo ""


