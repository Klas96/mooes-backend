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

  return {
    createStore,
    getMyStore,
    updateMyStore
  };
}

module.exports = createStoreController;

