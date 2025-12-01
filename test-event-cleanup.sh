#!/bin/bash

# Quick test script to trigger event cleanup manually
# Usage: ./test-event-cleanup.sh YOUR_AUTH_TOKEN

if [ -z "$1" ]; then
    echo "Usage: ./test-event-cleanup.sh YOUR_AUTH_TOKEN"
    echo ""
    echo "Get your auth token by:"
    echo "1. Login to the app"
    echo "2. Check the app's stored token"
    echo "3. Or extract it from API requests in the app logs"
    exit 1
fi

AUTH_TOKEN="$1"
SERVER="http://158.174.210.28"

echo "🗑️  Testing event cleanup..."
echo "Server: $SERVER"
echo ""

curl -X POST "${SERVER}/api/notifications/trigger-event-cleanup" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\n\n" \
  -s | jq '.' || curl -X POST "${SERVER}/api/notifications/trigger-event-cleanup" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\n\n"

echo ""
echo "Check the response above to see how many events were deleted"
echo "Also check server logs: ssh ubuntu@158.174.210.28 'pm2 logs mooves-backend --lines 50'"

