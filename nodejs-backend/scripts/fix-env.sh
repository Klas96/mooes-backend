#!/bin/bash

echo "🔧 Fixing environment variables..."

# Create a backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update OpenAI API key with environment variable
if [ -n "$OPENAI_API_KEY" ]; then
    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_API_KEY/" .env
    echo "✅ Updated OPENAI_API_KEY with environment variable"
else
    echo "⚠️  OPENAI_API_KEY environment variable not set"
    echo "   Please set OPENAI_API_KEY environment variable and run this script again"
fi

# Remove the % character from DATABASE_URL (use placeholder)
sed -i 's/DATABASE_URL=postgresql:\/\/mooves_user:\[PASSWORD\]@34.63.76.2:5432\/mooves_db%/DATABASE_URL=postgresql:\/\/mooves_user:\[PASSWORD\]@34.63.76.2:5432\/mooves_db/' .env

echo "✅ Environment variables fixed!"
echo "📋 Changes made:"
echo "  - Updated OPENAI_API_KEY with environment variable"
echo "  - Removed % character from DATABASE_URL"
echo ""
echo "🔄 Restart your server to apply changes:"
echo "  pkill -f 'node server.js'"
echo "  node server.js" 