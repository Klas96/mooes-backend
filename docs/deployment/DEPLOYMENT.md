# Deployment Guide

This project has a **separated frontend and backend** structure for better organization and deployment flexibility.

## Project Structure

```
mooves/
├── nodejs-backend/     # Backend API (Node.js + Express + PostgreSQL)
├── app/                # Frontend (React Native/Expo)
├── assets/             # Frontend assets
├── dating_app/         # Flutter app
└── ...                 # Other frontend files
```

## Backend Deployment (Google Cloud Run)

The backend is deployed to Google Cloud Run using a containerized approach for better scalability and cost-effectiveness.

### Quick Deploy

Run the deployment script:
```bash
./deploy-backend.sh
```

This script will:
1. Check Google Cloud CLI installation
2. Authenticate with Google Cloud
3. Build the container
4. Deploy to Cloud Run
5. Provide the service URL

### Manual Deploy

If you prefer manual deployment:

1. Install Google Cloud CLI:
   ```bash
   # Follow instructions at: https://cloud.google.com/sdk/docs/install
   ```

2. Authenticate and set project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. Navigate to backend directory:
   ```bash
   cd nodejs-backend
   ```

4. Build and deploy:
   ```bash
   # Build the container
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/mooves-backend
   
   # Deploy to Cloud Run
   gcloud run deploy mooves-backend \
     --image gcr.io/YOUR_PROJECT_ID/mooves-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production
   ```

## Frontend Development

- **React Native/Expo**: Use `npm start` in the root directory
- **Flutter**: Navigate to `dating_app/` and use `flutter run`

## Environment Variables

Set environment variables in Google Cloud Run:

```bash
gcloud run services update mooves-backend \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL=your_postgresql_url \
  --set-env-vars JWT_SECRET=your_jwt_secret
```

Or use Google Secret Manager for sensitive data:
```bash
# Create secrets
echo -n "your_jwt_secret" | gcloud secrets create jwt-secret --data-file=-

# Reference in Cloud Run
gcloud run services update mooves-backend \
  --set-env-vars JWT_SECRET=projects/YOUR_PROJECT/secrets/jwt-secret/versions/latest
```

## Benefits of This Approach

✅ **Cost effective** - pay only for actual usage  
✅ **Auto-scaling** - handles traffic spikes automatically  
✅ **Containerized** - consistent deployment across environments  
✅ **Secure** - built-in security features  
✅ **Global** - deploy to multiple regions easily  

## Troubleshooting

If deployment fails:
1. Check that `nodejs-backend/package.json` exists and is valid
2. Ensure all backend dependencies are in `package.json`
3. Verify the Dockerfile is correct
4. Check Cloud Run logs: `gcloud logs read --service=mooves-backend` 