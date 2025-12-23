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

      // Check if user already has a store
      const existingStore = await Store.findOne({
        where: { userId }
      });

      if (existingStore) {
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

      const store = await Store.create({
        userId,
        storeName,
        description: description || null,
        location: location || null,
        latitude: latitude || null,
        longitude: longitude || null,
        logo: logo || null,
        isActive: true
      });

      res.status(201).json({
        success: true,
        message: 'Store account created successfully',
        store: store.toJSON()
      });
    } catch (error) {
      console.error('Error creating store:', error);
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
        attributes: ['id', 'storeName', 'description', 'logo', 'profilePicture', 'location', 'latitude', 'longitude', 'isActive', 'createdAt', 'updatedAt']
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
      console.log(`  - Stored filename: ${req.file.filename}`);
      console.log(`  - File path: ${req.file.path}`);
      console.log(`  - File size: ${req.file.size} bytes`);
      console.log(`  - MIME type: ${req.file.mimetype}`);

      // Check if file exists at the path multer saved it
      if (!fs.existsSync(req.file.path)) {
        console.error(`❌ File does not exist at path: ${req.file.path}`);
        return res.status(500).json({
          success: false,
          message: 'Uploaded file not found'
        });
      }

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

      console.log('📁 Initializing LocalStorageService...');
      const storageService = new LocalStorageService();
      console.log(`  - Uploads directory: ${storageService.uploadsDir}`);
      
      console.log('📤 Uploading to local storage...');
      const uploadResult = await storageService.uploadImage(req.file.path, 'stores');
      console.log(`✅ Upload successful: ${uploadResult.url}`);
      console.log(`  - Destination: ${uploadResult.destination}`);
      
      const imageUrl = uploadResult.url;

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

module.exports = createStoreController;

