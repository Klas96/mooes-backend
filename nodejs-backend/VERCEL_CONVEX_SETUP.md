# Vercel + Convex Deployment Setup

This guide covers deploying the Mooves backend with Convex to Vercel.

## Prerequisites

1. Vercel account (connected to your project)
2. Convex account (create at https://www.convex.dev)
3. Convex project initialized locally

## Step 1: Initialize Convex Locally

Before deploying, you need to initialize Convex locally:

```bash
cd mooves-backend/nodejs-backend
npx convex dev
```

This will:
- Create your Convex project
- Generate `convex.json` (should be in `.gitignore`)
- Set `CONVEX_URL` in your local environment

**Important:** The `convex.json` file contains project-specific settings and should NOT be committed to git.

## Step 2: Get Convex Deployment URL

After running `npx convex dev`, you'll get a deployment URL like:
```
https://your-project.convex.cloud
```

You'll need this for Vercel environment variables.

## Step 3: Deploy Convex Functions

Deploy your Convex functions to production:

```bash
npx convex deploy
```

Or use the production deploy key:

```bash
CONVEX_DEPLOY_KEY=your-deploy-key npx convex deploy --prod
```

## Step 4: Set Vercel Environment Variables

Go to your Vercel project settings: https://vercel.com/klas-projects-ee322207/mooves-backend/settings/environment-variables

Add these environment variables:

### Required for Convex:

```bash
CONVEX_URL=https://your-project.convex.cloud
```

### Optional (if using Convex deploy key in Vercel builds):

```bash
CONVEX_DEPLOY_KEY=your-production-deploy-key
```

### Other Required Variables (if not already set):

```bash
# Database (still needed if using Sequelize during migration)
DATABASE_URL=postgresql://... (can be removed after full Convex migration)

# JWT
JWT_SECRET=your-jwt-secret

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
ALLOWED_ORIGINS=https://your-frontend.com,https://*.github.io

# Frontend URL
FRONTEND_URL=https://your-frontend.com
```

## Step 5: Update vercel.json (if needed)

The current `vercel.json` should work fine. If you want to build/deploy Convex functions during Vercel builds, you can add:

```json
{
  "buildCommand": "npx convex deploy --cmd 'echo Convex deployed'",
  "installCommand": "npm install && npx convex deploy"
}
```

However, it's recommended to deploy Convex functions separately (via CLI or Convex dashboard).

## Step 6: Deploy to Vercel

```bash
cd mooves-backend/nodejs-backend
vercel --prod
```

Or push to your git repository (if connected to Vercel), and Vercel will auto-deploy.

## Step 7: Verify Deployment

1. Check Vercel deployment logs:
   ```bash
   vercel logs --follow
   ```

2. Test the health endpoint:
   ```bash
   curl https://mooves-backend.vercel.app/api/health
   ```

3. Check Convex dashboard: https://dashboard.convex.dev
   - Verify functions are deployed
   - Check database schema is deployed
   - Monitor queries/mutations

## Troubleshooting

### Issue: "Convex client not initialized"

**Solution:** Make sure `CONVEX_URL` is set in Vercel environment variables and redeploy.

### Issue: "Function not found" errors

**Solution:** 
1. Deploy Convex functions: `npx convex deploy`
2. Verify function names match between Express calls and Convex definitions
3. Check Convex dashboard to see deployed functions

### Issue: Schema mismatch

**Solution:**
1. Update `convex/schema.js` with correct schema
2. Deploy: `npx convex deploy`
3. Verify in Convex dashboard

### Issue: Deployment fails

**Solution:**
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify `vercel.json` is correct
- Check that `convex/` directory is included (should be committed)

## Migration Status

The Convex integration is set up, but controllers still use Sequelize. You'll need to:

1. Complete Convex setup (run `npx convex dev` locally)
2. Create all necessary queries/mutations in `convex/`
3. Migrate controllers to use Convex service
4. Test thoroughly
5. Deploy

Until the migration is complete, the backend will continue using PostgreSQL/Sequelize (which requires `DATABASE_URL`).

## Next Steps

1. Initialize Convex locally: `npx convex dev`
2. Create all queries/mutations needed
3. Migrate controllers to use Convex
4. Test locally
5. Deploy to Vercel
6. Set environment variables in Vercel
7. Monitor and verify

## Resources

- Convex Docs: https://docs.convex.dev
- Vercel Docs: https://vercel.com/docs
- Convex + Vercel: https://docs.convex.dev/production/hosting/vercel

