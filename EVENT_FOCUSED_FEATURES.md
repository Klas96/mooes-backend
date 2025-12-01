# Making Mooves More Event-Focused 🎉

## 🚀 **Already Implemented (Backend)**

### ✅ Daily Event Digest Notifications
- **What:** Every morning at 09:00 AM, users get notified about events happening today/tomorrow
- **Smart Matching:** Only shows events that match user's keywords/interests
- **Status:** Deployed to VPS
- **Schedule:** Daily at 09:00 AM UTC (10:00 AM CET)

### ✅ AI Event Recommendations
- **What:** AI can recommend events when users ask "what's happening?" or "what can I do?"
- **Returns:** JSON with event IDs and explanations
- **Status:** Deployed to VPS

### ✅ Auto Event Cleanup
- **What:** Removes old events 2 days after they happen
- **Schedule:** Daily at 03:00 AM UTC
- **Status:** Deployed to VPS

---

## 💡 **Frontend Ideas** (Prioritized)

### 🥇 **HIGH IMPACT** - Quick Wins

#### 1. **Events-First Home Screen**
**Impact:** 🔥🔥🔥  
**Effort:** ⚡ Low

**Changes:**
```dart
// Reorder tabs
BottomNavigationBar(
  items: [
    BottomNavigationBarItem(icon: Icons.event, label: 'Events'), // FIRST!
    BottomNavigationBarItem(icon: Icons.explore, label: 'Explore'),
    BottomNavigationBarItem(icon: Icons.chat, label: 'Messages'),
    BottomNavigationBarItem(icon: Icons.person, label: 'Profile'),
  ],
)

// Add event banner on home screen
HomeScreen:
  - Hero Banner: "Happening Today" carousel
  - Quick Stats: "12 events this week", "5 people going"
  - Featured Events: Top 3 events matching user interests
```

**Why:** Users see events first, making them the app's main focus.

---

#### 2. **"Going to This Event?" Profile Badge**
**Impact:** 🔥🔥🔥  
**Effort:** ⚡⚡ Medium

**What to Show:**
```dart
// On user profile cards
ProfileCard(
  name: "Sarah",
  bio: "...",
  eventsAttending: [
    EventBadge("Coffee Meetup - Nov 5"),
    EventBadge("Hiking Trip - Nov 12"),
  ],
  actions: [
    "Message",
    "Join Same Event", // NEW!
  ]
)
```

**Benefits:**
- Ice breaker ("I'm going to that event too!")
- Shows shared interests through actions, not just words
- Encourages event attendance

---

#### 3. **Event-Based Match Suggestions**
**Impact:** 🔥🔥🔥  
**Effort:** ⚡⚡ Medium

**Logic:**
```javascript
// In Explore tab
function getEventBasedMatches() {
  // Show people attending the same events
  // OR people who attended similar events in past
  // Label: "Both going to Coffee Meetup!"
}
```

**Example:**
```
╔═════════════════════════════╗
║ Sarah, 28                   ║
║ 📍 Stockholm                ║
║ ⭐ Going to same event!     ║
║ 📅 Coffee Meetup - Friday   ║
║ [Match] [Message] [Details] ║
╚═════════════════════════════╝
```

---

#### 4. **"Happening Today" Widget**
**Impact:** 🔥🔥  
**Effort:** ⚡ Low

```dart
// Top of every screen
Container(
  color: Colors.orange,
  padding: EdgeInsets.all(8),
  child: Row(
    children: [
      Icon(Icons.event_available),
      Text("3 events today • 12 people going"),
      Spacer(),
      TextButton("See Events", onPressed: () => navigateToEvents()),
    ],
  ),
)
```

**Benefits:**
- Constant reminder that events are happening
- FOMO effect
- One-tap access

---

### 🥈 **MEDIUM IMPACT** - Engagement Boosters

#### 5. **Event Conversation Starters**
**Impact:** 🔥🔥  
**Effort:** ⚡⚡ Medium

```dart
// When viewing someone's profile
if (userAttendingSameEvent) {
  showQuickMessage([
    "See you at [Event Name]! 👋",
    "Are you going to [Event Name]?",
    "Want to meet up at [Event Name]?",
  ]);
}
```

**Why:** Makes starting conversations easier and more relevant.

---

#### 6. **Post-Event Features**
**Impact:** 🔥🔥  
**Effort:** ⚡⚡⚡ High

**Features:**
- **Photo Gallery:** Users can upload event photos
- **Reviews/Reactions:** Rate events (👍👎)
- **"We Met at [Event]" Badge:** For couples who matched at events
- **Event Memories:** Show past events on profile

**Implementation:**
```javascript
// After event ends
EventParticipants.forEach(user => {
  notify("How was [Event Name]? Share photos!");
  showPhotoUpload(eventId);
  showEventReview(eventId);
});

// Show matches who attended
showSuggestion("You and Sarah both attended this event. Say hi!");
```

---

#### 7. **Event Creator Perks**
**Impact:** 🔥🔥  
**Effort:** ⚡ Low

**Ideas:**
- **Creator Badge:** "Event Host" on profile
- **Visibility Boost:** Show creators' profiles to event attendees
- **Stats:** "Hosted 12 events • 87 people attended"
- **Premium Feature:** Event insights, analytics

**Why:** Encourages users to create more events.

---

#### 8. **Event Chat Rooms**
**Impact:** 🔥🔥  
**Effort:** ⚡⚡⚡ High

**Features:**
- Group chat for each event
- Opens 24h before event
- Closes 24h after event
- Attendees can coordinate: "Who's bringing snacks?"

```dart
EventDetailsScreen(
  event: event,
  tabs: [
    "Details",
    "Attendees",
    "Chat", // NEW!
    "Photos",
  ]
)
```

---

### 🥉 **NICE TO HAVE** - Polish & Delight

#### 9. **"Find a Date for This Event"**
**Impact:** 🔥  
**Effort:** ⚡⚡ Medium

**Flow:**
```
User: Sees event "Wine Tasting Friday 7pm"
Action: "Find someone to go with" button
Result: Shows matches interested in wine/events
Message Template: "Want to go to wine tasting together?"
```

**Benefits:**
- Solves "I don't want to go alone" problem
- Creates natural first date opportunities
- Increases event attendance

---

#### 10. **Event Streaks & Gamification**
**Impact:** 🔥  
**Effort:** ⚡⚡ Medium

**Achievements:**
- **Social Butterfly:** Attended 10 events
- **Event Creator:** Hosted 5 events
- **Early Bird:** First to join 10 events
- **Networking Pro:** Met 20 people at events

**Display:**
```dart
ProfileScreen(
  badges: [
    Badge("Social Butterfly 🦋", level: 3),
    Badge("Event Creator 🎉", level: 2),
  ],
  stats: {
    "Events Attended": 15,
    "Events Created": 3,
    "People Met": 42,
  }
)
```

---

#### 11. **Event Series / Recurring Events**
**Impact:** 🔥  
**Effort:** ⚡⚡⚡ High

**Backend Changes:**
```javascript
Event.create({
  name: "Weekly Coffee Meetup",
  isRecurring: true,
  frequency: "weekly",
  dayOfWeek: "Friday",
  // Auto-creates new event each week
});
```

**Benefits:**
- Build communities around recurring events
- Users know what to expect
- Lower barrier to attendance ("I'll go next week")

---

#### 12. **Smart Event Suggestions in AI Chat**
**Impact:** 🔥  
**Effort:** ⚡ Low (Already implemented!)

**Current:**
- User: "What should I do this weekend?"
- AI: *Returns JSON with event recommendations*

**Enhancement:**
```dart
// When AI recommends event, show special UI
if (aiResponse.type == "event_list") {
  showEventCards(
    events: aiResponse.events,
    explanation: aiResponse.explanation,
    quickAction: "Join All", // One-tap join multiple events
  );
}
```

---

## 🎨 **UX/UI Improvements**

### Event Discovery Flow

```
┌─────────────────────────────────┐
│  Home Screen                    │
│  ┌───────────────────────────┐  │
│  │ 🎉 3 Events Today         │  │  ← Prominent Banner
│  │ Coffee • Hiking • Movies  │  │
│  │ [See All Events →]        │  │
│  └───────────────────────────┘  │
│                                 │
│  Featured Events                │
│  ┌─────────────────┐            │
│  │ [Event Card 1]  │            │  ← Large, attractive cards
│  │ [Event Card 2]  │            │
│  │ [Event Card 3]  │            │
│  └─────────────────┘            │
│                                 │
│  People at These Events         │  ← Show attendees
│  [Profile] [Profile] [Profile]  │
└─────────────────────────────────┘
```

### Event Card Design

```
┌─────────────────────────────────┐
│ 📸 [Event Cover Image]          │
│                                 │
│ Coffee & Connections ☕         │
│ Friday, Nov 5 • 6:00 PM         │
│ Central Café, Stockholm         │
│                                 │
│ 👥 12 going • 👤 Sarah +11      │  ← Social proof
│                                 │
│ Tags: #coffee #networking       │
│                                 │
│ [❤️ Interested] [✅ Going]     │  ← Easy actions
└─────────────────────────────────┘
```

---

## 📊 **Metrics to Track**

To measure success of event focus:

1. **Event Engagement**
   - Events created per week
   - Event attendance rate
   - Events with 0 attendees (failure rate)

2. **User Engagement**
   - % of users attending events
   - Average events per user per month
   - Event → Match conversion

3. **Match Quality**
   - Matches from same events
   - Message response rate for event-based matches
   - Success stories from event connections

---

## 🚀 **Rollout Strategy**

### Phase 1: Foundation (Week 1-2)
- ✅ Daily event digest (Done!)
- ✅ AI event recommendations (Done!)
- [ ] Events-first tab order
- [ ] "Happening Today" banner

### Phase 2: Discoverability (Week 3-4)
- [ ] Event-based match suggestions
- [ ] "Going to This Event?" badges on profiles
- [ ] Event conversation starters

### Phase 3: Engagement (Week 5-6)
- [ ] Event chat rooms
- [ ] Post-event photos/reviews
- [ ] Event creator perks

### Phase 4: Gamification (Week 7-8)
- [ ] Event badges & achievements
- [ ] Event series support
- [ ] "Find a date for this event" feature

---

## 💬 **Conversation Prompts for AI**

Add these as suggested prompts in the AI chat:

- "What events are happening this week?"
- "Find me someone to go to an event with"
- "Show me coffee meetups"
- "What's a good first date idea?" → AI suggests events
- "I'm bored, what should I do?" → AI suggests events

---

## 🎯 **Key Success Indicators**

You'll know the event focus is working when:

1. **50%+ users** attend at least one event per month
2. **30%+ matches** come from people at the same event
3. **20%+ conversations** start with event-related messages
4. **10+ events** created per week organically
5. **Daily active users** increase on event days

---

## 🔮 **Future Ideas** (Advanced)

### 1. Event Marketplace
- Paid events (creators charge admission)
- Premium event hosting (verified hosts)
- Event sponsorships

### 2. Event Matching Algorithm
- AI suggests optimal events based on:
  - User's keywords
  - Past event attendance
  - Friends/matches attending
  - Location & timing

### 3. Video Events
- Virtual events via video chat
- Hybrid events (in-person + virtual)
- Event recordings for those who missed

### 4. Event Recommendations Based on Matches
- "Sarah is going to this event. Want to go?"
- "3 of your matches will be at Coffee Meetup"

### 5. Location-Based Event Push
- Notify when near an event happening now
- "You're 500m from Photography Walk starting in 30min!"

---

## 📱 **Sample Home Screen Mockup**

```
╔═══════════════════════════════════╗
║ Mooves                    🔔 ⚙️ ║
╠═══════════════════════════════════╣
║                                   ║
║  🎉 HAPPENING TODAY               ║
║  ┌─────────────────────────────┐ ║
║  │ Coffee Meetup • 6pm        │ ║
║  │ 📍 Central Café            │ ║
║  │ 👥 12 going                │ ║
║  │ [Join Event]               │ ║
║  └─────────────────────────────┘ ║
║       ⬅️  •  •  ➡️               ║
║                                   ║
║  PEOPLE AT THESE EVENTS           ║
║  ┌────┐ ┌────┐ ┌────┐           ║
║  │📸  │ │📸  │ │📸  │           ║
║  │S,28│ │M,31│ │A,26│           ║
║  └────┘ └────┘ └────┘           ║
║                                   ║
║  THIS WEEK'S EVENTS               ║
║  ┌─────────────────────────────┐ ║
║  │ Hiking Trip                 │ ║
║  │ Saturday • 10am             │ ║
║  │ 👥 8 going                  │ ║
║  └─────────────────────────────┘ ║
║                                   ║
║  ┌─────────────────────────────┐ ║
║  │ Book Club                   │ ║
║  │ Sunday • 3pm                │ ║
║  │ 👥 6 going                  │ ║
║  └─────────────────────────────┘ ║
║                                   ║
║  [+ Create Event]                 ║
╚═══════════════════════════════════╝
```

---

## ✅ **Action Items for You**

### Immediate (This Week)
1. [ ] Reorder bottom navigation (Events first)
2. [ ] Add "Happening Today" banner
3. [ ] Show events on user profiles
4. [ ] Test daily digest notifications

### Short Term (Next 2 Weeks)
1. [ ] Implement event-based match suggestions
2. [ ] Add "Going to This Event?" badges
3. [ ] Create event conversation starters
4. [ ] Improve event card design

### Long Term (Next Month)
1. [ ] Event chat rooms
2. [ ] Post-event features
3. [ ] Gamification & badges
4. [ ] Event series support

---

**Remember:** The goal is to make events the **primary way** people connect, not just a secondary feature. Every screen, every interaction should subtly or explicitly encourage event participation!


