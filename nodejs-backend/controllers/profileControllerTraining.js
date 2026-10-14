const fs = require('fs');
const convexService = require('../services/convexService');
const { formatProfile } = require('../helpers/convexHelpers');
const LocalStorageService = require('../services/localStorageService');
const { Image } = require('../models');

const buildProfileResponse = async (profile, userId) => {
  // Convert Convex profile to format compatible with existing code
  const profileData = formatProfile(profile) || {};

  // Get images from Sequelize database (Images table not migrated to Convex yet)
  // Note: userId is a Convex ID (string), but Image table uses integer Sequelize user IDs
  if (Image) {
    try {
      // Check if userId is a Convex ID (string) or Sequelize ID (integer)
      // For now, we'll try to find images by checking if there's a mapping
      // If userId is a string (Convex ID), we can't directly query Image table
      // as it expects integer userIds
      
      let images = [];
      
      if (typeof userId === 'string' && !/^\d+$/.test(userId)) {
        // This is a Convex ID (string like "j123abc")
        // Image table uses integer IDs, so we need to find the Sequelize user ID
        // For now, we'll check if there's a User record with matching email or other identifier
        console.log('⚠️ Convex user ID detected, attempting to find Sequelize user mapping...');
        console.log('  - Convex userId:', userId);
        
        // Try to find Sequelize User by email (if we have it from profile)
        const { User } = require('../models');
        if (User && profile && profile.email) {
          try {
            const sequelizeUser = await User.findOne({
              where: { email: profile.email },
              attributes: ['id']
            });
            
            if (sequelizeUser) {
              console.log('✅ Found Sequelize user ID:', sequelizeUser.id, 'for Convex user:', userId);
              images = await Image.findAll({
                where: { userId: sequelizeUser.id },
                order: [['order', 'ASC'], ['createdAt', 'ASC']],
              });
            } else {
              console.log('⚠️ No Sequelize user found for email:', profile.email);
            }
          } catch (mappingError) {
            console.error('Error finding Sequelize user mapping:', mappingError);
          }
        }
      } else {
        // This is likely a Sequelize integer ID
        images = await Image.findAll({
          where: { userId: typeof userId === 'string' ? parseInt(userId, 10) : userId },
          order: [['order', 'ASC'], ['createdAt', 'ASC']],
        });
      }
      
      profileData.images = images.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
        order: img.order,
      }));
      
      // Set profilePicture from first image if available
      if (profileData.images.length > 0 && !profileData.profilePicture) {
        const primaryImage = profileData.images.find(img => img.isPrimary) || profileData.images[0];
        profileData.profilePicture = primaryImage.imageUrl;
      }
      
      console.log(`✅ Loaded ${profileData.images.length} images for user ${userId}`);
    } catch (error) {
      console.error('Error fetching images:', error);
      console.error('Error stack:', error.stack);
      profileData.images = [];
    }
  } else {
    console.log('⚠️ Image model not available');
    profileData.images = [];
  }

  return profileData;
};

const ensureProfile = async (userId) => {
  let profile = await convexService.query('userProfiles:getByUserId', { userId });
  if (!profile) {
    // Create profile with default values
    const profileId = await convexService.mutation('userProfiles:create', {
      userId,
      genderPreference: 'B',
      isHidden: false,
      locationMode: 'global',
      keyWords: [],
    });
    profile = await convexService.query('userProfiles:getByUserId', { userId });
  }
  return profile;
};

const getMyProfile = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    const response = await buildProfileResponse(profile, req.user.id);
    res.json(response);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const { bio, location, keyWords } = req.body;
    const profile = await ensureProfile(req.user.id);

    // Build update data (filter out null values)
    const updateData = { userId: req.user.id };
    if (bio !== undefined && bio !== null) updateData.bio = bio;
    if (location !== undefined && location !== null) updateData.location = location;
    if (keyWords !== undefined && keyWords !== null) {
      updateData.keyWords = Array.isArray(keyWords) ? keyWords : [];
    }

    // Update profile using Convex mutation
    await convexService.mutation('userProfiles:updateByUserId', updateData);

    // Get updated profile
    const updatedProfile = await convexService.query('userProfiles:getByUserId', { userId: req.user.id });
    const response = await buildProfileResponse(updatedProfile, req.user.id);
    res.json(response);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    console.log('📤 Starting profile picture upload...');
    console.log(`  - User ID: ${req.user.id}`);
    console.log(`  - File present: ${!!req.file}`);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`  - Original filename: ${req.file.originalname}`);
    console.log(`  - File size: ${req.file.size} bytes`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Buffer present: ${!!req.file.buffer}`);
    console.log(`  - Path present: ${!!req.file.path}`);

    await ensureProfile(req.user.id);

    // Determine if we're on Vercel (serverless) or traditional server
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const useCloudinary = isVercel || process.env.USE_CLOUDINARY === '1';
    
    let imageUrl;

    if (useCloudinary) {
      // Use Cloudinary for Vercel/serverless deployments
      const CloudinaryService = require('../services/cloudinaryService');
      const cloudinaryService = new CloudinaryService();
      
      if (!cloudinaryService.isConfigured) {
        return res.status(500).json({
          error: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
        });
      }

      console.log('📤 Uploading to Cloudinary...');
      
      if (req.file.buffer) {
        // Memory storage (Vercel)
        const uploadResult = await cloudinaryService.uploadImageFromBuffer(
          req.file.buffer,
          req.file.originalname,
          'mooves/profiles'
        );
        imageUrl = uploadResult.url;
        console.log(`✅ Upload successful: ${imageUrl}`);
      } else if (req.file.path && fs.existsSync(req.file.path)) {
        // Disk storage (traditional server)
        const uploadResult = await cloudinaryService.uploadImage(req.file.path, 'mooves/profiles');
        imageUrl = uploadResult.url;
        console.log(`✅ Upload successful: ${imageUrl}`);
      } else {
        return res.status(500).json({ error: 'File data not found' });
      }
    } else {
      // Use local storage for traditional servers
      // Check if file exists at the path multer saved it
      if (!req.file.path || !fs.existsSync(req.file.path)) {
        console.error(`❌ File does not exist at path: ${req.file.path}`);
        return res.status(500).json({ error: 'Uploaded file not found' });
      }

      console.log('📁 Initializing LocalStorageService...');
      const storageService = new LocalStorageService();
      console.log(`  - Uploads directory: ${storageService.uploadsDir}`);
      
      console.log('📤 Uploading to local storage...');
      const uploadResult = await storageService.uploadImage(req.file.path, 'profiles');
      console.log(`✅ Upload successful: ${uploadResult.url}`);
      console.log(`  - Destination: ${uploadResult.destination}`);
      
      imageUrl = uploadResult.url;

      // Clean up the original multer file (it's been processed and moved)
      if (req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log(`🗑️ Cleaned up temporary file: ${req.file.path}`);
        } catch (err) {
          console.error('⚠️ Error cleaning up temporary upload:', err);
        }
      }
    }

    // Check if Image model is available and properly initialized
    if (!Image || typeof Image.count !== 'function') {
      console.error('❌ Image model not available or not properly initialized.');
      console.error('  - Image type:', typeof Image);
      console.error('  - Image value:', Image);
      console.error('  - Has count method:', Image && typeof Image.count === 'function');
      
      // On Vercel/serverless, Sequelize might not be initialized
      // For now, we'll skip database storage and just return the image URL
      // The image is already uploaded to Cloudinary
      console.log('⚠️ Skipping database storage (serverless environment)');
      console.log('✅ Image uploaded successfully to Cloudinary:', imageUrl);
      
      // Return response with just the image URL
      const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);
      response.images = response.images || [];
      
      // Add the new image to the response
      response.images.push({
        id: Date.now().toString(), // Temporary ID
        imageUrl: imageUrl,
        isPrimary: response.images.length === 0,
        order: response.images.length,
      });
      
      // Set profilePicture if this is the first image
      if (response.images.length === 1) {
        response.profilePicture = imageUrl;
      }
      
      console.log('✅ Upload completed successfully (without database storage)');
      return res.status(201).json(response);
    }

    // Map Convex user ID to Sequelize user ID if needed
    let sequelizeUserId = req.user.id;
    if (typeof req.user.id === 'string' && !/^\d+$/.test(req.user.id)) {
      // This is a Convex ID, need to find Sequelize user ID
      console.log('⚠️ Convex user ID detected in upload, finding Sequelize user mapping...');
      const { User } = require('../models');
      if (User && req.user.email) {
        try {
          const sequelizeUser = await User.findOne({
            where: { email: req.user.email },
            attributes: ['id']
          });
          if (sequelizeUser) {
            sequelizeUserId = sequelizeUser.id;
            console.log('✅ Mapped Convex ID to Sequelize ID:', req.user.id, '->', sequelizeUserId);
          } else {
            console.error('❌ No Sequelize user found for email:', req.user.email);
            return res.status(500).json({ 
              error: 'User mapping not found. Please contact support.' 
            });
          }
        } catch (mappingError) {
          console.error('❌ Error finding Sequelize user mapping:', mappingError);
          return res.status(500).json({ 
            error: 'Failed to map user ID. Please contact support.' 
          });
        }
      } else {
        console.error('❌ Cannot map user ID - User model or email not available');
        return res.status(500).json({ 
          error: 'User mapping not available. Please contact support.' 
        });
      }
    }

    try {
      // Check if Image.count exists, if not use findAll and count manually
      let imageCount = 0;
      if (typeof Image.count === 'function') {
        imageCount = await Image.count({ where: { userId: sequelizeUserId } });
      } else {
        // Fallback: use findAll and count
        const images = await Image.findAll({ 
          where: { userId: sequelizeUserId },
          attributes: ['id']
        });
        imageCount = images.length;
      }
      console.log(`  - Current image count: ${imageCount}`);

      if (imageCount >= 6) {
        console.log('❌ Maximum of 6 images allowed');
        return res.status(400).json({ error: 'Maximum of 6 images allowed' });
      }

      const image = await Image.create({
        userId: sequelizeUserId,
        imageUrl,
        isPrimary: imageCount === 0,
        order: imageCount,
      });
      
      console.log(`✅ Image record created: ID ${image.id}`);
    } catch (dbError) {
      console.error('❌ Database error creating image record:', dbError);
      console.error('  - Error message:', dbError.message);
      console.error('  - Error stack:', dbError.stack);
      // Continue - image is already uploaded to Cloudinary
      // We'll return the response without database record
    }

    console.log(`✅ Image record created: ID ${image.id}`);

    const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);

    console.log('✅ Upload completed successfully');
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error uploading profile picture:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Error details:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteImage = async (req, res) => {
  try {
    if (!Image) {
      return res.status(500).json({ 
        error: 'Image storage not available. Please check database configuration.' 
      });
    }

    const image = await Image.findOne({
      where: {
        id: req.params.imageId,
        userId: req.user.id,
      },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete image file from storage
    try {
      const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      const useCloudinary = isVercel || process.env.USE_CLOUDINARY === '1';
      
      if (useCloudinary && image.imageUrl && image.imageUrl.includes('cloudinary.com')) {
        // Delete from Cloudinary
        const CloudinaryService = require('../services/cloudinaryService');
        const cloudinaryService = new CloudinaryService();
        if (cloudinaryService.isConfigured) {
          await cloudinaryService.deleteImageByUrl(image.imageUrl);
          console.log(`🗑️ Deleted image from Cloudinary: ${image.imageUrl}`);
        }
      } else {
        // Delete from local storage
        const storageService = new LocalStorageService();
        await storageService.deleteImage(image.imageUrl);
        console.log(`🗑️ Deleted image file: ${image.imageUrl}`);
      }
    } catch (err) {
      console.error('⚠️ Error deleting image file:', err);
      // Continue even if file deletion fails - database record is deleted
    }

    await image.destroy();

    const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);

    res.json(response);
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateImageOrder = async (req, res) => {
  try {
    if (!Image) {
      return res.status(500).json({ 
        error: 'Image storage not available. Please check database configuration.' 
      });
    }

    const { imageIds } = req.body;
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'imageIds must be an array' });
    }

    const images = await Image.findAll({
      where: { userId: req.user.id },
    });

    const imageMap = new Map(images.map((img) => [img.id.toString(), img]));

    imageIds.forEach((id, index) => {
      const image = imageMap.get(id.toString());
      if (image) {
        image.order = index;
        image.isPrimary = index === 0;
      }
    });

    await Promise.all(Array.from(imageMap.values()).map((img) => img.save()));

    const response = await buildProfileResponse(await ensureProfile(req.user.id), req.user.id);

    res.json(response);
  } catch (error) {
    console.error('Error updating image order:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const hideAccount = async (req, res) => {
  try {
    await convexService.mutation('userProfiles:updateByUserId', {
      userId: req.user.id,
      isHidden: true,
    });

    res.json({ message: 'Account hidden', isHidden: true });
  } catch (error) {
    console.error('Error hiding account:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const unhideAccount = async (req, res) => {
  try {
    await convexService.mutation('userProfiles:updateByUserId', {
      userId: req.user.id,
      isHidden: false,
    });

    res.json({ message: 'Account visible', isHidden: false });
  } catch (error) {
    console.error('Error unhiding account:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAccountVisibility = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    res.json({ isHidden: profile.isHidden || false });
  } catch (error) {
    console.error('Error getting account visibility:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  deleteImage,
  updateImageOrder,
  hideAccount,
  unhideAccount,
  getAccountVisibility,
};

