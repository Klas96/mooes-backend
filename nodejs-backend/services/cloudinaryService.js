const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Cloudinary Storage Service for handling image uploads
 * Optimized for serverless environments like Vercel
 */
class CloudinaryService {
  constructor() {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (this.isConfigured) {
      console.log('✅ Cloudinary service configured');
      console.log(`  - Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    } else {
      console.warn('⚠️ Cloudinary not configured. Image uploads will fail.');
      console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }
  }

  /**
   * Upload image from file path
   * @param {string} filePath - Path to the image file
   * @param {string} folder - Cloudinary folder (optional)
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Object>} - Upload result with URL and metadata
   */
  async uploadImage(filePath, folder = 'mooves', options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      console.log(`📤 Uploading to Cloudinary: ${filePath}`);
      
      // Optimize image before upload
      const optimizedPath = await this.optimizeImage(filePath);
      
      // Upload options
      const uploadOptions = {
        folder: folder,
        resource_type: 'image',
        format: 'jpg',
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' },
          { quality: 'auto:good' }
        ],
        ...options
      };

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(optimizedPath, uploadOptions);

      // Clean up optimized file if it's different from original
      if (optimizedPath !== filePath && fs.existsSync(optimizedPath)) {
        fs.unlinkSync(optimizedPath);
      }

      console.log(`✅ Upload successful: ${result.secure_url}`);
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
        resourceType: result.resource_type,
        createdAt: result.created_at,
        thumbnailUrl: this.getThumbnailUrl(result.public_id, 300)
      };
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload image from buffer
   * @param {Buffer} buffer - Image buffer
   * @param {string} filename - Original filename
   * @param {string} folder - Cloudinary folder (optional)
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadImageFromBuffer(buffer, filename, folder = 'mooves', options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      console.log(`📤 Uploading buffer to Cloudinary: ${filename}`);
      
      // Optimize buffer
      const optimizedBuffer = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Upload options
      const uploadOptions = {
        folder: folder,
        resource_type: 'image',
        format: 'jpg',
        quality: 'auto',
        fetch_format: 'auto',
        ...options
      };

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(new Error(`Failed to upload image: ${error.message}`));
            } else {
              console.log(`✅ Upload successful: ${result.secure_url}`);
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
                format: result.format,
                thumbnailUrl: this.getThumbnailUrl(result.public_id, 300)
              });
            }
          }
        );

        uploadStream.end(optimizedBuffer);
      });
    } catch (error) {
      console.error('❌ Cloudinary buffer upload error:', error);
      throw new Error(`Failed to upload image buffer: ${error.message}`);
    }
  }

  /**
   * Optimize image using Sharp
   * @param {string} inputPath - Input file path
   * @returns {Promise<string>} - Path to optimized image
   */
  async optimizeImage(inputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      // If image is small enough, return original
      if (metadata.width <= 1920 && metadata.height <= 1080 && metadata.size < 1024 * 1024) {
        return inputPath;
      }

      // Create optimized version
      const ext = path.extname(inputPath);
      const optimizedPath = inputPath.replace(ext, '-optimized.jpg');

      await sharp(inputPath)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(optimizedPath);

      return optimizedPath;
    } catch (error) {
      console.error('⚠️ Image optimization failed, using original:', error);
      return inputPath;
    }
  }

  /**
   * Get thumbnail URL from Cloudinary public ID
   * @param {string} publicId - Cloudinary public ID
   * @param {number} size - Thumbnail size (default: 300)
   * @returns {string} - Thumbnail URL
   */
  getThumbnailUrl(publicId, size = 300) {
    return cloudinary.url(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto',
      format: 'jpg'
    });
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteImage(publicId) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log(`✅ Image deleted successfully`);
        return { success: true, result: result.result };
      } else {
        console.log(`⚠️ Image may not exist: ${result.result}`);
        return { success: false, result: result.result };
      }
    } catch (error) {
      console.error('❌ Cloudinary deletion error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Delete image from URL (extracts public ID)
   * @param {string} imageUrl - Cloudinary image URL
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteImageByUrl(imageUrl) {
    try {
      // Extract public ID from Cloudinary URL
      // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
      const urlParts = imageUrl.split('/upload/');
      if (urlParts.length < 2) {
        throw new Error('Invalid Cloudinary URL');
      }

      const pathParts = urlParts[1].split('/');
      const filename = pathParts[pathParts.length - 1];
      const publicId = pathParts.slice(0, -1).join('/') + '/' + filename.split('.')[0];
      
      return await this.deleteImage(publicId);
    } catch (error) {
      console.error('❌ Error extracting public ID from URL:', error);
      throw new Error(`Failed to delete image by URL: ${error.message}`);
    }
  }

  /**
   * Check if Cloudinary is configured
   * @returns {boolean}
   */
  static isConfigured() {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}

module.exports = CloudinaryService;


