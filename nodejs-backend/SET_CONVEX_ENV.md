# Quick Setup: Set CONVEX_URL in Vercel

Your Convex project is ready, but you need to set the environment variable in Vercel.

## Your Convex URLs

You have two deployments:
- **Dev:** `https://artful-canary-975.convex.cloud` (for local development)
- **Prod:** `https://loyal-capybara-991.convex.cloud` (for production/Vercel)

**Use the PROD URL for Vercel:**
```
https://loyal-capybara-991.convex.cloud
```

## Steps to Set in Vercel

1. **Go to Vercel Dashboard:**
   https://vercel.com/klas-projects-ee322207/mooves-backend/settings/environment-variables

2. **Add Environment Variable:**
   - Click "Add New"
   - **Key:** `CONVEX_URL`
   - **Value:** `https://artful-canary-975.convex.cloud`
   - **Environment:** Select all (Production, Preview, Development)
   - Click "Save"

3. **Redeploy:**
   - Go to: https://vercel.com/klas-projects-ee322207/mooves-backend/deployments
   - Click the three dots on the latest deployment
   - Click "Redeploy"

   OR

   Run from terminal:
   ```bash
   cd mooves-backend/nodejs-backend
   vercel --prod
   ```

## Verify It's Working

After redeploying, check the logs:
```bash
vercel logs --follow
```

You should see:
```
✅ Convex service initialized: https://artful-canary-975.convex.cloud
✅ Using Convex-based auth controller
```

## Deploy Convex Functions

Deploy your Convex functions to production:
```bash
cd mooves-backend/nodejs-backend
npx convex deploy --yes
```

This will deploy all your queries, mutations, and schema to the production Convex deployment. The `--yes` flag skips the confirmation prompt.

