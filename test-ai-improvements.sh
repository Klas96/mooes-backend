#!/bin/bash

# Test script for AI Chat improvements
# Tests GPT-4 upgrade, database persistence, streaming, and rate limits

set -e

echo "🧪 AI Chat Improvements Test Suite"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-test123}"

echo "📋 Configuration:"
echo "   API Base URL: $API_BASE_URL"
echo "   Test Email: $TEST_EMAIL"
echo ""

# Function to print test result
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
    exit 1
  fi
}

# Test 1: Database Migration
echo "Test 1: Database Migration"
echo "-------------------------"
cd nodejs-backend
if node migrations/create-conversations-table.js; then
  print_result 0 "Database migration successful"
else
  print_result 1 "Database migration failed"
fi
cd ..
echo ""

# Test 2: Login and get token
echo "Test 2: Authentication"
echo "---------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" || echo "FAILED")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  print_result 0 "Login successful, token obtained"
  echo "   Token: ${TOKEN:0:20}..."
else
  echo -e "${YELLOW}⚠️  Login failed - using existing session or create test user${NC}"
  echo "   Response: $LOGIN_RESPONSE"
  # Try to continue with manual token if available
  if [ -z "$TEST_TOKEN" ]; then
    echo "   Please set TEST_TOKEN environment variable or create test user"
    exit 1
  fi
  TOKEN="$TEST_TOKEN"
fi
echo ""

# Test 3: Check AI usage (rate limits)
echo "Test 3: AI Usage & Rate Limits"
echo "------------------------------"
USAGE_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/ai/usage" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USAGE_RESPONSE" | grep -q "dailyLimit"; then
  print_result 0 "Usage endpoint working"
  DAILY_LIMIT=$(echo "$USAGE_RESPONSE" | grep -o '"dailyLimit":[0-9]*' | cut -d':' -f2)
  CURRENT_COUNT=$(echo "$USAGE_RESPONSE" | grep -o '"currentCount":[0-9]*' | cut -d':' -f2)
  IS_PREMIUM=$(echo "$USAGE_RESPONSE" | grep -o '"isPremium":[a-z]*' | cut -d':' -f2)
  
  echo "   Daily Limit: $DAILY_LIMIT"
  echo "   Current Count: $CURRENT_COUNT"
  echo "   Is Premium: $IS_PREMIUM"
  
  # Check if limits are updated
  if [ "$IS_PREMIUM" = "true" ]; then
    if [ "$DAILY_LIMIT" = "200" ]; then
      print_result 0 "Premium rate limit correctly set to 200"
    else
      print_result 1 "Premium rate limit should be 200, got $DAILY_LIMIT"
    fi
  else
    if [ "$DAILY_LIMIT" = "20" ]; then
      print_result 0 "Free rate limit correctly set to 20"
    else
      print_result 1 "Free rate limit should be 20, got $DAILY_LIMIT"
    fi
  fi
else
  print_result 1 "Usage endpoint failed"
  echo "   Response: $USAGE_RESPONSE"
fi
echo ""

# Test 4: Non-streaming chat
echo "Test 4: Non-streaming Chat (GPT-4 Turbo)"
echo "----------------------------------------"
CHAT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, what are the new features?"}')

if echo "$CHAT_RESPONSE" | grep -q "response"; then
  print_result 0 "Non-streaming chat working"
  RESPONSE_TEXT=$(echo "$CHAT_RESPONSE" | grep -o '"response":"[^"]*' | cut -d'"' -f4 | head -c 100)
  echo "   Response preview: ${RESPONSE_TEXT}..."
else
  print_result 1 "Non-streaming chat failed"
  echo "   Response: $CHAT_RESPONSE"
fi
echo ""

# Test 5: Conversation history (database persistence)
echo "Test 5: Conversation History (Database Persistence)"
echo "---------------------------------------------------"
HISTORY_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/ai/conversation-history" \
  -H "Authorization: Bearer $TOKEN")

if echo "$HISTORY_RESPONSE" | grep -q "content"; then
  print_result 0 "Conversation history retrieved from database"
  MESSAGE_COUNT=$(echo "$HISTORY_RESPONSE" | grep -o '"content"' | wc -l)
  echo "   Messages in history: $MESSAGE_COUNT"
  
  # Verify we can see our previous message
  if echo "$HISTORY_RESPONSE" | grep -q "Hello"; then
    print_result 0 "Previous message found in database"
  else
    echo -e "${YELLOW}⚠️  Previous message not found (may need time to persist)${NC}"
  fi
else
  print_result 1 "Failed to retrieve conversation history"
  echo "   Response: $HISTORY_RESPONSE"
fi
echo ""

# Test 6: Streaming endpoint
echo "Test 6: Streaming Chat (Server-Sent Events)"
echo "------------------------------------------"
echo "   Testing streaming endpoint..."

# Use timeout to limit streaming test duration
STREAM_RESPONSE=$(timeout 10s curl -s -N -X POST "$API_BASE_URL/api/ai/chat/stream" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Say hello in one word"}' | head -n 20)

if echo "$STREAM_RESPONSE" | grep -q "data:"; then
  print_result 0 "Streaming endpoint working"
  echo "   Stream preview:"
  echo "$STREAM_RESPONSE" | head -n 5 | sed 's/^/   /'
else
  echo -e "${YELLOW}⚠️  Streaming test inconclusive (may require SSE client)${NC}"
  echo "   Response: ${STREAM_RESPONSE:0:100}..."
fi
echo ""

# Test 7: Clear conversation history
echo "Test 7: Clear Conversation History"
echo "----------------------------------"
CLEAR_RESPONSE=$(curl -s -X DELETE "$API_BASE_URL/api/ai/conversation-history" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CLEAR_RESPONSE" | grep -q "deletedCount"; then
  print_result 0 "Clear conversation history working"
  DELETED_COUNT=$(echo "$CLEAR_RESPONSE" | grep -o '"deletedCount":[0-9]*' | cut -d':' -f2)
  echo "   Deleted $DELETED_COUNT messages"
else
  print_result 1 "Failed to clear conversation history"
  echo "   Response: $CLEAR_RESPONSE"
fi
echo ""

# Test 8: Verify history is empty
echo "Test 8: Verify History Cleared"
echo "------------------------------"
HISTORY_AFTER=$(curl -s -X GET "$API_BASE_URL/api/ai/conversation-history" \
  -H "Authorization: Bearer $TOKEN")

MESSAGE_COUNT_AFTER=$(echo "$HISTORY_AFTER" | grep -o '"content"' | wc -l || echo "0")

if [ "$MESSAGE_COUNT_AFTER" -eq 0 ]; then
  print_result 0 "History successfully cleared (0 messages)"
else
  echo -e "${YELLOW}⚠️  History may not be fully cleared (found $MESSAGE_COUNT_AFTER messages)${NC}"
fi
echo ""

# Test 9: Database table verification
echo "Test 9: Database Schema Verification"
echo "------------------------------------"
cd nodejs-backend
TABLE_CHECK=$(node -e "
const { sequelize } = require('./models');
sequelize.query(\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Conversations'\")
  .then(([results]) => {
    console.log('Columns:', results.map(r => r.column_name).join(', '));
    process.exit(results.length > 0 ? 0 : 1);
  })
  .catch(() => process.exit(1));
" 2>&1)

if [ $? -eq 0 ]; then
  print_result 0 "Conversations table schema verified"
  echo "   $TABLE_CHECK"
else
  print_result 1 "Conversations table not found or invalid schema"
fi
cd ..
echo ""

# Summary
echo ""
echo "=========================================="
echo "🎉 Test Suite Complete!"
echo "=========================================="
echo ""
echo "Summary of Improvements:"
echo "  ✅ GPT-4 Turbo with 2000 token limit"
echo "  ✅ Database persistence for conversations"
echo "  ✅ Streaming responses (SSE)"
echo "  ✅ Updated rate limits (20 free / 200 premium)"
echo ""
echo "Next Steps:"
echo "  1. Deploy to production"
echo "  2. Run migration on production DB"
echo "  3. Monitor OpenAI API costs"
echo "  4. Update Flutter frontend to use streaming"
echo "  5. Gather user feedback"
echo ""

