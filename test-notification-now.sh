#!/bin/bash

# Quick test script to trigger weekly notifications manually
# Usage: ./test-notification-now.sh YOUR_AUTH_TOKEN

if [ -z "$1" ]; then
    echo "Usage: ./test-notification-now.sh YOUR_AUTH_TOKEN"
    echo ""
    echo "Get your auth token by:"
    echo "1. Login to the app"
    echo "2. Check the app's stored token"
    echo "3. Or extract it from API requests in the app logs"
    exit 1
fi

AUTH_TOKEN="$1"
SERVER="http://158.174.210.28"

echo "🧪 Testing weekly match notifications..."
echo "Server: $SERVER"
echo ""

curl -X POST "${SERVER}/api/notifications/trigger-weekly-matches" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "Check your phone for the notification!"
echo "Also check server logs: ssh ubuntu@158.174.210.28 'pm2 logs mooves-backend --lines 50'"

