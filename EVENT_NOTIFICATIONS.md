# Event Notification Feature

## Overview
Complete notification system for event-related activities in Mooves.

## Notification Types

### 1. Event Invitation Notification 🎉
**When:** User is invited to an event (private events only)
**Who receives:** Invited user
**Trigger points:**
- When creating a private event with `invitedUserIds` array
- When using the new invite endpoint: `POST /api/events/:eventId/invite`

**Notification content:**
```
Title: "Event Invitation from {Creator First Name}"
Body: "{Creator Name} invited you to '{Event Name}'"
Data: {
  type: 'event_invitation',
  eventId: String,
  eventName: String,
  creatorId: String,
  creatorName: String
}
```

**Implementation:**
- Function: `sendEventInvitationNotification()` in `services/notificationService.js`
- Used in: `createEvent()` and `inviteUsersToEvent()` in `controllers/eventController.js`

---

### 2. New Attendee Notification 🎉
**When:** Someone joins your event with "going" status
**Who receives:** Event creator
**Trigger point:** `POST /api/events/:eventId/participate` with `status: 'going'`

**Notification content:**
```
Title: "🎉 New attendee for {Event Name}!"
Body: "{User Name} is going to your event."
Data: {
  type: 'event_join',
  eventId: String,
  eventName: String,
  userId: String,
  userName: String
}
```

**Notes:**
- Only sent for new participants (not status changes)
- Not sent when creator joins their own event
- Requires creator to have FCM token

---

### 3. Attendance Confirmed Notification ✅
**When:** Someone changes status from "maybe" or "not_going" to "going"
**Who receives:** Event creator
**Trigger point:** `POST /api/events/:eventId/participate` with status change to `'going'`

**Notification content:**
```
Title: "✅ {User First Name} confirmed attendance!"
Body: "{User Name} is now going to {Event Name}."
Data: {
  type: 'event_confirmed',
  eventId: String,
  eventName: String,
  userId: String,
  userName: String
}
```

**Notes:**
- Only sent when status changes TO "going" (not for initial join)
- Not sent when creator updates their own status
- Requires creator to have FCM token

---

## New API Endpoints

### Invite Users to Event
```
POST /api/events/:id/invite
Authorization: Bearer {token}
Body: {
  "userIds": [userId1, userId2, ...]
}
```

**Response:**
```json
{
  "message": "Invitation process completed",
  "results": {
    "invited": [userId1, userId2],
    "alreadyParticipating": [],
    "failed": []
  }
}
```

**Access:** Private (only event creator)
**Functionality:**
- Adds users as participants with "maybe" status
- Sends invitation notification to each invited user
- Returns detailed results showing success/failures

---

## Requirements for Notifications

### For sending notifications:
1. ✅ Firebase Admin SDK initialized
2. ✅ `firebase-service-account.json` in backend root
3. ✅ Recipient must have FCM token registered

### For receiving notifications:
1. ✅ User must have valid FCM token
2. ✅ Firebase Cloud Messaging configured in mobile app
3. ✅ Notification permissions granted

---

## Testing

### Test Event Invitation
```bash
# Create private event with invitations
curl -X POST http://your-server/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Private Dinner",
    "description": "Small gathering",
    "location": "My Place",
    "eventDate": "2025-11-10",
    "eventTime": "19:00",
    "isPublic": false,
    "invitedUserIds": [2, 3, 4]
  }'

# Or invite to existing event
curl -X POST http://your-server/api/events/123/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [5, 6, 7]
  }'
```

### Test Join Notification
```bash
# Join event
curl -X POST http://your-server/api/events/123/participate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "going"
  }'
```

### Test Confirmation Notification
```bash
# First join with maybe
curl -X POST http://your-server/api/events/123/participate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "maybe"}'

# Then change to going (triggers confirmation notification)
curl -X POST http://your-server/api/events/123/participate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "going"}'
```

---

## Deployment

### Files Modified:
- `controllers/eventController.js` - Added notification logic + invite endpoint
- `routes/events.js` - Added invite route
- `services/notificationService.js` - Already had sendEventInvitationNotification

### Deploy to VPS:
```bash
# Copy updated files
scp -i ~/.ssh/bahnhofKey3 controllers/eventController.js ubuntu@158.174.210.28:/home/ubuntu/mooves-backend/nodejs-backend/controllers/
scp -i ~/.ssh/bahnhofKey3 routes/events.js ubuntu@158.174.210.28:/home/ubuntu/mooves-backend/nodejs-backend/routes/

# Restart backend
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 "cd /home/ubuntu/mooves-backend/nodejs-backend && pm2 restart mooves-backend"

# Check logs
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 "pm2 logs mooves-backend --lines 50"
```

---

## Complete Notification List

### Event Notifications:
1. ✅ **Event Invitation** - When invited to private event
2. ✅ **New Attendee** - When someone joins your event
3. ✅ **Attendance Confirmed** - When someone changes to "going"
4. ✅ **Daily Event Digest** - Morning digest of relevant upcoming events (scheduled)

### Match Notifications:
5. ✅ **New Match** - When two users match
6. ✅ **New Message** - When you receive a message
7. ✅ **Weekly Match Recommendations** - Friday 6 PM (scheduled)

### Group Notifications:
8. ✅ **Group Join Request** - When someone wants to join your group
9. ✅ **Join Request Accepted** - When your request is accepted
10. ✅ **Join Request Declined** - When your request is declined

### Available but unused:
11. ⚠️ **Someone Likes You** - Code exists but not triggered

---

## Logs to Check

After deployment, look for:
```
✅ Sent invitation notification to user {userId} for event {eventId}
✅ Sent event join notification to creator {creatorId}
✅ Sent event confirmation notification to creator {creatorId}
```

Warnings:
```
⚠️  Failed to send notification to user {userId}: {error}
⚠️  Failed to send event join notification: {error}
⚠️  User {userId} has no FCM token
```

