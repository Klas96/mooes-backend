# Google Fit Setup Guide

## Current Status

✅ **Code Implementation**: Complete
- Frontend service: ✅ Implemented
- Backend controller: ✅ Implemented  
- API routes: ✅ Implemented
- Activity syncing: ✅ Implemented

❌ **Configuration**: Incomplete
- Client ID: ✅ Configured
- Client Secret: ❌ Still placeholder (`YOUR_GOOGLE_FIT_CLIENT_SECRET_HERE`)
- Redirect URI: ✅ Configured

## How to Complete Setup

### 1. Get Google Fit Client Secret from Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one for Mooves)
3. Navigate to **APIs & Services > Credentials**
4. Find the OAuth 2.0 Client ID that matches your client_id:
   - `914596881459-508j97v59d1b0ka5oq9mjq0dsfhffdcu.apps.googleusercontent.com`
5. Click on it to view details
6. Copy the **Client Secret** (or click "Reset Secret" if needed)

### 2. Enable Google Fitness API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Fitness API" or "Google Fitness API"
3. Click **Enable**

### 3. Configure OAuth Scopes

Make sure your OAuth consent screen includes these scopes:
- `https://www.googleapis.com/auth/fitness.activity.read`
- `https://www.googleapis.com/auth/fitness.activity.write`
- `https://www.googleapis.com/auth/fitness.location.read`

### 4. Update Configuration on Production Server

SSH to your server and update `.env-config.yaml`:

```bash
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28
cd /home/ubuntu/mooves-backend
nano .env-config.yaml
```

Replace the placeholder:
```yaml
google_fit:
  client_id: 914596881459-508j97v59d1b0ka5oq9mjq0dsfhffdcu.apps.googleusercontent.com
  client_secret: YOUR_ACTUAL_CLIENT_SECRET_HERE  # Replace this!
  redirect_uri: https://mooves-dating-app.web.app/google-fit-callback
```

### 5. Restart Backend

```bash
# Find the process
ps aux | grep "node.*server.js" | grep 9090

# Restart it (or use PM2 if configured)
kill <PID>
cd /home/ubuntu/mooves-backend
PORT=9090 DATABASE_URL='postgresql://mooves_user:MoovesProd!2025Secure@localhost:5432/mooves_prod' nohup node server.js > /tmp/mooves-backend-9090.log 2>&1 &
```

## Testing Google Fit

Once configured, test the endpoints:

```bash
# Get auth URL (requires valid JWT token)
curl -H "Authorization: Bearer <token>" \
  http://backend.klasholmgren.se/api/google-fit/auth-url

# Check status
curl -H "Authorization: Bearer <token>" \
  http://backend.klasholmgren.se/api/google-fit/status
```

## Current Error

If you try to connect Google Fit now, you'll get:
```
"error": "Google Fit OAuth credentials not configured"
"code": "OAUTH_NOT_CONFIGURED"
```

This will be fixed once you add the real client secret.

