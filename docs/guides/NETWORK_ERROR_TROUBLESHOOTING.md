# Network Server Error - Profile Edit Troubleshooting Guide

## Problem
Users are experiencing "Network server error when saving profile edits" in the Flutter app.

## Root Causes Identified

### 1. Database Schema Issues
- **Issue**: PostgreSQL ARRAY type for `relationshipType` field may not be properly handled
- **Fix**: Added fallback mechanisms and better validation

### 2. Validation Errors
- **Issue**: Strict validation for `relationshipType` field was rejecting valid input
- **Fix**: Made validation more flexible to accept both string and array formats

### 3. Network Timeout Issues
- **Issue**: No timeout configuration on HTTP requests
- **Fix**: Added 30-second timeout with proper error handling

### 4. Error Handling
- **Issue**: Generic error messages made debugging difficult
- **Fix**: Added specific error messages for different failure scenarios

## Changes Made

### Backend (Node.js/Express)
1. **Enhanced Error Logging** (`controllers/profileController.js`)
   - Added detailed request/response logging
   - Better error categorization (validation, database, connection, timeout)
   - Stack trace logging for debugging

2. **Improved Validation** (`routes/profiles.js`)
   - Made `relationshipType` validation more flexible
   - Accepts both string and array formats
   - Better error messages

3. **Database Safety Checks** (`controllers/profileController.js`)
   - Added fallback for empty `relationshipType` arrays
   - Better handling of PostgreSQL ARRAY types

4. **Health Check Endpoints** (`server.js`)
   - Added detailed health check for debugging
   - Database connection status monitoring

### Frontend (Flutter)
1. **Enhanced Error Handling** (`services/profile_service.dart`)
   - Added 30-second timeout configuration
   - Specific error messages for different failure types
   - Proper HTTP client cleanup

2. **Better User Feedback** (`screens/tabs/profile_tab.dart`)
   - More specific error messages
   - Retry functionality
   - Color-coded success/error notifications

## Testing

### Network Connectivity Test
Run the network test script to verify connectivity:
```bash
node nodejs-backend/scripts/test-network.js
```

### Expected Results
- ✅ Health Check: 200 OK
- ✅ Profile Endpoint: 401 (without auth) - this is correct
- ❌ Detailed Health Check: 404 (route not found) - needs deployment

## Deployment

### Deploy to Google Cloud Run
1. Navigate to the backend directory:
   ```bash
   cd nodejs-backend
   ```

2. Run the deployment script:
   ```bash
   ../scripts/deploy-to-gcloud.sh
   ```

3. Or deploy manually:
   ```bash
   git add .
   git commit -m "Fix network server errors for profile updates"
   git push gcloud main
   ```

### Verify Deployment
1. Check app status:
   ```bash
   gcloud ps --app your-app-name
   ```

2. Check recent logs:
   ```bash
   gcloud logs --tail --app your-app-name
   ```

3. Test health endpoints:
   ```bash
   curl https://your-app-name.gcloudapp.com/api/health
   curl https://your-app-name.gcloudapp.com/api/health/detailed
   ```

## Debugging Steps

### 1. Check Google Cloud Run Logs
```bash
gcloud logs --tail --app your-app-name
```

Look for:
- Database connection errors
- Validation errors
- Request timeout errors
- Memory issues

### 2. Test Database Connection
```bash
gcloud run node -e "
const { sequelize } = require('./models');
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database error:', err))
" --app your-app-name
```

### 3. Check Environment Variables
```bash
gcloud config --app your-app-name
```

Ensure these are set:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

### 4. Monitor App Performance
```bash
gcloud ps --app your-app-name
```

Check for:
- Dyno restarts
- Memory usage
- Response times

## Common Issues and Solutions

### Issue: "Database connection not available"
**Solution**: Check `DATABASE_URL` environment variable on Google Cloud Run

### Issue: "Validation error: Relationship type must be an array"
**Solution**: Fixed in validation - now accepts both string and array formats

### Issue: "Request timeout"
**Solution**: Added 30-second timeout with retry functionality

### Issue: "Server error"
**Solution**: Enhanced error logging to identify specific cause

## Prevention

### 1. Monitoring
- Set up Google Cloud Run monitoring
- Monitor database connection pool
- Track response times

### 2. Testing
- Add integration tests for profile updates
- Test with various input formats
- Load testing for concurrent requests

### 3. Error Tracking
- Consider adding error tracking service (Sentry, etc.)
- Monitor error rates and patterns
- Set up alerts for critical errors

## Support

If issues persist after implementing these fixes:

1. Check Google Cloud Run logs for specific error messages
2. Test with the network test script
3. Verify database connectivity
4. Check environment variables
5. Monitor app performance metrics 