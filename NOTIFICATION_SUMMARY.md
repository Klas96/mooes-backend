# Complete Notification System Summary

## 📬 All Notification Scenarios in Mooves

### **Scheduled/Automated Notifications**

| # | Type | When | Frequency | Recipients |
|---|------|------|-----------|------------|
| 1 | **Weekly Match Recommendations** | Every Friday 18:00 | Weekly | Users with `weeklyMatches` preference enabled |
| 2 | **Daily Event Digest** | Every day 09:00 | Daily | Users with events matching their interests |

---

### **Real-time Event Notifications** 🎉 ✅ NEW

| # | Type | Trigger | Recipient | Notification |
|---|------|---------|-----------|--------------|
| 3 | **Event Invitation** | User invited to private event | Invited user | "Event Invitation from {Creator}" |
| 4 | **New Attendee** | Someone joins event | Event creator | "🎉 New attendee for {Event}!" |
| 5 | **Attendance Confirmed** | Status changes to "going" | Event creator | "✅ {User} confirmed attendance!" |

---

### **Real-time Match Notifications** 💬

| # | Type | Trigger | Recipient | Notification |
|---|------|---------|-----------|--------------|
| 6 | **New Match** | Two users match | Both users | "🎉 New Match! You matched with {Name}" |
| 7 | **New Message** | Message received | Recipient | "{Sender Name}: {Message preview}" |

---

### **Group Notifications** 👥

| # | Type | Trigger | Recipient | Notification |
|---|------|---------|-----------|--------------|
| 8 | **Group Join Request** | Someone requests to join | Group creator | New join request notification |
| 9 | **Request Accepted** | Admin accepts request | Requester | Join request accepted |
| 10 | **Request Declined** | Admin declines request | Requester | Join request declined |

---

### **Available but Unused** ⚠️

| # | Type | Status | Note |
|---|------|--------|------|
| 11 | **Someone Likes You** | Code exists | Not currently triggered |

---

## 🆕 New Event Notification Features

### 1. Event Invitation Notifications
**Status:** ✅ **WORKING**

**Trigger Points:**
- Creating private event with `invitedUserIds` array
- Using new endpoint: `POST /api/events/:id/invite`

**Example:**
```json
POST /api/events/123/invite
{
  "userIds": [5, 6, 7]
}
```

**Notification:**
```
Title: "Event Invitation from John"
Body: "John Smith invited you to 'Coffee Meetup'"
```

---

### 2. New Attendee Notifications  
**Status:** ✅ **WORKING**

**Trigger:** Someone joins your event with status "going"

**Notification to creator:**
```
Title: "🎉 New attendee for Coffee Meetup!"
Body: "Sarah Johnson is going to your event."
```

**Notes:**
- Not sent when creator joins their own event
- Only for new participants (not status updates)

---

### 3. Attendance Confirmation Notifications
**Status:** ✅ **WORKING**

**Trigger:** User changes status from "maybe"/"not_going" to "going"

**Notification to creator:**
```
Title: "✅ Sarah confirmed attendance!"
Body: "Sarah Johnson is now going to Coffee Meetup."
```

**Notes:**
- Only when changing TO "going"
- Not sent for initial joins (covered by #2)

---

## 📊 Complete Statistics

### Total Notification Types: **11**
- ✅ **10 Active & Working**
- ⚠️ **1 Available but unused**

### Categories:
- 🎉 **Event**: 4 types (3 new!)
- 💬 **Match/Chat**: 3 types
- 👥 **Group**: 3 types
- 📅 **Scheduled**: 2 types

---

## 🚀 Deployment

### To deploy event notifications:
```bash
cd /home/klas/Kod/mooves-project/mooves-backend
./deploy-event-notifications.sh
```

### Manual deployment:
```bash
# Copy files
scp -i ~/.ssh/bahnhofKey3 \
  nodejs-backend/controllers/eventController.js \
  ubuntu@158.174.210.28:/home/ubuntu/mooves-backend/nodejs-backend/controllers/

scp -i ~/.ssh/bahnhofKey3 \
  nodejs-backend/routes/events.js \
  ubuntu@158.174.210.28:/home/ubuntu/mooves-backend/nodejs-backend/routes/

# Restart
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 \
  "cd /home/ubuntu/mooves-backend/nodejs-backend && pm2 restart mooves-backend"
```

---

## 🧪 Testing

### Test Event Invitation:
```bash
# Create private event with invitations
curl -X POST http://your-server/api/events \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Test Event",
    "eventDate": "2025-11-15",
    "isPublic": false,
    "invitedUserIds": [2, 3]
  }'
```

### Test Join Notification:
```bash
# Join event (creator gets notified)
curl -X POST http://your-server/api/events/123/participate \
  -H "Authorization: Bearer TOKEN" \
  -d '{"status": "going"}'
```

### Test Confirmation Notification:
```bash
# Change status to going (creator gets notified)
curl -X POST http://your-server/api/events/123/participate \
  -H "Authorization: Bearer TOKEN" \
  -d '{"status": "going"}'
```

---

## 📋 Requirements

For notifications to work:
1. ✅ FCM token registered for user
2. ✅ Firebase Admin SDK initialized
3. ✅ `firebase-service-account.json` in backend
4. ✅ User has notification permissions

---

## 📖 Documentation

- **Detailed Guide:** `EVENT_NOTIFICATIONS.md`
- **Deployment Script:** `deploy-event-notifications.sh`
- **Event Cleanup:** `EVENT_CLEANUP_FEATURE.md`
- **AI Recommendations:** `AI_EVENT_RECOMMENDATIONS.md`
- **Event Features:** `EVENT_FOCUSED_FEATURES.md`

