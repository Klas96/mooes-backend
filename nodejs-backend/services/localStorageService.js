const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Local Storage Service for handling image uploads and management
 * This service provides local file storage functionality for the VPS deployment
 */
class LocalStorageService {
  constructor() {
    this.uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
    this.allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.quality = parseInt(process.env.IMAGE_QUALITY) || 85;
    this.maxWidth = parseInt(process.env.IMAGE_MAX_WIDTH) || 1920;
    this.maxHeight = parseInt(process.env.IMAGE_MAX_HEIGHT) || 1080;
    
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
    
    console.log('🔧 Local Storage Service initialized');
    console.log(`  - Uploads directory: ${this.uploadsDir}`);
    console.log(`  - Max file size: ${this.maxFileSize / 1024 / 1024}MB`);
    console.log(`  - Image quality: ${this.quality}%`);
    console.log(`  - Max dimensions: ${this.maxWidth}x${this.maxHeight}`);
  }

  /**
   * Ensure uploads directory exists
   */
  ensureUploadsDirectory() {
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
        console.log(`📁 Created uploads directory: ${this.uploadsDir}`);
      }
      
      // Create subdirectories for organization
      const subdirs = ['profiles', 'temp', 'thumbnails'];
      subdirs.forEach(subdir => {
        const subdirPath = path.join(this.uploadsDir, subdir);
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true });
          console.log(`📁 Created subdirectory: ${subdirPath}`);
        }
      });
    } catch (error) {
      console.error('❌ Error creating uploads directory:', error);
      throw new Error(`Failed to create uploads directory: ${error.message}`);
    }
  }

  /**
   * Generate unique filename
   * @param {string} originalName - Original filename
   * @returns {string} - Unique filename
   */
  generateFileName(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName).toLowerCase();
    return `img-${timestamp}-${random}${ext}`;
  }

  /**
   * Get content type based on file extension
   * @param {string} filePath - File path
   * @returns {string} - MIME type
   */
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate file
   * @param {Object} file - File object
   * @returns {Object} - Validation result
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExtensions.includes(ext)) {
      errors.push(`File extension ${ext} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Optimize image using Sharp
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} - Optimization result
   */
  async optimizeImage(inputPath, outputPath) {
    try {
      console.log(`🔧 Optimizing image: ${inputPath}`);
      
      const metadata = await sharp(inputPath).metadata();
      console.log(`  - Original dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`  - Original size: ${metadata.size} bytes`);
      console.log(`  - Format: ${metadata.format}`);

      let sharpInstance = sharp(inputPath);

      // Resize if necessary
      if (metadata.width > this.maxWidth || metadata.height > this.maxHeight) {
        sharpInstance = sharpInstance.resize(this.maxWidth, this.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
        console.log(`  - Resizing to max ${this.maxWidth}x${this.maxHeight}`);
      }

      // Convert to JPEG for consistency and better compression
      sharpInstance = sharpInstance.jpeg({
        quality: this.quality,
        progressive: true,
        mozjpeg: true
      });

      // Apply optimization
      await sharpInstance.toFile(outputPath);

      // Get optimized file stats
      const optimizedStats = fs.statSync(outputPath);
      console.log(`  - Optimized size: ${optimizedStats.size} bytes`);
      console.log(`  - Compression ratio: ${((1 - optimizedStats.size / metadata.size) * 100).toFixed(1)}%`);

      return {
        originalSize: metadata.size,
        optimizedSize: optimizedStats.size,
        compressionRatio: (1 - optimizedStats.size / metadata.size) * 100,
        dimensions: {
          original: { width: metadata.width, height: metadata.height },
          optimized: await sharp(outputPath).metadata().then(m => ({ width: m.width, height: m.height }))
        }
      };
    } catch (error) {
      console.error('❌ Image optimization error:', error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  /**
   * Create thumbnail
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output thumbnail path
   * @param {number} size - Thumbnail size (default: 300)
   * @returns {Promise<Object>} - Thumbnail creation result
   */
  async createThumbnail(inputPath, outputPath, size = 300) {
    try {
      console.log(`🖼️ Creating thumbnail: ${outputPath}`);
      
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 80,
          progressive: true
        })
        .toFile(outputPath);

      const thumbnailStats = fs.statSync(outputPath);
      console.log(`  - Thumbnail size: ${thumbnailStats.size} bytes`);

      return {
        path: outputPath,
        size: thumbnailStats.size
      };
    } catch (error) {
      console.error('❌ Thumbnail creation error:', error);
      throw new Error(`Failed to create thumbnail: ${error.message}`);
    }
  }

  /**
   * Upload image to local storage
   * @param {string} filePath - Path to the uploaded file
   * @param {string} folder - Storage folder (optional)
   * @returns {Promise<Object>} - Upload result
   */
  async uploadImage(filePath, folder = 'profiles') {
    try {
      console.log(`📤 Starting local image upload:`);
      console.log(`  - File path: ${filePath}`);
      console.log(`  - Folder: ${folder}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      // Get file stats
      const stats = fs.statSync(filePath);
      console.log(`  - File size: ${stats.size} bytes`);
      
      // Generate unique filename
      const fileName = this.generateFileName(path.basename(filePath));
      const destination = path.join(this.uploadsDir, folder, fileName);
      const thumbnailPath = path.join(this.uploadsDir, 'thumbnails', fileName);
      
      console.log(`  - Destination: ${destination}`);
      
      // Optimize image
      console.log(`🔧 Optimizing image...`);
      const optimizationResult = await this.optimizeImage(filePath, destination);
      
      // Create thumbnail
      console.log(`🖼️ Creating thumbnail...`);
      const thumbnailResult = await this.createThumbnail(destination, thumbnailPath);
      
      // Generate public URL
      const publicUrl = `/uploads/${folder}/${fileName}`;
      const thumbnailUrl = `/uploads/thumbnails/${fileName}`;
      
      console.log(`✅ Image uploaded successfully:`);
      console.log(`  - URL: ${publicUrl}`);
      console.log(`  - Thumbnail URL: ${thumbnailUrl}`);
      console.log(`  - Destination: ${destination}`);
      console.log(`  - Compression: ${optimizationResult.compressionRatio.toFixed(1)}%`);
      
      // Clean up original file if it's in temp directory
      if (filePath.includes('temp') && filePath !== destination) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
      }
      
      return {
        url: publicUrl,
        thumbnailUrl: thumbnailUrl,
        fileName: fileName,
        destination: destination,
        thumbnailPath: thumbnailPath,
        size: optimizationResult.optimizedSize,
        originalSize: optimizationResult.originalSize,
        compressionRatio: optimizationResult.compressionRatio,
        dimensions: optimizationResult.dimensions
      };
    } catch (error) {
      console.error('❌ Local storage upload error:', error);
      console.error('  - Error details:', error.message);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload image from buffer
   * @param {Buffer} buffer - Image buffer
   * @param {string} filename - Original filename
   * @param {string} folder - Storage folder (optional)
   * @returns {Promise<Object>} - Upload result
   */
  async uploadImageFromBuffer(buffer, filename, folder = 'profiles') {
    try {
      console.log(`📤 Starting buffer upload to local storage:`);
      console.log(`  - Filename: ${filename}`);
      console.log(`  - Buffer size: ${buffer.length} bytes`);
      console.log(`  - Folder: ${folder}`);
      
      // Generate unique filename
      const fileName = this.generateFileName(filename);
      const tempPath = path.join(this.uploadsDir, 'temp', fileName);
      const destination = path.join(this.uploadsDir, folder, fileName);
      const thumbnailPath = path.join(this.uploadsDir, 'thumbnails', fileName);
      
      // Save buffer to temporary file
      fs.writeFileSync(tempPath, buffer);
      console.log(`  - Saved to temp: ${tempPath}`);
      
      // Optimize image
      console.log(`🔧 Optimizing image...`);
      const optimizationResult = await this.optimizeImage(tempPath, destination);
      
      // Create thumbnail
      console.log(`🖼️ Creating thumbnail...`);
      const thumbnailResult = await this.createThumbnail(destination, thumbnailPath);
      
      // Generate public URLs
      const publicUrl = `/uploads/${folder}/${fileName}`;
      const thumbnailUrl = `/uploads/thumbnails/${fileName}`;
      
      console.log(`✅ Buffer uploaded successfully:`);
      console.log(`  - URL: ${publicUrl}`);
      console.log(`  - Thumbnail URL: ${thumbnailUrl}`);
      console.log(`  - Destination: ${destination}`);
      
      // Clean up temporary file
      fs.unlinkSync(tempPath);
      console.log(`🗑️ Cleaned up temporary file: ${tempPath}`);
      
      return {
        url: publicUrl,
        thumbnailUrl: thumbnailUrl,
        fileName: fileName,
        destination: destination,
        thumbnailPath: thumbnailPath,
        size: optimizationResult.optimizedSize,
        originalSize: optimizationResult.originalSize,
        compressionRatio: optimizationResult.compressionRatio,
        dimensions: optimizationResult.dimensions
      };
    } catch (error) {
      console.error('❌ Local storage buffer upload error:', error);
      console.error('  - Error details:', error.message);
      throw new Error(`Failed to upload image buffer: ${error.message}`);
    }
  }

  /**
   * Delete image from local storage
   * @param {string} imageUrl - Image URL
   * @returns {Promise<boolean>} - Deletion result
   */
  async deleteImage(imageUrl) {
    try {
      console.log(`🗑️ Deleting image: ${imageUrl}`);
      
      // Extract file path from URL
      const urlPath = imageUrl.replace('/uploads/', '');
      const filePath = path.join(this.uploadsDir, urlPath);
      const thumbnailPath = path.join(this.uploadsDir, 'thumbnails', path.basename(urlPath));
      
      let deleted = false;
      
      // Delete main image
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`  - Deleted: ${filePath}`);
        deleted = true;
      }
      
      // Delete thumbnail
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log(`  - Deleted thumbnail: ${thumbnailPath}`);
      }
      
      if (deleted) {
        console.log(`✅ Image deleted successfully`);
        return true;
      } else {
        console.log(`⚠️ Image file not found: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Image deletion error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} - Storage statistics
   */
  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        folders: {}
      };

      const folders = ['profiles', 'thumbnails', 'temp'];
      
      for (const folder of folders) {
        const folderPath = path.join(this.uploadsDir, folder);
        if (fs.existsSync(folderPath)) {
          const files = fs.readdirSync(folderPath);
          let folderSize = 0;
          
          for (const file of files) {
            const filePath = path.join(folderPath, file);
            const fileStats = fs.statSync(filePath);
            folderSize += fileStats.size;
          }
          
          stats.folders[folder] = {
            files: files.length,
            size: folderSize
          };
          
          stats.totalFiles += files.length;
          stats.totalSize += folderSize;
        }
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      throw new Error(`Failed to get storage statistics: ${error.message}`);
    }
  }

  /**
   * Clean up old temporary files
   * @param {number} maxAge - Maximum age in hours (default: 24)
   * @returns {Promise<number>} - Number of files cleaned up
   */
  async cleanupTempFiles(maxAge = 24) {
    try {
      const tempDir = path.join(this.uploadsDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        return 0;
      }

      const files = fs.readdirSync(tempDir);
      const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up old temp file: ${file}`);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`✅ Cleaned up ${cleanedCount} old temporary files`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up temp files:', error);
      throw new Error(`Failed to cleanup temporary files: ${error.message}`);
    }
  }

  /**
   * Check if local storage is properly configured
   * @returns {boolean} - Configuration status
   */
  static isConfigured() {
    try {
      const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
      return fs.existsSync(uploadsDir) || fs.existsSync(path.dirname(uploadsDir));
    } catch (error) {
      return false;
    }
  }
}

module.exports = LocalStorageService;

