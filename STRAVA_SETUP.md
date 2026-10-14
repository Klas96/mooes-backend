# Strava Setup Guide

## Overview

This guide will help you set up Strava integration for the Mooves app. Strava allows users to sync their running and cycling activities directly into the app.

## Prerequisites

- A Strava account
- Access to Strava API settings

## Step 1: Create a Strava Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click on **"Create an App"** or **"Register Your Application"**
3. Fill in the required details:
   - **Application Name**: Mooves (or your app name)
   - **Category**: Website
   - **Website**: Your app's website URL
   - **Application Description**: Brief description of your app
   - **Authorization Callback Domain**: Your domain (e.g., `mooves-dating-app.web.app`)
4. After creation, you'll receive:
   - **Client ID**: A numeric ID
   - **Client Secret**: A secret string (keep this secure!)

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env` or `.env-config.yaml` file:

### For Development (.env)
```env
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_REDIRECT_URI=http://localhost:3000/strava-callback
```

### For Production (.env-config.yaml)
```yaml
strava:
  client_id: your_client_id_here
  client_secret: your_client_secret_here
  redirect_uri: https://mooves-dating-app.web.app/strava-callback
```

## Step 3: Update Database Schema

Run the migration to add Strava fields to the database:

```bash
# If using Sequelize migrations
npx sequelize-cli db:migrate

# Or manually run the migration
node migrations/202501180001-add-strava-fields.js
```

The migration adds the following fields:
- `Users` table: `stravaAccessToken`, `stravaRefreshToken`, `stravaTokenExpiry`, `stravaConnected`, `stravaAthleteId`, `lastStravaSync`
- `TrainingSessions` table: `stravaActivityId`

## Step 4: Install Dependencies

Make sure `axios` is installed (required for Strava API calls):

```bash
npm install axios
```

## Step 5: Restart Backend Server

After configuring the environment variables, restart your backend server:

```bash
# Development
npm run dev

# Production
# Restart your production server process
```

## Step 6: Test the Integration

### Test Authorization URL
```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
  http://localhost:8000/api/strava/auth-url
```

### Test Status
```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
  http://localhost:8000/api/strava/status
```

## API Endpoints

Once configured, the following endpoints are available:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/strava/auth-url` | Get OAuth authorization URL | Yes |
| POST | `/api/strava/callback` | Handle OAuth callback | Yes |
| POST | `/api/strava/sync` | Sync activities from Strava | Yes |
| GET | `/api/strava/status` | Get connection status | Yes |
| DELETE | `/api/strava/disconnect` | Disconnect Strava | Yes |

## Frontend Integration

The frontend service is available at:
- `lib/services/strava_service.dart`

Example usage:
```dart
// Connect Strava
final result = await StravaService.connectStrava();

// Sync activities
final syncResult = await StravaService.syncActivities(
  startDate: DateTime.now().subtract(Duration(days: 7)),
  endDate: DateTime.now(),
  activityType: 'Run', // Optional: 'Run', 'Ride', etc.
);

// Check status
final status = await StravaService.getStatus();
```

## OAuth Flow

1. User clicks "Connect Strava" in the app
2. App calls `/api/strava/auth-url` to get authorization URL
3. User is redirected to Strava authorization page
4. User authorizes the app
5. Strava redirects back with authorization code
6. App calls `/api/strava/callback` with the code
7. Backend exchanges code for access/refresh tokens
8. Tokens are stored in the database

## Token Management

- **Access tokens** expire after 6 hours
- **Refresh tokens** are used to get new access tokens
- The service automatically refreshes tokens when needed
- Refresh tokens don't expire unless revoked

## Activity Syncing

- Activities are synced from Strava and stored as `TrainingSession` records
- By default, syncs activities from the last 7 days
- Can filter by activity type (Run, Ride, Walk, etc.)
- Duplicate activities are not created (matched by `stravaActivityId`)

## Troubleshooting

### "OAuth credentials not configured"
- Make sure `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are set in environment variables

### "Failed to connect Strava"
- Check that the redirect URI matches exactly what's configured in Strava
- Verify the authorization code hasn't expired (codes expire quickly)

### "Token expired" errors
- The service should auto-refresh tokens, but if issues persist, try disconnecting and reconnecting

### Rate Limiting
- Strava has rate limits: 600 requests per 15 minutes, 30,000 per day
- The service handles rate limits gracefully

## Security Notes

- Never commit client secrets to version control
- Use environment variables for all sensitive configuration
- Store tokens securely in the database
- Regularly rotate client secrets if compromised

## Additional Resources

- [Strava API Documentation](https://developers.strava.com/docs/)
- [Strava OAuth Guide](https://developers.strava.com/docs/authentication/)
- [Strava API Reference](https://developers.strava.com/docs/reference/)

