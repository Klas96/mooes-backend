const fs = require('fs');
const path = require('path');
const LocalStorageService = require('../services/localStorageService');

function createStoreController({ Store, User }) {
  /**
   * @desc    Create a store account for the current user
   * @route   POST /api/stores
   * @access  Private
   */
  const createStore = async (req, res) => {
    try {
      const userId = req.user.id;
      console.log('🔍 Creating store for user ID:', userId, 'Type:', typeof userId);

      // Check if user already has a store
      const existingStore = await Store.findOne({
        where: { userId }
      });

      if (existingStore) {
        console.log('⚠️ User already has a store');
        return res.status(400).json({
          success: false,
          message: 'You already have a store account',
          store: existingStore.toJSON()
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

      console.log('📝 Creating store with data:', { storeName, location, website });
      const store = await Store.create({
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

      console.log('✅ Store created successfully, ID:', store.id);
      res.status(201).json({
        success: true,
        message: 'Store account created successfully',
        store: store.toJSON()
      });
    } catch (error) {
      console.error('❌ Error creating store:', error);
      console.error('  - Error name:', error.name);
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to create store account',
        error: error.message
      });
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

      // Parse storeId as integer
      const storeIdInt = parseInt(storeId, 10);
      if (isNaN(storeIdInt)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid store ID'
        });
      }

      console.log(`[GET /api/stores/${storeId}] Fetching store with ID: ${storeIdInt} (parsed from: "${storeId}")`);

      // Allow viewing stores even if inactive (they may still have active goals)
      const store = await Store.findOne({
        where: { 
          id: storeIdInt
        },
        attributes: ['id', 'storeName', 'description', 'logo', 'profilePicture', 'location', 'website', 'latitude', 'longitude', 'isActive', 'createdAt', 'updatedAt']
      });

      if (!store) {
        console.log(`[GET /api/stores/${storeId}] Store not found with ID: ${storeIdInt}`);
        // Check if any stores exist at all
        const storeCount = await Store.count();
        console.log(`[GET /api/stores/${storeId}] Total stores in database: ${storeCount}`);
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      console.log(`[GET /api/stores/${storeId}] Found store: ${store.storeName} (ID: ${store.id}, Active: ${store.isActive})`);

      res.json({
        success: true,
        store: store.toJSON()
      });
    } catch (error) {
      console.error('Error fetching store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store',
        error: error.message
      });
    }
  };

  /**
   * @desc    Get the current user's store
   * @route   GET /api/stores/my-store
   * @access  Private
   */
  const getMyStore = async (req, res) => {
    try {
      const userId = req.user.id;

      const store = await Store.findOne({
        where: { userId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName']
          }
        ]
      });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'No store account found. Please create one first.'
        });
      }

      res.json({
        success: true,
        store: store.toJSON()
      });
    } catch (error) {
      console.error('Error fetching store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store',
        error: error.message
      });
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

      const store = await Store.findOne({
        where: { userId }
      });

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
      const updateData = {};
      if (storeName !== undefined) updateData.storeName = storeName;
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location;
      if (website !== undefined) updateData.website = website;
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (logo !== undefined) updateData.logo = logo;
      if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
      if (isActive !== undefined) updateData.isActive = isActive;

      await store.update(updateData);

      res.json({
        success: true,
        message: 'Store updated successfully',
        store: store.toJSON()
      });
    } catch (error) {
      console.error('Error updating store:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update store',
        error: error.message
      });
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
      const store = await Store.findOne({
        where: { userId: req.user.id }
      });

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
      await store.update({
        profilePicture: imageUrl
      });

      console.log('✅ Profile picture updated successfully');

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        store: store.toJSON()
      });
    } catch (error) {
      console.error('❌ Error uploading store profile picture:');
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile picture',
        error: error.message
      });
    }
  };

  return {
    createStore,
    getStoreById,
    getMyStore,
    updateMyStore,
    uploadProfilePicture
  };
}

// Default export for app use
// Use Sequelize if available (for users authenticated via Sequelize), otherwise Convex
const convexService = require('../services/convexService');
const { Store: StoreModel, User: UserModel, sequelize } = require('../models');

let defaultStoreController;

// Check if Sequelize is available and models are valid
// More lenient check - if models exist and sequelize instance exists, use Sequelize
const hasSequelizeInstance = sequelize && typeof sequelize.authenticate === 'function';
const hasStoreModel = StoreModel && typeof StoreModel.findOne === 'function';
const hasUserModel = UserModel && typeof UserModel.findOne === 'function';
const sequelizeAvailable = hasSequelizeInstance && hasStoreModel && hasUserModel;

console.log('🔍 Store controller initialization check:');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('  - CONVEX_URL:', process.env.CONVEX_URL ? 'SET' : 'NOT SET');
console.log('  - sequelize instance:', hasSequelizeInstance ? 'AVAILABLE' : 'MISSING');
console.log('  - StoreModel:', hasStoreModel ? 'AVAILABLE' : 'MISSING');
console.log('  - UserModel:', hasUserModel ? 'AVAILABLE' : 'MISSING');
console.log('  - Sequelize available:', sequelizeAvailable ? 'YES' : 'NO');

if (sequelizeAvailable) {
  console.log('✅ Using Sequelize-based store controller');
  // Use Sequelize version (matches auth middleware behavior)
  defaultStoreController = createStoreController({ Store: StoreModel, User: UserModel });
} else if (convexService.isAvailable()) {
  console.log('✅ Using Convex-based store controller (Sequelize not available)');
  // Use Convex version
  defaultStoreController = require('./storeControllerConvex');
} else {
  console.error('⚠️ ERROR: Cannot create store controller - neither Convex nor Sequelize available');
  console.error('⚠️ CONVEX_URL:', process.env.CONVEX_URL ? 'SET' : 'NOT SET');
  console.error('⚠️ DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.error('⚠️ StoreModel:', StoreModel ? 'EXISTS' : 'MISSING');
  console.error('⚠️ UserModel:', UserModel ? 'EXISTS' : 'MISSING');
  console.error('⚠️ StoreModel.sequelize:', StoreModel?.sequelize ? 'EXISTS' : 'MISSING');
  // Create a dummy controller that returns errors for all methods
  const errorResponse = (req, res) => {
    console.error(`❌ ${req.method} ${req.path} called but no database available`);
    return res.status(503).json({ 
      success: false,
      message: 'Database connection not available. Please try again in a few moments.',
      error: 'DATABASE_CONNECTION_ERROR'
    });
  };
  
  defaultStoreController = {
    createStore: errorResponse,
    getStoreById: errorResponse,
    getMyStore: errorResponse,
    updateMyStore: errorResponse,
    uploadProfilePicture: errorResponse,
  };
}

// Cache controllers to avoid recreating on every request
let sequelizeControllerCache = null;
let convexControllerCache = null;

// Runtime wrapper that selects controller based on user authentication method
// If user has numeric ID, use Sequelize; if string Convex ID, use Convex
const getController = (req) => {
  // Check if user has numeric ID (Sequelize) or Convex ID (string starting with letter)
  if (req.user && req.user.id) {
    const userId = req.user.id;
    const isNumericId = typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId));
    const isConvexId = typeof userId === 'string' && /^[a-z]/.test(userId);
    
    // Runtime check if Sequelize is actually available (models might load asynchronously)
    const hasSequelizeRuntime = StoreModel && UserModel && StoreModel.sequelize && typeof StoreModel.findOne === 'function';
    
    console.log('🔍 Store controller selection:', {
      userId,
      userIdType: typeof userId,
      isNumericId,
      isConvexId,
      sequelizeAvailable,
      hasSequelizeRuntime,
      convexAvailable: convexService.isAvailable()
    });
    
    // If user has numeric ID and Sequelize is available at runtime, use Sequelize
    if (isNumericId && hasSequelizeRuntime) {
      if (!sequelizeControllerCache) {
        console.log('✅ Creating Sequelize store controller (cached)');
        sequelizeControllerCache = createStoreController({ Store: StoreModel, User: UserModel });
      }
      return sequelizeControllerCache;
    }
    // If user has Convex ID or Sequelize not available, use Convex
    if (isConvexId || !hasSequelizeRuntime) {
      if (convexService.isAvailable()) {
        if (!convexControllerCache) {
          console.log('✅ Loading Convex store controller (cached)');
          convexControllerCache = require('./storeControllerConvex');
        }
        return convexControllerCache;
      }
    }
  }
  
  console.log('⚠️ Falling back to default controller');
  // Fallback to default controller
  return defaultStoreController;
};

// Export wrapper functions that select controller at runtime
module.exports = {
  createStore: async (req, res) => {
    console.log('🚀 createStore called, req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'null');
    const controller = getController(req);
    console.log('📦 Selected controller type:', controller === sequelizeControllerCache ? 'Sequelize' : (controller === convexControllerCache ? 'Convex' : 'Default'));
    return controller.createStore(req, res);
  },
  getStoreById: async (req, res) => {
    const controller = getController(req);
    return controller.getStoreById(req, res);
  },
  getMyStore: async (req, res) => {
    const controller = getController(req);
    return controller.getMyStore(req, res);
  },
  updateMyStore: async (req, res) => {
    const controller = getController(req);
    return controller.updateMyStore(req, res);
  },
  uploadProfilePicture: async (req, res) => {
    const controller = getController(req);
    return controller.uploadProfilePicture(req, res);
  },
};

