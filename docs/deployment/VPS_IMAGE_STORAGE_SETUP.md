# VPS Image Storage Setup

This document explains how to configure your Mooves backend to store images locally on your Loopia VPS instead of using external cloud storage services.

## Overview

The VPS image storage system provides:

- **Local file storage** on your VPS
- **Automatic image optimization** (compression, resizing)
- **Thumbnail generation** for faster loading
- **Security features** (file type validation, access control)
- **Storage management tools** (cleanup, statistics)

## Quick Setup

### 1. Switch to VPS Storage

Run the configuration script to switch from cloud storage to local storage:

```bash
./scripts/switch-to-vps-storage.sh
```

This script will:
- Backup your current configuration
- Switch to VPS-optimized profile controller
- Add local storage service
- Create utility scripts
- Update environment template

### 2. Deploy to VPS

Deploy your backend with the new storage configuration:

```bash
VPS_HOST=your-vps-ip ./scripts/deploy-to-loopia-vps.sh
```

## Storage Architecture

### Directory Structure

```
/opt/mooves/uploads/
├── profiles/          # Main profile images (optimized)
├── thumbnails/        # Thumbnail versions (300x300)
└── temp/             # Temporary upload files (auto-cleaned)
```

### Image Processing Pipeline

1. **Upload**: User uploads image via API
2. **Validation**: File type, size, and format validation
3. **Optimization**: Compression and resizing using Sharp
4. **Thumbnail**: Generate 300x300 thumbnail
5. **Storage**: Save to organized directory structure
6. **Database**: Record URLs and metadata
7. **Cleanup**: Remove temporary files

## Configuration

### Environment Variables

Add these to your `.env.production` file:

```env
# Local Image Storage Configuration
UPLOADS_DIR=/opt/mooves/uploads
MAX_FILE_SIZE=5242880          # 5MB maximum file size
IMAGE_QUALITY=85               # JPEG quality (1-100)
IMAGE_MAX_WIDTH=1920           # Maximum image width
IMAGE_MAX_HEIGHT=1080          # Maximum image height

# Storage Service Priority
STORAGE_PRIORITY=local_storage  # local_storage, google_cloud_storage, both
```

### Nginx Configuration

The nginx configuration automatically serves static images:

```nginx
location /uploads/ {
    alias /opt/mooves/uploads/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    
    # Security - only allow image files
    location ~* \.(jpg|jpeg|png|gif|webp|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Deny access to other file types
    location ~* \.(php|pl|py|jsp|asp|sh|cgi|env|log|sql)$ {
        deny all;
    }
}
```

## Features

### Image Optimization

- **Format conversion**: All images converted to JPEG
- **Compression**: Configurable quality (default 85%)
- **Resizing**: Automatic resizing to max dimensions
- **Progressive JPEG**: Better loading experience

### Thumbnail Generation

- **Automatic creation**: 300x300 thumbnails for all images
- **Smart cropping**: Center-focused cropping
- **Optimized quality**: 80% quality for thumbnails
- **Fast loading**: Separate URLs for thumbnails

### Security Features

- **File type validation**: Only image files allowed
- **Size limits**: Configurable maximum file size
- **Path sanitization**: Secure file naming
- **Access control**: Nginx-level file type restrictions

### Storage Management

- **Automatic cleanup**: Temporary files cleaned up
- **Statistics**: Storage usage monitoring
- **Optimization**: Batch optimization of existing images
- **Backup**: Easy backup and restore

## Management Commands

### Storage Statistics

```bash
# Check storage usage and file counts
ssh root@your-vps-ip 'cd /opt/mooves && npm run vps:storage-stats'
```

Output example:
```
📊 Storage Statistics:
  Total files: 1,234
  Total size: 245.67 MB

📁 By folder:
  profiles:
    Files: 1,200
    Size: 230.45 MB
  thumbnails:
    Files: 1,200
    Size: 15.22 MB
  temp:
    Files: 0
    Size: 0.00 MB
```

### Cleanup Temporary Files

```bash
# Remove temporary files older than 24 hours
ssh root@your-vps-ip 'cd /opt/mooves && npm run vps:cleanup-temp'
```

### Optimize Existing Images

```bash
# Optimize all existing images for better compression
ssh root@your-vps-ip 'cd /opt/mooves && npm run vps:optimize-images'
```

## Performance Considerations

### For 2GB RAM VPS

- **Memory usage**: Sharp image processing uses ~100-200MB per image
- **Disk space**: Plan for 2-3x original image size (originals + optimized + thumbnails)
- **Processing time**: 1-3 seconds per image depending on size
- **Concurrent uploads**: Limit to 2-3 simultaneous uploads

### Optimization Tips

1. **Adjust quality settings** based on your needs:
   ```env
   IMAGE_QUALITY=75  # Lower quality = smaller files
   ```

2. **Reduce max dimensions** for smaller files:
   ```env
   IMAGE_MAX_WIDTH=1280
   IMAGE_MAX_HEIGHT=720
   ```

3. **Monitor disk usage** regularly:
   ```bash
   df -h /opt
   du -sh /opt/mooves/uploads
   ```

## Backup and Recovery

### Backup Images

```bash
# Create backup of all images
ssh root@your-vps-ip 'tar -czf /opt/backups/images-$(date +%Y%m%d).tar.gz -C /opt/mooves uploads/'
```

### Restore Images

```bash
# Restore from backup
ssh root@your-vps-ip 'tar -xzf /opt/backups/images-20250101.tar.gz -C /opt/mooves/'
```

### Database Backup

```bash
# Backup image metadata
ssh root@your-vps-ip 'pg_dump -U mooves_user -h localhost mooves_prod -t "Images" > /opt/backups/images-db-$(date +%Y%m%d).sql'
```

## Troubleshooting

### Common Issues

1. **Out of disk space**:
   ```bash
   # Check disk usage
   df -h
   
   # Clean up old images
   npm run vps:cleanup-temp
   ```

2. **Permission errors**:
   ```bash
   # Fix permissions
   chown -R mooves:mooves /opt/mooves/uploads
   chmod -R 755 /opt/mooves/uploads
   ```

3. **Image upload failures**:
   ```bash
   # Check logs
   journalctl -u mooves-backend -f
   
   # Test storage service
   curl -X GET https://your-domain.com/api/profiles/test-storage
   ```

4. **Slow image loading**:
   ```bash
   # Check nginx configuration
   nginx -t
   
   # Restart nginx
   systemctl restart nginx
   ```

### Performance Monitoring

```bash
# Monitor image processing
ssh root@your-vps-ip 'top -p $(pgrep -f "node.*server.js")'

# Check disk I/O
ssh root@your-vps-ip 'iostat -x 1'

# Monitor memory usage
ssh root@your-vps-ip 'free -h'
```

## Migration from Cloud Storage

If you're migrating from Google Cloud Storage:

1. **Run the switch script**:
   ```bash
   ./scripts/switch-to-vps-storage.sh
   ```

2. **Deploy to VPS** with new configuration

3. **Migrate existing images** (optional):
   ```bash
   # Download images from GCS and re-upload to local storage
   # This requires a custom migration script
   ```

4. **Update database URLs** to point to local storage

## Security Best Practices

1. **File validation**: Only allow image file types
2. **Size limits**: Enforce maximum file sizes
3. **Path sanitization**: Use secure file naming
4. **Access control**: Nginx-level restrictions
5. **Regular cleanup**: Remove temporary files
6. **Backup strategy**: Regular backups of images and metadata

## Cost Benefits

Using local storage on your VPS instead of cloud storage:

- **No storage fees**: No per-GB charges
- **No bandwidth costs**: No egress fees
- **Predictable costs**: Only VPS hosting costs
- **Better performance**: No external API calls
- **Full control**: Complete control over your data

## Support

For issues with VPS image storage:

1. Check the logs: `journalctl -u mooves-backend -f`
2. Verify configuration: `npm run vps:storage-stats`
3. Test storage service: API endpoint `/api/profiles/test-storage`
4. Check disk space: `df -h /opt`
5. Review this documentation

The local storage system is designed to be robust and self-managing, but monitoring and maintenance are important for optimal performance.

