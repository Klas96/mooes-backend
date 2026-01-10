# Convex Setup Instructions

This guide will help you set up Convex as your database and migrate from PostgreSQL/Sequelize.

## Prerequisites

1. A Convex account (sign up at https://www.convex.dev)
2. Node.js 18+ installed
3. Your existing backend code

## Step 1: Initialize Convex Project

1. Navigate to your backend directory:
   ```bash
   cd mooves-backend/nodejs-backend
   ```

2. Initialize Convex:
   ```bash
   npx convex dev
   ```

   This will:
   - Create a `convex/` directory if it doesn't exist
   - Create a `convex.json` configuration file
   - Prompt you to log in or create a Convex account
   - Create a new Convex project
   - Set environment variables (`CONVEX_URL` and `CONVEX_DEPLOY_KEY`)

3. Follow the prompts to:
   - Log in to Convex (or create an account)
   - Create a new project
   - Link your project

## Step 2: Deploy Schema

The schema file is already created at `convex/schema.js`. Deploy it:

```bash
npx convex deploy
```

Or if you have `npx convex dev` running, it will automatically deploy changes.

## Step 3: Create Functions

Example queries and mutations are provided in:
- `convex/queries/users.js` - User queries
- `convex/mutations/users.js` - User mutations

You'll need to create similar files for all your models:
- `convex/queries/stores.js`
- `convex/queries/storeGoals.js`
- `convex/queries/coupons.js`
- etc.

## Step 4: Set Environment Variables

After running `npx convex dev`, you should have these environment variables set:

```bash
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key
```

Add these to your `.env` file for production use.

## Step 5: Update Express Backend

1. The Convex service is already created at `services/convexService.js`

2. Update your controllers to use Convex instead of Sequelize:

   **Before (Sequelize):**
   ```javascript
   const user = await User.findOne({ where: { email } });
   ```

   **After (Convex):**
   ```javascript
   const convexService = require('../services/convexService');
   const user = await convexService.query('users:getByEmail', { email });
   ```

## Step 6: Test the Migration

1. Start your Express server:
   ```bash
   npm run dev
   ```

2. Test API endpoints to ensure they work with Convex

3. Check Convex dashboard to verify data is being stored

## Step 7: Deploy to Production

### For Vercel:

1. Set environment variables in Vercel dashboard:
   - `CONVEX_URL` - Your Convex deployment URL
   - `CONVEX_DEPLOY_KEY` - Your Convex deploy key (optional, for deployments)

2. Update `vercel.json` if needed to handle Convex deployments

3. Deploy:
   ```bash
   vercel --prod
   ```

## Migration Checklist

- [ ] Initialize Convex project (`npx convex dev`)
- [ ] Deploy schema (`npx convex deploy` or via `convex dev`)
- [ ] Create queries for all models
- [ ] Create mutations for all models
- [ ] Update auth controller
- [ ] Update store controller
- [ ] Update goal controllers
- [ ] Update coupon controllers
- [ ] Update remaining controllers
- [ ] Test all endpoints
- [ ] Deploy to production

## Important Notes

1. **IDs**: Convex uses `Id<"tableName">` instead of integers. You'll need to update your frontend to handle string IDs instead of integer IDs.

2. **Timestamps**: Convex uses milliseconds since epoch for timestamps. Convert from/to Date objects as needed.

3. **Relationships**: Convex uses references (Ids) instead of foreign keys. Use `v.id("tableName")` in schema.

4. **Transactions**: Convex handles transactions automatically. You don't need to manage them manually.

5. **Real-time**: Convex supports real-time subscriptions out of the box. You can subscribe to queries from your frontend.

## Getting Help

- Convex Documentation: https://docs.convex.dev
- Convex Discord: https://convex.dev/community
- Example code in this repo: `convex/queries/` and `convex/mutations/`

