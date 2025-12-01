# Deploy Notification Scheduler Fix

## 🐛 Issue Fixed
The weekly match notification scheduler at Friday 18:00 was **not sending actual notifications** - it was only logging to console. The FCM (Firebase Cloud Messaging) integration was commented out as a TODO.

## ✅ Changes Made

### File: `nodejs-backend/services/notificationScheduler.js`

1. **Added FCM Integration** (Line 4)
   - Imported `sendNotification` from `notificationService.js`

2. **Updated User Query** (Line 60)
   - Now fetches `fcmToken` field from database
   
3. **Implemented Actual Notification Sending** (Lines 211-230)
   - Replaced TODO comment with actual FCM notification calls
   - Added error handling for failed notifications
   - Logs when users don't have FCM tokens

4. **Added Timezone Support** (Lines 22-50)
   - Shows server timezone on startup
   - Explicitly sets timezone for cron job
   - Better logging when job runs

## 🚀 Deployment Steps

### Option 1: Direct File Upload (Fastest)

```bash
# From your local machine
cd /home/klas/Kod/mooves-project/mooves-backend

# Upload the fixed file
scp nodejs-backend/services/notificationScheduler.js ubuntu@158.174.210.28:~/mooves/services/

# SSH to server and restart
ssh ubuntu@158.174.210.28
cd ~/mooves
pm2 restart mooves-backend
pm2 logs mooves-backend --lines 50
```

### Option 2: Git Deployment (Recommended)

```bash
# From your local machine
cd /home/klas/Kod/mooves-project/mooves-backend

# Commit and push changes
git add nodejs-backend/services/notificationScheduler.js
git commit -m "Fix: Implement FCM notifications in weekly match scheduler"
git push

# SSH to server and pull changes
ssh ubuntu@158.174.210.28
cd ~/mooves
git pull
pm2 restart mooves-backend
pm2 logs mooves-backend --lines 50
```

## 🔍 Verification After Deployment

### 1. Check that scheduler started properly

Look for these lines in the logs:
```
🔔 Starting notification scheduler...
   Server time: [date/time with timezone]
   Server timezone: [timezone name]
✅ Notification scheduler started
📋 Scheduled jobs:
   - Weekly match recommendations: Every Friday at 18:00 (6:00 PM) [timezone]
```

### 2. Check server timezone

```bash
# On the server
timedatectl
```

If the server is not in your timezone, the notification will run at 18:00 **server time**, not your local time.

### 3. Test the notification manually (Don't wait for Friday!)

```bash
# On the server, run this to trigger the notification immediately:
cd ~/mooves

# Using curl (if you have auth token)
curl -X POST http://localhost:8080/api/notifications/trigger-weekly-matches \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Or check the logs to see when next Friday 18:00 is
pm2 logs mooves-backend --lines 100 | grep "notification scheduler"
```

## ⚙️ Requirements

Before the notifications will work, make sure:

1. **Firebase is configured**
   - Firebase service account JSON file exists on server
   - Path: `~/mooves/firebase-service-account.json`
   
2. **Users have FCM tokens**
   - Users must have logged in to the mobile app
   - The app stores FCM tokens in the `fcmToken` field
   
3. **Users have opted in**
   - Check `notificationPreferences.weeklyMatches = true` in database
   - By default this is `true` for all users

## 🧪 Testing Checklist

- [ ] Server is running (check with `pm2 status`)
- [ ] Notification scheduler started (check logs)
- [ ] Server timezone is correct (or you know when 18:00 server time is)
- [ ] Firebase is initialized (look for "✅ Firebase Admin SDK initialized" in logs)
- [ ] You have an FCM token in the database (check your user record)
- [ ] Your `notificationPreferences.weeklyMatches` is `true`
- [ ] There are potential matches for you in the database

## 📊 Check Your Database

```bash
# On the server
sudo -u postgres psql mooves_prod

# Check if you have an FCM token
SELECT id, email, "fcmToken" IS NOT NULL as has_token, "notificationPreferences" 
FROM "Users" 
WHERE email = 'your-email@example.com';

# Count users eligible for notifications
SELECT COUNT(*) 
FROM "Users" 
WHERE "emailVerified" = true 
  AND "fcmToken" IS NOT NULL
  AND "notificationPreferences"->>'weeklyMatches' = 'true';
```

## 🕐 When Will Notifications Run?

The cron job runs **every Friday at 18:00** in the server's timezone.

If today is Saturday November 2, 2025, the next notification will be:
- **Friday, November 8, 2025 at 18:00** (server time)

## 🔥 Manual Trigger (For Testing)

You can manually trigger the weekly notifications via API:

```bash
# Get your auth token from the app first, then:
curl -X POST http://158.174.210.28/api/notifications/trigger-weekly-matches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

**Created:** 2025-11-01  
**Issue:** Weekly notifications not being sent  
**Fix:** Implemented FCM integration in notification scheduler

