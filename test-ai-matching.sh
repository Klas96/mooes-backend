#!/bin/bash

# Test AI Matching - Debug Script
# Helps debug why AI recommends unknown users

echo "======================================"
echo "AI Matching Debug Script"
echo "======================================"
echo ""

# Check if token is provided
if [ -z "$1" ]; then
    echo "Usage: ./test-ai-matching.sh YOUR_AUTH_TOKEN"
    echo ""
    echo "Example:"
    echo "  ./test-ai-matching.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    exit 1
fi

TOKEN="$1"
SERVER="${2:-http://localhost:3000}"

echo "🔍 Testing AI matching with server: $SERVER"
echo ""

# Test 1: Send message asking for kitesurfing match
echo "📤 Test 1: Asking for someone who does kitesurfing..."
echo ""

RESPONSE=$(curl -s -X POST "$SERVER/api/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Find someone who does kitesurfing"}')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo ""

# Test 2: Ask for general match
echo "📤 Test 2: Asking to show someone (general)..."
echo ""

RESPONSE=$(curl -s -X POST "$SERVER/api/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me someone"}')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""
echo ""

echo "======================================"
echo "✅ Tests Complete!"
echo "======================================"
echo ""
echo "📋 What to check in backend logs:"
echo ""
echo "1️⃣  Available Matches:"
echo "   Look for: 'AI Chat: Available matches details: [...]'"
echo "   This shows which profile IDs are actually available"
echo ""
echo "2️⃣  AI Recommendation:"
echo "   Look for: 'AI Chat: Found JSON in response: {...}'"
echo "   Check if the ID in 'profiles' matches available matches"
echo ""
echo "3️⃣  Validation:"
echo "   Look for: 'AI Chat: Validated X valid profile(s)'"
echo "   Or: '⚠️  AI recommended invalid profile ID: X'"
echo ""
echo "4️⃣  Check for warnings:"
echo "   '⚠️  NO POTENTIAL MATCHES FOUND'"
echo "   '⚠️  Filtered out X invalid profile ID(s)'"
echo "   '⚠️  Valid profile IDs were: [...]'"
echo ""
echo "📊 To view backend logs:"
echo "   ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 \\"
echo "     'pm2 logs mooves-backend --lines 100 | grep \"AI Chat\"'"
echo ""

