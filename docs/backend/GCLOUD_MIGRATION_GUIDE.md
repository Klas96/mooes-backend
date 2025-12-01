# Google Cloud SQL Migration Guide

## Overview
This guide will help you migrate your PostgreSQL database from your current setup to Google Cloud SQL.

## Prerequisites
1. Google Cloud Platform account
2. Google Cloud CLI installed
3. Your application already uses PostgreSQL with Sequelize (✅ Already configured)

## Step 1: Set Up Google Cloud Project

### 1.1 Create a new project or use existing one
```bash
# Create new project
gcloud projects create mooves-app --name="Mooves App"

# Or use existing project
gcloud config set project YOUR_PROJECT_ID
```

### 1.2 Enable required APIs
```bash
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable compute.googleapis.com
```

## Step 2: Create Cloud SQL Instance

### 2.1 Create PostgreSQL instance
```bash
gcloud sql instances create mooves-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03:00 \
  --authorized-networks=0.0.0.0/0 \
  --root-password=YOUR_ROOT_PASSWORD
```

### 2.2 Create database
```bash
gcloud sql databases create mooves_db --instance=mooves-db
```

### 2.3 Create user
```bash
gcloud sql users create mooves_user \
  --instance=mooves-db \
  --password=YOUR_USER_PASSWORD
```

## Step 3: Get Connection Information

### 3.1 Get connection string
```bash
gcloud sql instances describe mooves-db --format="value(connectionName)"
```

### 3.2 Get public IP
```bash
gcloud sql instances describe mooves-db --format="value(ipAddresses[0].ipAddress)"
```

## Step 4: Update Environment Configuration

### 4.1 Update .env file
```bash
# Database Configuration
DATABASE_URL=postgresql://mooves_user:YOUR_USER_PASSWORD@PUBLIC_IP:5432/mooves_db

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_SQL_INSTANCE=mooves-db
```

## Step 5: Configure SSL Connection

### 5.1 Download SSL certificate (if needed)
```bash
gcloud sql ssl-certs create client-cert --instance=mooves-db
gcloud sql ssl-certs describe client-cert --instance=mooves-db --format="value(cert)" > client-cert.pem
gcloud sql ssl-certs describe client-cert --instance=mooves-db --format="value(privateKey)" > client-key.pem
```

## Step 6: Update Application Configuration

### 6.1 Update database configuration
The application is already configured for PostgreSQL with SSL. Update the connection string in your environment variables.

### 6.2 Test connection
```bash
npm run test-db
```

## Step 7: Migrate Data (if needed)

### 7.1 Export from current database
```bash
pg_dump -h CURRENT_HOST -U CURRENT_USER -d CURRENT_DB > backup.sql
```

### 7.2 Import to Cloud SQL
```bash
gcloud sql import sql mooves-db gs://YOUR_BUCKET/backup.sql --database=mooves_db
```

## Step 8: Update Deployment Configuration

### 8.1 Update Heroku configuration
```bash
heroku config:set DATABASE_URL="postgresql://mooves_user:YOUR_USER_PASSWORD@PUBLIC_IP:5432/mooves_db"
heroku config:set GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"
```

### 8.2 Update app.json for Heroku
The app.json is already configured for PostgreSQL.

## Step 9: Security Best Practices

### 9.1 Use Cloud SQL Proxy (Recommended for production)
```bash
# Install Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Connect using proxy
./cloud_sql_proxy -instances=YOUR_PROJECT_ID:us-central1:mooves-db=tcp:5432
```

### 9.2 Update connection for Cloud SQL Proxy
```bash
DATABASE_URL=postgresql://mooves_user:YOUR_USER_PASSWORD@localhost:5432/mooves_db
```

## Step 10: Monitoring and Maintenance

### 10.1 Set up monitoring
```bash
gcloud monitoring dashboards create --config-from-file=dashboard-config.json
```

### 10.2 Set up alerts
```bash
gcloud alpha monitoring policies create --policy-from-file=alert-policy.json
```

## Cost Optimization

### Free Tier
- Cloud SQL f1-micro: Free for 1 year
- Storage: 10GB included
- Network: 1GB/day free

### Paid Plans
- db-f1-micro: ~$7/month after free tier
- db-g1-small: ~$25/month
- db-n1-standard-1: ~$50/month

## Troubleshooting

### Common Issues
1. **Connection timeout**: Check firewall rules and authorized networks
2. **SSL errors**: Verify SSL configuration in connection string
3. **Authentication failed**: Check username/password and user permissions

### Useful Commands
```bash
# Check instance status
gcloud sql instances describe mooves-db

# View logs
gcloud sql logs tail --instance=mooves-db

# Restart instance
gcloud sql instances restart mooves-db
```

## Next Steps
1. Set up automated backups
2. Configure read replicas for scaling
3. Set up monitoring and alerting
4. Implement connection pooling
5. Set up disaster recovery

## Support
- [Google Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [PostgreSQL on Cloud SQL](https://cloud.google.com/sql/docs/postgres) 