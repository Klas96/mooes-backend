# Loopia VPS Deployment Guide

This guide will help you deploy your Mooves backend to a Loopia VPS with the following specifications:
- **Isolated environment** with dedicated resources
- **2 GB RAM** and **50 GB HDD**
- **Full freedom** with SSH access and screen console
- **Dedicated IP addresses** (IPv4 and IPv6)
- **SLA** support

## Prerequisites

Before starting the deployment, ensure you have:

1. **Loopia VPS** with root access
2. **Domain name** pointing to your VPS IP
3. **SSH key** configured for passwordless access
4. **Local development environment** with the Mooves project

## Deployment Method

This guide uses **Direct Node.js Deployment** optimized for your 2GB RAM VPS:

- Direct Node.js installation
- PM2 process management
- Nginx reverse proxy
- PostgreSQL database
- Optimal resource utilization for 2GB RAM VPS

## Quick Start

### 1. Prepare Your Environment

Set up your environment variables:

```bash
export VPS_HOST="your-vps-ip-address"
export VPS_USER="root"  # or your preferred user
export VPS_PORT="22"    # or your custom SSH port
```

### 2. Switch to VPS Storage (Recommended)

Before deploying, switch to VPS-optimized storage:

```bash
./scripts/switch-to-vps-storage.sh
```

This will configure your backend to use local storage on the VPS instead of Google Cloud Storage.

### 3. Deploy the Application

```bash
./scripts/deploy-to-loopia-vps.sh
```

## Detailed Setup Instructions

### Step 1: Initial VPS Setup

1. **Access your VPS** via SSH:
   ```bash
   ssh root@your-vps-ip
   ```

2. **Update the system**:
   ```bash
   apt update && apt upgrade -y
   ```

3. **Configure firewall** (if needed):
   ```bash
   ufw allow ssh
   ufw allow 80
   ufw allow 443
   ufw enable
   ```

### Step 2: Domain Configuration

1. **Point your domain** to your VPS IP address
2. **Verify DNS propagation**:
   ```bash
   nslookup your-domain.com
   ```

### Step 3: Deploy the Application

1. **Run the deployment script**:
   ```bash
   VPS_HOST=your-vps-ip ./scripts/deploy-to-loopia-vps.sh
   ```

2. **Configure environment variables**:
   ```bash
   ssh root@your-vps-ip
   nano /opt/mooves/.env.production
   ```

3. **Update the configuration** with your actual values:
   ```env
   NODE_ENV=production
   PORT=8080
   
   # Database
   DATABASE_URL=postgresql://mooves_user:your-password@localhost:5432/mooves_prod
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   
   # Email
   EMAIL_USER=your-email@example.com
   EMAIL_PASSWORD=your-email-password
   FRONTEND_URL=https://your-domain.com
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
   
   # OpenAI
   OPENAI_API_KEY=your-openai-api-key
   
   # CORS
   ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```

4. **Run database migrations**:
   ```bash
   ssh root@your-vps-ip 'cd /opt/mooves && npm run migrate'
   ```

5. **Restart the service**:
   ```bash
   ssh root@your-vps-ip 'systemctl restart mooves-backend'
   ```

### Step 4: SSL Certificate Setup

1. **Run the SSL setup**:
   ```bash
   ./scripts/deploy-to-loopia-vps.sh --ssl
   ```

2. **Enter your domain name** when prompted

3. **Verify SSL certificate**:
   ```bash
   curl -I https://your-domain.com/api/health
   ```

## Post-Deployment Configuration

### 1. Database Setup

```bash
ssh root@your-vps-ip
sudo -u postgres psql
```

```sql
CREATE DATABASE mooves_prod;
CREATE USER mooves_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE mooves_prod TO mooves_user;
ALTER USER mooves_user CREATEDB;
\q
```

### 2. Run Database Migrations

```bash
ssh root@your-vps-ip 'cd /opt/mooves && npm run migrate'
```

### 3. Test the API

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-XX...",
  "uptime": 123.456,
  "database": "PostgreSQL",
  "environment": "production",
  "version": "1.0.0"
}
```

## Image Storage Management

### 1. Local Storage Configuration

Your VPS is configured to store images locally with the following structure:

```
/opt/mooves/uploads/
├── profiles/          # Main profile images
├── thumbnails/        # Optimized thumbnails
└── temp/             # Temporary upload files
```

### 2. Image Storage Features

- **Automatic optimization**: Images are compressed and resized
- **Thumbnail generation**: Automatic thumbnail creation for faster loading
- **Format conversion**: All images converted to JPEG for consistency
- **Security**: Only image files are allowed, other file types blocked
- **Cleanup**: Automatic cleanup of temporary files

### 3. Storage Management Commands

```bash
# Check storage statistics
ssh root@your-vps-ip 'cd /opt/mooves && npm run vps:storage-stats'

# Cleanup temporary files
ssh root@your-vps-ip 'cd /opt/mooves && npm run vps:cleanup-temp'

# Optimize existing images
ssh root@your-vps-ip 'cd /opt/mooves && npm run vps:optimize-images'
```

### 4. Storage Configuration

Key environment variables for image storage:

```env
# Local Image Storage Configuration
UPLOADS_DIR=/opt/mooves/uploads
MAX_FILE_SIZE=5242880          # 5MB
IMAGE_QUALITY=85               # JPEG quality (1-100)
IMAGE_MAX_WIDTH=1920           # Maximum width
IMAGE_MAX_HEIGHT=1080          # Maximum height
```

### 5. Monitoring Storage Usage

```bash
# Check disk usage
ssh root@your-vps-ip 'df -h /opt'

# Check uploads directory size
ssh root@your-vps-ip 'du -sh /opt/mooves/uploads'

# List largest files
ssh root@your-vps-ip 'find /opt/mooves/uploads -type f -exec ls -lh {} \; | sort -k5 -hr | head -10'
```

## Monitoring and Maintenance

### 1. View Logs

```bash
ssh root@your-vps-ip 'journalctl -u mooves-backend -f'
```

### 2. Check Service Status

```bash
ssh root@your-vps-ip 'systemctl status mooves-backend'
```

### 3. Restart Services

```bash
ssh root@your-vps-ip 'systemctl restart mooves-backend'
```

### 4. Backup Database

```bash
ssh root@your-vps-ip 'pg_dump -U mooves_user -h localhost mooves_prod > /opt/backups/db-backup-$(date +%Y%m%d-%H%M%S).sql'
```

## Performance Optimization for 2GB RAM VPS

### 1. System Optimization

```bash
ssh root@your-vps-ip
```

```bash
# Optimize memory usage
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
sysctl -p

# Optimize PostgreSQL for low memory
nano /etc/postgresql/*/main/postgresql.conf
```

Add these PostgreSQL settings:
```conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### 2. Node.js Optimization

For direct deployment, create a PM2 ecosystem file:

```bash
ssh root@your-vps-ip
nano /opt/mooves/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'mooves-backend',
    script: 'server.js',
    cwd: '/opt/mooves',
    instances: 1, // Single instance for 2GB RAM
    exec_mode: 'fork',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/opt/mooves/logs/err.log',
    out_file: '/opt/mooves/logs/out.log',
    log_file: '/opt/mooves/logs/combined.log',
    time: true
  }]
};
```

### 3. Nginx Optimization

```bash
ssh root@your-vps-ip
nano /etc/nginx/nginx.conf
```

Add these optimizations:
```nginx
worker_processes 1;  # Single worker for 2GB RAM
worker_connections 512;  # Reduced connections

http {
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    
    # Buffer settings
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;
}
```

## Security Considerations

### 1. Firewall Configuration

```bash
ssh root@your-vps-ip
ufw status
ufw allow ssh
ufw allow 80
ufw allow 443
ufw deny 8080  # Block direct access to Node.js
```

### 2. SSH Security

```bash
# Disable root login (after creating a user)
nano /etc/ssh/sshd_config
```

```conf
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

### 3. Regular Updates

```bash
# Set up automatic security updates
apt install unattended-upgrades
dpkg-reconfigure unattended-upgrades
```

## Troubleshooting

### Common Issues

1. **Out of Memory Errors**:
   - Reduce Node.js memory usage
   - Optimize PostgreSQL settings
   - Consider Docker deployment for better resource isolation

2. **Database Connection Issues**:
   - Check PostgreSQL service status
   - Verify connection string in .env.production
   - Check firewall rules

3. **SSL Certificate Issues**:
   - Verify domain DNS settings
   - Check nginx configuration
   - Renew certificate manually if needed

4. **Service Won't Start**:
   - Check logs for errors
   - Verify environment variables
   - Check file permissions

### Useful Commands

```bash
# Check system resources
htop
df -h
free -h

# Check service logs
journalctl -u mooves-backend -f
docker-compose -f docker-compose.prod.yml logs -f

# Test database connection
psql -U mooves_user -h localhost -d mooves_prod

# Check nginx status
systemctl status nginx
nginx -t

# Monitor network connections
netstat -tulpn | grep :8080
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Check disk space usage
   - Review application logs
   - Monitor system performance

2. **Monthly**:
   - Update system packages
   - Backup database
   - Review security logs

3. **Quarterly**:
   - Update Node.js and dependencies
   - Review and update SSL certificates
   - Performance optimization review

### Getting Help

- Check the application logs first
- Review this deployment guide
- Check Loopia VPS documentation
- Contact support if needed

## Cost Optimization

Your deployment is already optimized for 2GB RAM:

1. **Direct Node.js deployment** for minimal overhead
2. **Optimized PostgreSQL** memory settings
3. **Gzip compression** enabled in nginx
4. **PM2** process management configured
5. **Resource monitoring** tools included

This setup should provide a robust, scalable backend for your Mooves application on a Loopia VPS.
