# Fix Database Password Authentication Error

## Problem
The backend server is failing to start with the error:
```
password authentication failed for user "mooves_user"
```

## Solution Steps

### 1. Check Current Database Configuration on Production Server

SSH to your production server:
```bash
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28
```

Find the backend directory:
```bash
cd /home/ubuntu/key-match/nodejs-backend  # or /home/ubuntu/mooves-backend/nodejs-backend
```

Check the DATABASE_URL in your config:
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Or check .env-config.yaml
cat .env-config.yaml | grep -A 5 database
```

### 2. Update Database Password

You have two options:

#### Option A: Update the password in the database (if you know the correct password)

1. Connect to your PostgreSQL database server
2. Update the user password:
```sql
ALTER USER mooves_user WITH PASSWORD 'your_correct_password';
```

#### Option B: Reset the password and update configuration

1. Connect to your PostgreSQL database
2. Generate a new secure password
3. Reset the password:
```sql
ALTER USER mooves_user WITH PASSWORD 'new_secure_password_here';
```

4. Update your `.env-config.yaml` or `.env` file on the production server:
```yaml
database:
  url: "postgresql://mooves_user:new_secure_password_here@your_host:5432/mooves_db"
```

### 3. Restart the Backend Server

After updating the password:

```bash
# On production server
cd /home/ubuntu/key-match/nodejs-backend
pm2 restart keymatch-backend

# Check logs to verify connection
pm2 logs keymatch-backend --lines 20
```

You should see:
```
✅ Database connection authenticated successfully
Server running on port 8080
```

### 4. Verify Connection

Test the database connection:
```bash
cd /home/ubuntu/key-match/nodejs-backend
node scripts/test-db-connection.js
```

## Common Issues

### Issue: Don't know the database host/IP
The database is likely on Google Cloud SQL or a remote server. Check your `.env-config.yaml` or deployment configuration.

### Issue: Can't connect to PostgreSQL to change password
- If using Google Cloud SQL, use the Cloud Console or `gcloud` CLI
- If on a VPS, SSH to that server and connect as postgres user

### Issue: Password changed but server still fails
1. Verify the password is correct in the config file
2. Make sure you restarted the PM2 process
3. Check PM2 logs for any other errors
4. Verify the database user has proper permissions

## Testing After Fix

Once the password is updated and server restarted:
1. Try logging in from the frontend
2. Check server logs: `pm2 logs keymatch-backend`
3. Test API endpoint: `curl http://backend.klasholmgren.se/api/health`

