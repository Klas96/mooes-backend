# How to Get Google Fit OAuth Client Secret

## Current Situation

- **Client ID**: `914596881459-508j97v59d1b0ka5oq9mjq0dsfhffdcu.apps.googleusercontent.com`
- **Client Secret**: ❌ Missing (still placeholder)
- **API Key**: ✅ `AIzaSyD5rT_Spw3JvZwVhqi1FDvXHDkppofhDdw` (but this is for APIs, not OAuth)

## Difference: API Key vs OAuth Client Secret

### API Key (`AIza...`)
- Used for accessing public Google APIs
- Not used for OAuth authentication
- Useful for Google Maps, Places API, etc.

### OAuth Client Secret (starts with `GOCSPX-...` or similar)
- Used for OAuth 2.0 authentication flows
- **Required for Google Fit** to authenticate users
- Different from API key!

## Steps to Get Client Secret

### Option 1: From Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project: `mooves-dating-app` (or `fresh-oath-337920`)
3. Find the OAuth 2.0 Client ID with ID: `914596881459-508j97v59d1b0ka5oq9mjq0dsfhffdcu`
4. Click on it
5. Copy the **Client secret** (it starts with `GOCSPX-` or similar)

### Option 2: Create New OAuth Client

If you can't find the existing one:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `Mooves Google Fit`
5. Authorized redirect URIs:
   - `https://mooves-dating-app.web.app/google-fit-callback`
   - `https://mooves.klasholmgren.se/google-fit-callback`
6. Click **Create**
7. Copy both **Client ID** and **Client Secret**

## Once You Have the Client Secret

I can help you:
1. Update the configuration on the production server
2. Restart the backend
3. Test the Google Fit connection

Just provide the Client Secret and I'll configure it!

