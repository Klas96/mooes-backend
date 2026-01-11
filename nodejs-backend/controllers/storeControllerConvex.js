/**
 * Store Controller (Convex Version)
 *
 * This controller uses Convex instead of Sequelize for database operations.
 */

const convexService = require('../services/convexService');
const { formatStore } = require('../helpers/convexHelpers');
const fs = require('fs');
const LocalStorageService = require('../services/localStorageService');

/**
 * Helper function to handle errors
 */
const handleError = (error, res) => {
  console.error('Store error:', error);
  return res.status(500).json({
    success: false,
    message: error.message || 'An unexpected error occurred. Please try again.',
    error: error.message || 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * Helper to convert storeId string to Convex ID
 * Handles both numeric strings (legacy) and Convex IDs
 */
function parseStoreId(storeId) {
  // If it looks like a Convex ID (starts with letter), return as is
  if (typeof storeId === 'string' && /^[a-z]/.test(storeId)) {
    return storeId;
  }
  // Otherwise, try to parse as numeric (legacy Sequelize ID)
  // For now, we'll require Convex IDs
  // TODO: Add migration logic to map legacy IDs to Convex IDs if needed
  return storeId;
}

/**
 * @desc    Create a store account for the current user
 * @route   POST /api/stores
 * @access  Private
 */
const createStore = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // Already a Convex ID from auth middleware
    
    console.log('🔍 Creating store for user:', {
      userId,
      userIdType: typeof userId,
      userEmail: req.user.email,
      hasUserId: !!req.user.id,
      hasUser_id: !!req.user._id,
      reqUser: req.user
    });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate that userId is a Convex ID (starts with letter, not a number)
    if (typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId))) {
      console.error('❌ Invalid user ID format - expected Convex ID, got numeric ID:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format. Please log in again to get a fresh token.',
        error: 'INVALID_USER_ID_FORMAT'
      });
    }

    // Check if user already has a store
    console.log('🔍 Checking for existing store with userId:', userId);
    const existingStore = await convexService.query('stores:getByUserId', { userId });

    if (existingStore) {
      console.log('⚠️ User already has a store');
      return res.status(400).json({
        success: false,
        message: 'You already have a store account',
        store: formatStore(existingStore)
      });
    }

    const {
      storeName,
      description,
      location,
      website,
      latitude,
      longitude,
      logo
    } = req.body;

    if (!storeName) {
      return res.status(400).json({
        success: false,
        message: 'Store name is required'
      });
    }

    console.log('🔍 Creating store with data:', {
      userId,
      storeName,
      description,
      location,
      website
    });

    const storeId = await convexService.mutation('stores:create', {
      userId,
      storeName,
      description: description || null,
      location: location || null,
      website: website || null,
      latitude: latitude || null,
      longitude: longitude || null,
      logo: logo || null,
      isActive: true
    });

    console.log('✅ Store created, ID:', storeId);

    const store = await convexService.query('stores:getById', { id: storeId });
    const formattedStore = formatStore(store);

    res.status(201).json({
      success: true,
      message: 'Store account created successfully',
      store: formattedStore
    });
  } catch (error) {
    console.error('❌ Error in createStore:', error);
    console.error('  - Error name:', error.name);
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    console.error('  - Error details:', error);
    return handleError(error, res);
  }
};

/**
 * @desc    Get a store by ID (public)
 * @route   GET /api/stores/:storeId
 * @access  Public
 */
const getStoreById = async (req, res) => {
  try {
    const { storeId } = req.params;

    const parsedStoreId = parseStoreId(storeId);
    console.log(`[GET /api/stores/${storeId}] Fetching store with ID: ${parsedStoreId} (parsed from: "${storeId}")`);

    const store = await convexService.query('stores:getById', { id: parsedStoreId });

    if (!store) {
      console.log(`[GET /api/stores/${storeId}] Store not found with ID: ${parsedStoreId}`);
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    console.log(`[GET /api/stores/${storeId}] Found store: ${store.storeName} (ID: ${store._id}, Active: ${store.isActive})`);
    const formattedStore = formatStore(store);

    res.json({
      success: true,
      store: formattedStore
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    return handleError(error, res);
  }
};

/**
 * @desc    Get the current user's store
 * @route   GET /api/stores/my-store
 * @access  Private
 */
const getMyStore = async (req, res) => {
  try {
    const userId = req.user.id; // Already a Convex ID

    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store account found. Please create one first.'
      });
    }

    // Fetch user data
    const user = await convexService.query('users:getById', { id: userId });
    const formattedStore = formatStore({ ...store, user });

    res.json({
      success: true,
      store: formattedStore
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * @desc    Update the current user's store
 * @route   PUT /api/stores/my-store
 * @access  Private
 */
const updateMyStore = async (req, res) => {
  try {
    const userId = req.user.id;

    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store account not found'
      });
    }

    const {
      storeName,
      description,
      location,
      website,
      latitude,
      longitude,
      logo,
      profilePicture,
      isActive
    } = req.body;

    // Only update fields that are provided
    const updateData = { id: store._id };
    if (storeName !== undefined) updateData.storeName = storeName;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (logo !== undefined) updateData.logo = logo;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (isActive !== undefined) updateData.isActive = isActive;

    await convexService.mutation('stores:update', updateData);

    const updatedStore = await convexService.query('stores:getById', { id: store._id });
    const formattedStore = formatStore(updatedStore);

    res.json({
      success: true,
      message: 'Store updated successfully',
      store: formattedStore
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * @desc    Upload store profile picture
 * @route   POST /api/stores/upload-profile-picture
 * @access  Private
 */
const uploadProfilePicture = async (req, res) => {
  try {
    console.log('📤 Starting store profile picture upload...');
    console.log(`  - User ID: ${req.user.id}`);
    console.log(`  - File present: ${!!req.file}`);

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`  - Original filename: ${req.file.originalname}`);
    console.log(`  - File size: ${req.file.size} bytes`);
    console.log(`  - MIME type: ${req.file.mimetype}`);
    console.log(`  - Buffer present: ${!!req.file.buffer}`);
    console.log(`  - Path present: ${!!req.file.path}`);

    // Find the user's store
    const store = await convexService.query('stores:getByUserId', { userId: req.user.id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store account not found. Please create one first.'
      });
    }

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
          success: false,
          message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
        });
      }

      console.log('📤 Uploading to Cloudinary...');

      if (req.file.buffer) {
        // Memory storage (Vercel)
        const uploadResult = await cloudinaryService.uploadImageFromBuffer(
          req.file.buffer,
          req.file.originalname,
          'mooves/stores'
        );
        imageUrl = uploadResult.url;
        console.log(`✅ Upload successful: ${imageUrl}`);
      } else if (req.file.path && fs.existsSync(req.file.path)) {
        // Disk storage (traditional server)
        const uploadResult = await cloudinaryService.uploadImage(req.file.path, 'mooves/stores');
        imageUrl = uploadResult.url;
        console.log(`✅ Upload successful: ${imageUrl}`);
      } else {
        return res.status(500).json({
          success: false,
          message: 'File data not found'
        });
      }

      // Delete old profile picture from Cloudinary if it exists
      if (store.profilePicture && store.profilePicture.includes('cloudinary.com')) {
        try {
          await cloudinaryService.deleteImageByUrl(store.profilePicture);
          console.log(`🗑️ Deleted old profile picture from Cloudinary`);
        } catch (err) {
          console.error('⚠️ Error deleting old profile picture from Cloudinary:', err);
        }
      }
    } else {
      // Use local storage for traditional servers
      if (!req.file.path || !fs.existsSync(req.file.path)) {
        console.error(`❌ File does not exist at path: ${req.file.path}`);
        return res.status(500).json({
          success: false,
          message: 'Uploaded file not found'
        });
      }

      console.log('📁 Initializing LocalStorageService...');
      const storageService = new LocalStorageService();
      console.log(`  - Uploads directory: ${storageService.uploadsDir}`);

      console.log('📤 Uploading to local storage...');
      const uploadResult = await storageService.uploadImage(req.file.path, 'stores');
      console.log(`✅ Upload successful: ${uploadResult.url}`);
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

      // Delete old profile picture if it exists
      if (store.profilePicture) {
        try {
          const path = require('path');
          const oldImagePath = store.profilePicture.replace(/^\/uploads\//, '');
          const oldImageFullPath = path.join(storageService.uploadsDir, oldImagePath);
          if (fs.existsSync(oldImageFullPath)) {
            fs.unlinkSync(oldImageFullPath);
            console.log(`🗑️ Deleted old profile picture: ${oldImagePath}`);
          }
        } catch (err) {
          console.error('⚠️ Error deleting old profile picture:', err);
        }
      }
    }

    // Update store with new profile picture
    await convexService.mutation('stores:update', {
      id: store._id,
      profilePicture: imageUrl
    });

    const updatedStore = await convexService.query('stores:getById', { id: store._id });
    const formattedStore = formatStore(updatedStore);

    console.log('✅ Profile picture updated successfully');

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      store: formattedStore
    });
  } catch (error) {
    console.error('❌ Error uploading store profile picture:');
    console.error('  - Error message:', error.message);
    console.error('  - Error stack:', error.stack);
    return handleError(error, res);
  }
};

module.exports = {
  createStore,
  getStoreById,
  getMyStore,
  updateMyStore,
  uploadProfilePicture
};


