const { Op } = require('sequelize');

function createCouponController({ Coupon, StoreGoal, Store, User }) {
  // Get user's coupons (includes assigned coupons and unassigned coupons available to all users)
  const getUserCoupons = async (req, res) => {
    try {
      const userId = req.user.id;

      // Get coupons assigned to this user
      const assignedCoupons = await Coupon.findAll({
        where: { userId },
        include: [
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Get unassigned coupons available to all users (where userId is null)
      const unassignedCoupons = await Coupon.findAll({
        where: {
          userId: null,
          isUsed: false
        },
        include: [
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Combine both lists
      const allCoupons = [...assignedCoupons, ...unassignedCoupons];

      res.json({
        success: true,
        coupons: allCoupons.map(c => c.toJSON())
      });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: error.message
      });
    }
  };

  // Get a specific coupon (works for both assigned and unassigned coupons)
  const getCoupon = async (req, res) => {
    try {
      const userId = req.user.id;
      const { couponId } = req.params;

      const coupon = await Coupon.findOne({
        where: {
          id: couponId,
          [Op.or]: [
            { userId: userId },
            { userId: null } // Unassigned coupons available to all users
          ]
        },
        include: [
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          },
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location', 'description']
          }
        ]
      });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      res.json({
        success: true,
        coupon: coupon.toJSON()
      });
    } catch (error) {
      console.error('Error fetching coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon',
        error: error.message
      });
    }
  };

  // Create a new coupon (store only - no challenge required)
  const createCoupon = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user has a store account
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You must have an active store account to create coupons'
        });
      }

      const {
        code,
        description,
        discount,
        discountAmount,
        expiresAt,
        userEmail,
        userId: assignedUserId
      } = req.body;

      // Validate required fields
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is required'
        });
      }

      // Check if coupon code already exists for this store
      const existingCoupon = await Coupon.findOne({
        where: {
          code,
          storeId: store.id,
          isUsed: false
        }
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'A coupon with this code already exists for your store'
        });
      }

      // If userEmail is provided, find the user
      let finalUserId = assignedUserId || null;
      if (userEmail && !finalUserId) {
        const targetUser = await User.findOne({
          where: { email: userEmail }
        });
        if (targetUser) {
          finalUserId = targetUser.id;
        } else {
          return res.status(404).json({
            success: false,
            message: `User with email ${userEmail} not found`
          });
        }
      }

      // Create the coupon
      const coupon = await Coupon.create({
        userId: finalUserId,
        goalId: null, // No challenge required
        storeId: store.id,
        code,
        description: description || null,
        discount: discount || null,
        discountAmount: discountAmount || null,
        expiresAt: expiresAt || null,
        isUsed: false
      });

      res.status(201).json({
        success: true,
        coupon: coupon.toJSON()
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create coupon',
        error: error.message
      });
    }
  };

  // Mark coupon as used (works for both assigned and unassigned coupons)
  const useCoupon = async (req, res) => {
    try {
      const userId = req.user.id;
      const { couponId } = req.params;

      // Find coupon - either assigned to this user OR unassigned (available to all)
      const coupon = await Coupon.findOne({
        where: {
          id: couponId,
          isUsed: false,
          [Op.or]: [
            { userId: userId },
            { userId: null } // Unassigned coupons available to all users
          ]
        },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          },
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          }
        ]
      });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or already used'
        });
      }

      // Check if coupon is expired
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Coupon has expired'
        });
      }

      // If coupon is unassigned, assign it to this user when using
      const updateData = {
        isUsed: true,
        usedAt: new Date()
      };

      if (!coupon.userId) {
        updateData.userId = userId;
      }

      await coupon.update(updateData);

      // Reload to get associations
      await coupon.reload({
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          },
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        coupon: coupon.toJSON()
      });
    } catch (error) {
      console.error('Error using coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to use coupon',
        error: error.message
      });
    }
  };

  // Get all coupons for a store (store only)
  const getStoreCoupons = async (req, res) => {
    try {
      const userId = req.user.id;

      // Check if user has a store account
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You must have an active store account to view coupons'
        });
      }

      const coupons = await Coupon.findAll({
        where: { storeId: store.id },
        include: [
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        coupons: coupons.map(c => c.toJSON())
      });
    } catch (error) {
      console.error('Error fetching store coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: error.message
      });
    }
  };

  // Delete a coupon (store only)
  const deleteCoupon = async (req, res) => {
    try {
      const userId = req.user.id;
      const { couponId } = req.params;

      // Check if user has a store account
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You must have an active store account to delete coupons'
        });
      }

      // Find the coupon and verify it belongs to this store
      const coupon = await Coupon.findOne({
        where: { id: couponId, storeId: store.id }
      });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or you do not have permission to delete it'
        });
      }

      // Delete the coupon
      await coupon.destroy();

      res.json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete coupon',
        error: error.message
      });
    }
  };

  // Redeem/claim a coupon by code (for unassigned coupons)
  const redeemCoupon = async (req, res) => {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is required'
        });
      }

      // Find an unassigned coupon with this code
      const coupon = await Coupon.findOne({
        where: {
          code,
          userId: null, // Unassigned coupon
          isUsed: false
        },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          }
        ]
      });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or already assigned to another user'
        });
      }

      // Check if coupon is expired
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'This coupon has expired'
        });
      }

      // Check if user already has a coupon with this code
      const existingUserCoupon = await Coupon.findOne({
        where: {
          code,
          userId,
          isUsed: false
        }
      });

      if (existingUserCoupon) {
        return res.status(400).json({
          success: false,
          message: 'You already have this coupon',
          coupon: existingUserCoupon.toJSON()
        });
      }

      // Assign the coupon to the user
      await coupon.update({
        userId: userId
      });

      // Reload with associations
      await coupon.reload({
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          },
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        message: 'Coupon redeemed successfully',
        coupon: coupon.toJSON()
      });
    } catch (error) {
      console.error('Error redeeming coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to redeem coupon',
        error: error.message
      });
    }
  };

  // Assign an existing coupon to a user (store only)
  const assignCoupon = async (req, res) => {
    try {
      const userId = req.user.id;
      const { couponId } = req.params;
      const { userEmail } = req.body;

      // Check if user has a store account
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You must have an active store account to assign coupons'
        });
      }

      // Find the coupon and verify it belongs to this store
      const coupon = await Coupon.findOne({
        where: { id: couponId, storeId: store.id }
      });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or you do not have permission to assign it'
        });
      }

      // If coupon is already assigned, don't allow reassignment
      if (coupon.userId) {
        return res.status(400).json({
          success: false,
          message: 'This coupon is already assigned to a user'
        });
      }

      // If userEmail is provided, find the user
      if (!userEmail) {
        return res.status(400).json({
          success: false,
          message: 'User email is required'
        });
      }

      const targetUser = await User.findOne({
        where: { email: userEmail }
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: `User with email ${userEmail} not found`
        });
      }

      // Assign the coupon
      await coupon.update({
        userId: targetUser.id
      });

      // Reload with associations
      await coupon.reload({
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'logo', 'profilePicture', 'location']
          },
          {
            model: StoreGoal,
            as: 'goal',
            attributes: ['id', 'title', 'description'],
            required: false
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName'],
            required: false
          }
        ]
      });

      res.json({
        success: true,
        message: 'Coupon assigned successfully',
        coupon: coupon.toJSON()
      });
    } catch (error) {
      console.error('Error assigning coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign coupon',
        error: error.message
      });
    }
  };

  return {
    getUserCoupons,
    getCoupon,
    useCoupon,
    createCoupon,
    getStoreCoupons,
    deleteCoupon,
    redeemCoupon,
    assignCoupon
  };
}

module.exports = createCouponController;

