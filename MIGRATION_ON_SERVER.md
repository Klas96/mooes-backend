# Run This on Your Production Server

## 📋 Migration Commands

After deploying the backend code, SSH to your server and run:

```bash
# SSH to your server
ssh your-server

# Navigate to backend directory
cd /opt/mooves-backend/nodejs-backend

# Run the migration
node migrations/create-conversations-table.js
```

## ✅ Expected Output

```
Starting Conversations table migration...
✅ Created Conversations table
✅ Created indexes on Conversations table
✅ Migration completed successfully!
Migration completed
```

## ⚠️ If Table Already Exists

```
Starting Conversations table migration...
✅ Conversations table already exists
Migration completed
```

This is fine! It means the table is already there.

## 🔍 Verify Migration

```bash
# Check table exists
psql $DATABASE_URL -c "\dt Conversations"

# Check table structure
psql $DATABASE_URL -c "\d Conversations"

# Test insert
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Conversations\";"
```

## 🐛 If Migration Fails

### Issue: Connection refused
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Should output something like:
# postgresql://user:pass@host:5432/dbname
```

### Issue: Permission denied
```bash
# Check if you're in the right directory
pwd
# Should be: /opt/mooves-backend/nodejs-backend

# Check if node is installed
node --version
```

### Issue: Module not found
```bash
# Install dependencies
npm install

# Then retry migration
node migrations/create-conversations-table.js
```

## ✨ That's It!

Once migration is complete, the backend is fully deployed with:
- ✅ GPT-4 Turbo AI
- ✅ Database persistence
- ✅ Streaming responses
- ✅ Smart matching
- ✅ Like notifications
- ✅ Who Likes You API

The app will automatically start using all new features!

