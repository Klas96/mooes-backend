# SSL Certificate Setup

## Architecture Overview

Your backend uses **nginx as a reverse proxy**, which means:
- ✅ **nginx handles HTTPS** (port 443) and HTTP (port 80)
- ✅ **Node.js backend runs on HTTP** (port 8080) - no certificate needed
- ✅ **nginx forwards requests** from HTTPS to the Node.js backend

## Certificate File Location

The SSL certificate (`certificate.crt`) has been downloaded to:
```
/home/klas/Kod/mooves/mooves-backend/certificate.crt
```

## Important: You Need the Private Key

Since you only have `certificate.crt`, you have a few options:

### Option 1: Use Certbot (Recommended - Automatic)

Certbot will automatically obtain both the certificate and private key:

```bash
# On your production server (158.174.210.28)
ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28

# Install certbot if not already installed
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate automatically (this handles both cert and key)
sudo certbot --nginx -d backend.klasholmgren.se
```

This will:
- ✅ Automatically get the certificate AND private key
- ✅ Configure nginx automatically
- ✅ Set up auto-renewal

### Option 2: Manual nginx Configuration (If you have the private key)

If you have or can get the private key file:

1. **Upload both files to the server:**
   ```bash
   scp -i ~/.ssh/bahnhofKey3 certificate.crt ubuntu@158.174.210.28:/tmp/
   scp -i ~/.ssh/bahnhofKey3 private.key ubuntu@158.174.210.28:/tmp/
   ```

2. **On the server, move them to the SSL directory:**
   ```bash
   ssh -i ~/.ssh/bahnhofKey3 ubuntu@158.174.210.28
   sudo mkdir -p /etc/nginx/ssl
   sudo mv /tmp/certificate.crt /etc/nginx/ssl/
   sudo mv /tmp/private.key /etc/nginx/ssl/
   sudo chmod 600 /etc/nginx/ssl/private.key
   sudo chmod 644 /etc/nginx/ssl/certificate.crt
   ```

3. **Update nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/mooves-backend
   ```

   Add SSL configuration:
   ```nginx
   server {
       listen 80;
       server_name backend.klasholmgren.se;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name backend.klasholmgren.se;

       ssl_certificate /etc/nginx/ssl/certificate.crt;
       ssl_certificate_key /etc/nginx/ssl/private.key;

       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Test and reload nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option 3: Find Your Private Key

If you generated a Certificate Signing Request (CSR) to get this certificate, the private key was created at that time. Check:

- Where you generated the CSR
- Your certificate provider's dashboard (they might have the key)
- Your local machine where you might have saved it

## Node.js Server (No Changes Needed)

The Node.js server code has been updated to support HTTPS **if you want to run it directly**, but since you're using nginx, the Node.js server should continue running on HTTP (port 8080) as it currently does.

The server will automatically:
- ✅ **If both certificate and key are found**: Can start HTTPS server (optional)
- ✅ **If no certificate found**: Start HTTP server normally (current setup)

## Testing HTTPS

After configuring nginx with SSL:

```bash
# Test HTTPS endpoint
curl https://backend.klasholmgren.se/api/health

# Should return JSON response
```

## Troubleshooting

**Issue**: "SSL: no private key found" in nginx
- **Solution**: You need the private key file. Use certbot (Option 1) or find your original private key.

**Issue**: Certificate expired or invalid
- **Solution**: Use certbot to get a new certificate, or renew your existing one.

**Issue**: Mixed content errors (HTTPS page accessing HTTP API)
- **Solution**: Once nginx is configured with HTTPS, update your frontend to use `https://backend.klasholmgren.se` instead of `http://backend.klasholmgren.se`

## Recommended Approach

**Use Certbot (Option 1)** - it's the easiest and handles everything automatically, including auto-renewal.

