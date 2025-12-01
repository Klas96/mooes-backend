# Manual Backend Deployment Guide

## 🚀 Deploy authController Changes

### Step 1: Upload the File

From your local machine:

```bash
# Option A: If you know your server IP/hostname
scp /home/klas/Kod/mooves-project/mooves-backend/nodejs-backend/controllers/authController.js ubuntu@YOUR_SERVER_IP:~/mooves/controllers/

# Option B: If you have an SSH config
scp /home/klas/Kod/mooves-project/mooves-backend/nodejs-backend/controllers/authController.js your-server:~/mooves/controllers/
```

### Step 2: SSH to Server and Restart

```bash
# Connect to server
ssh ubuntu@YOUR_SERVER_IP

# Go to backend directory
cd ~/mooves

# Restart the service
pm2 restart mooves-backend

# Check status
pm2 status

# View logs to verify
pm2 logs mooves-backend --lines 30
```

### Step 3: Verify Changes

```bash
# Check if the file was updated
ls -la controllers/authController.js

# Look for recent modification time
```

---

## ✅ What Changed

**File:** `controllers/authController.js`

**Change:** Lines 280-298
- Removed: Email verification block that prevented login
- Added: `requiresVerification` flag in response
- Result: Unverified users can now login and are redirected to verification screen

---

## 🧪 Test After Deployment

1. Create or use an unverified account:
```bash
sudo -u postgres psql mooves_dev -c "UPDATE \"Users\" SET \"emailVerified\" = false WHERE email = 'test@example.com';"
```

2. Try logging in with that account in the app

3. You should:
   - ✅ Login successfully
   - ✅ See email verification screen
   - ✅ Be able to enter verification code or resend email

---

## 🔄 Alternative: Git-based Deployment

If you have Git set up on the server:

```bash
# On your local machine
cd /home/klas/Kod/mooves-project/mooves-backend
git add nodejs-backend/controllers/authController.js
git commit -m "Allow unverified users to login and redirect to verification screen"
git push

# On the server
ssh ubuntu@YOUR_SERVER_IP
cd ~/mooves
git pull
pm2 restart mooves-backend
```

---

## 📞 If Problems Occur

### Backend won't start:
```bash
pm2 logs mooves-backend --err --lines 50
```

### Syntax errors:
```bash
node -c controllers/authController.js
```

### Rollback:
```bash
git checkout HEAD -- controllers/authController.js
pm2 restart mooves-backend
```

---

**Created:** 2025-10-10
**Change:** Email verification redirect

