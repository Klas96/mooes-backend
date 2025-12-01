# AI Event Recommendations Feature

## 🎉 What's New

The AI chat assistant can now recommend events in addition to finding matches! Users can ask about activities, events, and things to do, and the AI will suggest relevant upcoming events.

## 🚀 Deployment Status

✅ **Deployed to VPS on:** November 1, 2025  
✅ **Server:** 158.174.210.28  
✅ **Status:** Active and running

## 📋 Features

### Event Discovery
Users can ask the AI questions like:
- "What events are happening?"
- "Find me something to do this weekend"
- "Are there any activities I can join?"
- "What can I do tonight?"
- "Show me hiking events"
- "Any coffee meetups coming up?"

### Smart Matching
The AI recommends events based on:
- **User's keywords/interests** - Matches event tags with user's profile keywords
- **Location** - Considers events in the user's area
- **Date** - Shows only upcoming future events
- **Event tags** - Finds events with relevant tags

### Response Format
When recommending events, the AI returns JSON like:
```json
{
  "type": "event_list",
  "events": [{"id": 456}],
  "explanation": "Hiking Meetup on Nov 5 at Central Park - perfect for outdoor enthusiasts!"
}
```

## 🔧 Technical Implementation

### Files Modified

**`controllers/aiController.js`**
- Added `Event` and `EventParticipant` model imports
- Added event querying (upcoming, public events)
- Updated system prompt with MISSION 3 for event recommendations
- Added event examples and response rules
- Updated JSON parsing to handle `event_list` type

### Event Query Logic

```javascript
// Gets upcoming public events + user's own events
const upcomingEvents = await Event.findAll({
  where: {
    status: 'upcoming',
    [Op.or]: [
      { isPublic: true },
      { creatorId: req.user.id }
    ],
    eventDate: {
      [Op.gte]: new Date() // Future events only
    }
  },
  order: [['eventDate', 'ASC']],
  limit: 10 // Prevent token overflow
});
```

### Event Data Included in AI Context

Each event includes:
- **id** - Event ID for frontend to display
- **name** - Event title
- **description** - Event details
- **location** - Where it's happening
- **eventDate** - When it's happening
- **eventTime** - Time of event
- **tags** - Array of relevant tags
- **creator** - Who created the event
- **participantCount** - How many are attending
- **maxParticipants** - Capacity limit

## 📱 Frontend Integration

The frontend should handle `event_list` JSON responses from the AI:

```dart
// Parse AI response
final response = jsonDecode(aiResponse);

if (response['type'] == 'event_list') {
  // Extract event IDs
  final eventIds = response['events'].map((e) => e['id']).toList();
  
  // Show event cards/details
  // Display the explanation
  showEventRecommendations(eventIds, response['explanation']);
}
```

## 🎯 Example Conversations

### Example 1: General Event Discovery

**User:** "What events are happening?"

**AI Response:**
```json
{
  "type": "event_list",
  "events": [{"id": 789}],
  "explanation": "Photography Walk on Saturday at 2pm - great for outdoor and photography enthusiasts!"
}
```

### Example 2: Specific Interest

**User:** "Any hiking events?"

**AI Response:**
```json
{
  "type": "event_list",
  "events": [{"id": 456}],
  "explanation": "Mountain Hike on Sunday morning - perfect match for your hiking interest!"
}
```

### Example 3: Weekend Activities

**User:** "Find me something to do this weekend"

**AI Response:**
```json
{
  "type": "event_list",
  "events": [{"id": 321}, {"id": 654}],
  "explanation": "Coffee Meetup on Saturday and Book Club on Sunday - both great for meaningful connections!"
}
```

### Example 4: No Events Available

**User:** "What events are happening?"

**AI Response:**
```
There are no upcoming events at the moment. Why not create one and invite people with similar interests?
```

## 🔍 How It Works

### 1. User Asks About Events
User sends a message asking about activities, events, or things to do.

### 2. AI Context Includes Events
The system prompt includes:
- User's profile (keywords, location, interests)
- Up to 10 upcoming events
- Event details (name, description, tags, location, date)

### 3. AI Matches Events to User
OpenAI analyzes:
- Which events match user's keywords
- Location proximity
- Event timing
- Event tags/categories

### 4. AI Returns JSON
Returns structured JSON with:
- Event IDs
- Human-readable explanation
- Type indicator: `event_list`

### 5. Frontend Displays Events
App parses JSON and shows event cards/details.

## 📊 Event Selection Criteria

The AI prioritizes events based on:

1. **Keyword Match** - Events with tags matching user's keywords
2. **Location** - Events in or near user's location
3. **Timing** - Events happening soon (ordered by date)
4. **Capacity** - Events with available spots
5. **Popularity** - Events with more participants (social proof)

## 🛡️ Safety & Privacy

- **Public events only** - Users only see public events (unless they created it)
- **Upcoming only** - Past events are excluded
- **No private data** - Event recommendations don't expose private info
- **User control** - Users can ask for specific types of events

## 💡 Tips for Frontend

### 1. Handle Both Response Types
```dart
if (response.containsKey('type')) {
  if (response['type'] == 'profile_list') {
    // Show profile recommendations
  } else if (response['type'] == 'event_list') {
    // Show event recommendations
  }
} else {
  // Regular conversation text
}
```

### 2. Show Event Previews
When AI recommends events, show:
- Event name and description
- Date and time (formatted nicely)
- Location
- Number of participants
- "Join Event" button

### 3. Combine with Profile Recommendations
AI can recommend both people AND events in different messages, helping users:
- Find people with similar interests
- Discover activities to meet those people

### 4. Encourage Event Creation
If no events match, prompt users to create their own!

## 🎨 UX Suggestions

### Event Cards in Chat
```
┌─────────────────────────────┐
│ 🎉 Photography Walk         │
│ Saturday, Nov 5 at 2:00 PM  │
│ Central Park                │
│ 📸 12 people going          │
│ [View Details] [Join Event] │
└─────────────────────────────┘
```

### Quick Actions
- "Show me events" button
- "What's happening this weekend?" quick prompt
- Event filters (date, location, category)

## 📈 Future Enhancements

Possible improvements:

- [ ] **Date-based filtering** - "Events this weekend" vs "next month"
- [ ] **Category filtering** - "Sports events" vs "Social events"
- [ ] **Distance-based** - Events within X km of user
- [ ] **Friend recommendations** - Events attended by matched users
- [ ] **Smart scheduling** - Avoid recommending conflicting events
- [ ] **RSVP integration** - Let users join events directly from chat
- [ ] **Event creation** - AI helps create events based on conversation

## 🧪 Testing

### Test Queries to Try

```
"What events are happening?"
"Find me something to do tonight"
"Any hiking events coming up?"
"Show me events this weekend"
"What can I do to meet people?"
"Are there any photography meetups?"
"Find me activities near me"
```

### Expected Behavior

- ✅ Returns JSON with `event_list` type
- ✅ Includes event IDs
- ✅ Provides friendly explanation
- ✅ Matches user's interests
- ✅ Only shows upcoming events
- ✅ Orders by date (soonest first)

## 🔧 Troubleshooting

### No Events Returned
**Cause:** No upcoming public events in database  
**Solution:** Create some test events or encourage users to create events

### AI Doesn't Recommend Events
**Cause:** User query doesn't trigger event recommendation  
**Solution:** Phrase question differently: "What events..." or "Show me activities..."

### Wrong Events Recommended
**Cause:** Event tags don't match user keywords  
**Solution:** Ensure events have relevant tags when created

### JSON Parse Error
**Cause:** AI returned malformed JSON  
**Solution:** Check logs, AI should always return valid JSON for recommendations

## 📞 Support

### Check AI Logs

```bash
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 "pm2 logs mooves-backend | grep -A 5 'AI Chat'"
```

Look for:
```
AI Chat: Found X upcoming events
AI Chat: Event list contains Y events
```

### Verify Events in Database

```bash
ssh ubuntu@158.174.210.28
sudo -u postgres psql mooves_prod

SELECT id, name, "eventDate", status, "isPublic" 
FROM "Events" 
WHERE status = 'upcoming' 
  AND "eventDate" >= NOW()
ORDER BY "eventDate" ASC
LIMIT 10;
```

---

**Created:** November 1, 2025  
**Feature:** AI Event Recommendations  
**Status:** Active  
**Impact:** Users can now discover events through AI chat

