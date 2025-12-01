# Automatic Event Cleanup Feature

## 🗑️ What It Does

Automatically removes events from the database **2 days after** their event date has passed.

## 📅 Schedule

- **Runs:** Every day at 03:00 (3:00 AM) UTC
- **What it deletes:** Events where `eventDate` is more than 2 days in the past
- **Cascade deletion:** Event participants are also automatically deleted

## 🚀 Deployment Status

✅ **Deployed to VPS on:** November 1, 2025  
✅ **Server:** 158.174.210.28  
✅ **Status:** Active and running

## 📋 Technical Details

### Files Modified

1. **`services/notificationScheduler.js`**
   - Added `Event` model import
   - Added daily cron job at 03:00 AM
   - Added `cleanupOldEvents()` method
   - Added `triggerEventCleanup()` for manual testing

2. **`controllers/notificationController.js`**
   - Added `triggerEventCleanup()` endpoint handler

3. **`routes/notifications.js`**
   - Added `POST /api/notifications/trigger-event-cleanup` route

### How It Works

```javascript
// Calculates cutoff date (2 days ago)
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

// Finds and deletes old events
await Event.destroy({
  where: {
    eventDate: {
      [Op.lt]: twoDaysAgo,
      [Op.not]: null
    }
  }
});
```

### Database Impact

- Events with `eventDate = NULL` are **NOT** deleted (they have no specific date)
- Only events with a past event date older than 2 days are removed
- The database `ON DELETE CASCADE` ensures participants are also removed

## 🧪 Testing

### Manual Trigger

You can manually test the cleanup without waiting for 03:00 AM:

```bash
cd /home/klas/Kod/mooves-project/mooves-backend
./test-event-cleanup.sh YOUR_AUTH_TOKEN
```

Or using curl directly:

```bash
curl -X POST http://158.174.210.28/api/notifications/trigger-event-cleanup \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response

```json
{
  "message": "Event cleanup completed",
  "deleted": 5,
  "error": null
}
```

### Check Server Logs

```bash
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 "pm2 logs mooves-backend --lines 100 | grep -A 20 'event cleanup'"
```

## 📊 What Gets Logged

When the cleanup runs, you'll see logs like:

```
🗑️  Starting event cleanup...
   Cutoff date: 2025-10-30T00:00:00.000Z
   Found 5 events to delete
✅ Event cleanup complete: 5 events deleted
   - Deleted: "Coffee Meetup" (2025-10-25)
   - Deleted: "Hiking Trip" (2025-10-28)
   - Deleted: "Book Club" (2025-10-29)
   ... and 2 more
```

## ⏰ Next Cleanup

The cleanup runs **daily at 03:00 AM UTC**.

For Swedish time (CET/CEST):
- **Winter (CET):** 04:00 AM Swedish time
- **Summer (CEST):** 05:00 AM Swedish time

## 🔍 Verification

To verify the scheduler is running, check the startup logs:

```bash
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28 "pm2 logs mooves-backend --lines 50 | grep -A 5 'notification scheduler'"
```

You should see:

```
🔔 Starting notification scheduler...
   Server time: [date/time]
   Server timezone: UTC
✅ Notification scheduler started
📋 Scheduled jobs:
   - Weekly match recommendations: Every Friday at 18:00 (6:00 PM) UTC
   - Event cleanup (2 days after event): Every day at 03:00 (3:00 AM) UTC
```

## 🛡️ Safety Features

1. **Only deletes events with dates** - Events without an `eventDate` are preserved
2. **2-day grace period** - Gives users time to review past events
3. **Cascade deletion** - Ensures no orphaned participant records
4. **Detailed logging** - Shows exactly what was deleted
5. **Manual trigger** - Can be tested before automatic runs

## 🔄 Future Enhancements

Possible improvements:

- [ ] Add admin configuration for retention period (currently hard-coded to 2 days)
- [ ] Send notification to event creator before deletion
- [ ] Archive events instead of deleting them
- [ ] Add cleanup statistics endpoint
- [ ] Make retention period configurable per event

## 📞 Support

If the cleanup isn't working:

1. **Check if scheduler started:**
   ```bash
   ssh ubuntu@158.174.210.28 "pm2 logs mooves-backend | grep 'notification scheduler'"
   ```

2. **Manually trigger to test:**
   ```bash
   ./test-event-cleanup.sh YOUR_TOKEN
   ```

3. **Check for errors:**
   ```bash
   ssh ubuntu@158.174.210.28 "pm2 logs mooves-backend --err --lines 100"
   ```

## 🎯 Example Scenarios

### Scenario 1: Event was yesterday
- **Event Date:** October 31, 2025
- **Today:** November 1, 2025
- **Action:** ❌ NOT deleted (only 1 day old)

### Scenario 2: Event was 2 days ago
- **Event Date:** October 30, 2025
- **Today:** November 1, 2025
- **Action:** ❌ NOT deleted (exactly 2 days, cutoff is > 2 days)

### Scenario 3: Event was 3 days ago
- **Event Date:** October 29, 2025
- **Today:** November 1, 2025
- **Action:** ✅ DELETED

### Scenario 4: Event has no date
- **Event Date:** NULL
- **Action:** ❌ NOT deleted (preserved indefinitely)

---

**Created:** November 1, 2025  
**Feature:** Automatic event cleanup  
**Schedule:** Daily at 03:00 AM UTC  
**Retention:** 2 days after event date

