# Manual Deployment - Event Location Fix

## Quick Deploy Commands

### Step 1: Copy File to VPS
```bash
cd /home/klas/Kod/mooves-project/mooves-backend

scp -i PrivateKeyBahnhof.rsa \
  nodejs-backend/controllers/eventController.js \
  ubuntu@158.174.210.28:/opt/mooves-backend/nodejs-backend/controllers/
```

### Step 2: Restart Backend
```bash
ssh -i PrivateKeyBahnhof.rsa ubuntu@158.174.210.28 \
  "cd /opt/mooves-backend && pm2 restart mooves-backend"
```

### Step 3: Verify Deployment
```bash
ssh -i PrivateKeyBahnhof.rsa ubuntu@158.174.210.28 \
  "pm2 logs mooves-backend --lines 30 --nostream"
```

## What Was Fixed

### Backend Bug
```javascript
// BEFORE (broken):
location: location?.trim() || event.location,

// AFTER (fixed):
location: location !== undefined ? (location?.trim() || null) : event.location,
```

This allows location to be:
- ✅ Updated to a new value
- ✅ Cleared (set to null)
- ✅ Kept unchanged (if not in request)

### Added Debug Logging
```javascript
console.log('=== UPDATE EVENT ===');
console.log('Event ID:', id);
console.log('Location value:', location, 'Type:', typeof location);
console.log('✅ Event updated successfully');
console.log('Updated location:', updatedEvent.location);
```

## Testing After Deployment

1. **Restart your Flutter app** (to ensure fresh state)

2. **Edit an event**:
   - Open any event you created
   - Click Edit (pencil icon)
   - Enter/update the Location field
   - Click Update

3. **Verify the update**:
   - Open event details
   - You should see: `📍 Location: [your location]`

4. **Check backend logs** (optional):
   ```bash
   ssh -i PrivateKeyBahnhof.rsa ubuntu@158.174.210.28 \
     "pm2 logs mooves-backend --lines 50"
   ```
   
   Look for:
   ```
   === UPDATE EVENT ===
   Event ID: 123
   Location value: Central Café, Stockholm Type: string
   ✅ Event updated successfully
   Updated location: Central Café, Stockholm
   ```

## All-in-One Deploy Script

Copy and paste this entire block:

```bash
cd /home/klas/Kod/mooves-project/mooves-backend && \
scp -i PrivateKeyBahnhof.rsa \
  nodejs-backend/controllers/eventController.js \
  ubuntu@158.174.210.28:/opt/mooves-backend/nodejs-backend/controllers/ && \
ssh -i PrivateKeyBahnhof.rsa ubuntu@158.174.210.28 \
  "cd /opt/mooves-backend && pm2 restart mooves-backend && pm2 logs mooves-backend --lines 20 --nostream"
```

## Troubleshooting

### If SCP Fails
- Check SSH key permissions: `ls -l PrivateKeyBahnhof.rsa` (should be `-rw-------`)
- If wrong: `chmod 600 PrivateKeyBahnhof.rsa`

### If PM2 Restart Fails
- SSH into server and check manually:
  ```bash
  ssh -i PrivateKeyBahnhof.rsa ubuntu@158.174.210.28
  cd /opt/mooves-backend
  pm2 status
  pm2 restart mooves-backend
  ```

### If Location Still Doesn't Update
- Check backend logs for the debug output
- Verify the API is receiving the location field
- Check your Flutter debug console for the outgoing request

---

**Note**: Frontend changes are already applied and don't need deployment (just restart your Flutter app).

