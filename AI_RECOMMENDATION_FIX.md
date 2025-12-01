# AI Recommendation Fix - Unknown Users Issue

## Problem
The AI was recommending unknown or invalid users when asked for matches. This happened because:
1. AI could hallucinate profile IDs not in the available matches list
2. No validation that recommended IDs actually existed
3. System prompt didn't strictly enforce using only provided IDs

## Solution

### 1. Enhanced System Prompt
**Updated instructions to AI:**
```
**CRITICAL: You can ONLY recommend profiles from the "Available matches" list below**
**NEVER make up or invent profile IDs - only use IDs from the available matches**
**Double-check that any ID you return actually exists in the available matches/events list**
```

### 2. Server-Side ID Validation
**Added automatic filtering of invalid IDs:**
```javascript
// Validate that all profile IDs exist in available matches
const validProfileIds = new Set(matchesForPrompt.map(m => m.id));

parsed.profiles = parsed.profiles.filter(profile => {
  const isValid = validProfileIds.has(profile.id);
  if (!isValid) {
    console.log(`⚠️  AI recommended invalid profile ID: ${profile.id}`);
  }
  return isValid;
});

// If all profiles were filtered out, return helpful message
if (parsed.profiles.length === 0) {
  return "I couldn't find any valid matches right now. Try updating your keywords!";
}
```

### 3. Better Empty State Handling
**Clear messages when no matches available:**
- "No matches available right now. Try updating your keywords to help me find better matches!"
- "No events available right now. Try creating one to meet new people!"

### 4. Enhanced Logging
**Better debugging information:**
```javascript
console.log(`AI Chat: Available matches details:`, potentialMatches.map(p => ({
  id: p.id,
  name: `${p.user.firstName} ${p.user.lastName}`,
  gender: p.gender,
  keywords: p.keyWords
})));
```

## Files Changed
- `controllers/aiController.js`
  - Enhanced system prompt with strict ID validation rules
  - Added server-side ID validation and filtering
  - Added detailed logging for debugging
  - Better error messages

## Deployment

### Quick Deploy:
```bash
cd /home/klas/Kod/mooves-project/mooves-backend
./deploy-ai-fix.sh
```

### Manual Deploy:
```bash
# Copy updated file
scp -i ~/.ssh/bahnhofKey3 \
  nodejs-backend/controllers/aiController.js \
  ubuntu@158.174.210.28:/home/ubuntu/mooves-backend/nodejs-backend/controllers/

# Restart backend
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 \
  "cd /home/ubuntu/mooves-backend/nodejs-backend && pm2 restart mooves-backend"

# Check logs
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 \
  "pm2 logs mooves-backend --lines 50"
```

## Quick Debugging

### Use the Test Script:
```bash
./test-ai-matching.sh YOUR_AUTH_TOKEN

# Or for VPS:
./test-ai-matching.sh YOUR_AUTH_TOKEN https://your-domain.com
```

### Check Backend Logs:
```bash
# On VPS
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 \
  "pm2 logs mooves-backend --lines 100 | grep 'AI Chat'"

# Look for:
✅ Available matches details: [{id: 123, name: 'John', keywords: ['hiking']}]
⚠️  AI recommended invalid profile ID: 999 (not in available matches)
⚠️  Valid profile IDs were: 123, 456, 789
```

## Testing

### Test Case 1: Valid Match Recommendation
```
User: "Show me someone"

Expected behavior:
1. AI receives list of available matches with IDs
2. AI recommends profile from that list
3. Server validates ID is in the list
4. Returns valid JSON with correct ID

Logs to check:
✅ AI Chat: Available matches details: [{id: 123, name: 'John Doe', ...}]
✅ AI Chat: Profile list contains 1 profiles
✅ AI Chat: Validated 1 valid profile(s)
```

### Test Case 2: No Matches Available
```
User: "Show me someone"

Expected behavior:
1. AI receives empty matches list
2. AI responds with helpful message (not JSON)
3. User sees: "No matches available right now..."

Logs to check:
ℹ️  AI Chat: Found 0 potential matches
```

### Test Case 3: AI Hallucinates Invalid ID
```
User: "Find someone who likes hiking"

Expected behavior:
1. AI tries to recommend invalid ID (e.g., 999)
2. Server filters out invalid ID
3. Returns fallback message instead

Logs to check:
⚠️  AI recommended invalid profile ID: 999 (not in available matches)
⚠️  Filtered out 1 invalid profile ID(s): 999
⚠️  AI Chat: All recommended profiles were invalid, returning fallback message
```

## Debug Guide

### Check Available Matches
Look for this in logs:
```
AI Chat: Total profiles in system: 5
AI Chat: All profile IDs: [ 1, 2, 3, 4, 5 ]
AI Chat: Excluded user IDs: [ 2, 3 ]
AI Chat: Found 3 potential matches
AI Chat: Potential match IDs: [ 1, 4, 5 ]
AI Chat: Available matches details: [
  { id: 1, name: 'John Doe', gender: 'M', keywords: ['hiking', 'music'] },
  { id: 4, name: 'Jane Smith', gender: 'F', keywords: ['coffee', 'books'] },
  { id: 5, name: 'Bob Johnson', gender: 'M', keywords: ['sports', 'travel'] }
]
```

### Check AI Recommendation
```
AI Chat: Found JSON in response: {
  type: 'profile_list',
  profiles: [ { id: 1 } ],
  explanation: 'John (28) loves hiking and music.'
}
AI Chat: Profile list contains 1 profiles
AI Chat: Validated 1 valid profile(s)
```

### Check for Invalid IDs
```
⚠️  AI recommended invalid profile ID: 999 (not in available matches)
⚠️  Filtered out 1 invalid profile ID(s): 999
```

## Prevention Measures

### AI Side:
1. **Explicit instructions** in system prompt
2. **Examples** showing only using provided IDs
3. **Critical rules** section emphasizing ID validation
4. **No match fallback** examples

### Server Side:
1. **ID validation** against available matches
2. **Automatic filtering** of invalid IDs
3. **Fallback messages** when all IDs invalid
4. **Detailed logging** for debugging

## Before & After

### Before ❌
```
User: "Show me someone"
AI: {"type": "profile_list", "profiles": [{"id": 999}], "explanation": "..."}
Frontend: Tries to fetch profile 999
Backend: Profile not found error
User: Sees error or empty profile
```

### After ✅
```
User: "Show me someone"
AI: {"type": "profile_list", "profiles": [{"id": 999}], "explanation": "..."}
Server: Validates ID 999 not in available matches
Server: Filters it out
Server: Returns fallback message
User: "I couldn't find any valid matches right now. Try updating your keywords!"
```

## Related Documentation
- `AI_EVENT_RECOMMENDATIONS.md` - Event recommendation system
- `EVENT_FOCUSED_FEATURES.md` - Complete event features guide

## Specific Keywords Issue (e.g., "kitesurfing")

### Problem:
User asks: "Find someone who does kitesurfing"
Result: Gets unknown user or error

### Root Causes:
1. **No matches with that keyword** - No one in the available matches list has "kitesurfing"
2. **AI hallucination** - AI makes up a profile ID instead of using the list
3. **Empty matches list** - User has already liked/disliked everyone

### Solution Flow:
```
User: "Find someone who does kitesurfing"
↓
Backend: Checks available matches [id: 123, 456, 789]
         None have "kitesurfing" keyword
↓
AI: Tries to be helpful, makes up ID 999 with kitesurfing
↓
Validation: ❌ ID 999 not in list [123, 456, 789]
            Filters it out
↓
Response: "I don't have anyone with that specific interest right now,
           but I have 3 other interesting people you might like. Want to see them?"
```

### Fix Verification:
```bash
# 1. Run test
./test-ai-matching.sh YOUR_TOKEN

# 2. Check logs for:
⚠️  AI recommended invalid profile ID: 999 (not in available matches)
⚠️  Valid profile IDs were: 123, 456, 789
⚠️  Available matches count was: 3
✅ AI Chat: All recommended profiles were invalid, returning fallback message

# 3. User should see helpful message, not error
```

## Support

If users still see unknown profiles:
1. Check backend logs for "Available matches details"
2. Verify AI is returning IDs from that list
3. Check for validation warnings about invalid IDs
4. Ensure user has potential matches (not all excluded)

