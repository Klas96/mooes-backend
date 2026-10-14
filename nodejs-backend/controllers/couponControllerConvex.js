/**
 * Coupon Controller (Convex Version)
 *
 * This controller uses Convex instead of Sequelize for database operations.
 */

const convexService = require('../services/convexService');
const { formatCoupon, formatStore, formatStoreGoal, formatUser } = require('../helpers/convexHelpers');
const { dateToTimestamp } = require('../helpers/convexHelpers');

/**
 * Helper function to handle errors
 */
const handleError = (error, res) => {
  console.error('Coupon error:', error);
  return res.status(500).json({
    success: false,
    message: error.message || 'An unexpected error occurred. Please try again.',
    error: error.message || 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * Get user's coupons (includes assigned coupons and unassigned coupons available to all users)
 */
const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get coupons assigned to this user
    const assignedCoupons = await convexService.query('coupons:getByUserId', { userId });

    // Get all coupons by querying all stores and getting their coupons
    // Then filter for unassigned (userId is null)
    // Note: Since we can't query for null userId directly, we need to get all coupons from all stores
    // For now, we'll query coupons by store and combine them
    // A better approach would be to add a list query, but for now we'll use store-based queries
    // Note: getByStoreId now automatically filters out used coupons
    const allStores = await convexService.query('stores:listActive', { limit: 1000 });
    const allStoreCoupons = await Promise.all(
      allStores.map(store => convexService.query('coupons:getByStoreId', { storeId: store._id }))
    );
    const flatCoupons = allStoreCoupons.flat();
    const unassignedCoupons = flatCoupons.filter(c => !c.userId);

    // Enrich both lists with store and goal data
    const enrichCoupon = async (coupon) => {
      const store = await convexService.query('stores:getById', { id: coupon.storeId });
      const goal = coupon.goalId ? await convexService.query('storeGoals:getById', { id: coupon.goalId }) : null;
      return formatCoupon({ ...coupon, store, goal });
    };

    const enrichedAssigned = await Promise.all(assignedCoupons.map(enrichCoupon));
    const enrichedUnassigned = await Promise.all(unassignedCoupons.map(enrichCoupon));

    // Combine and sort by creation date (newest first)
    const allCouponsFormatted = [...enrichedAssigned, ...enrichedUnassigned].sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      return bDate - aDate;
    });

    res.json({
      success: true,
      coupons: allCouponsFormatted
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get a specific coupon (works for both assigned and unassigned coupons)
 */
const getCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.params;

    const coupon = await convexService.query('coupons:getById', { id: couponId });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if user has access (assigned to user OR unassigned)
    if (coupon.userId && coupon.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this coupon'
      });
    }

    const formattedCoupon = formatCoupon(coupon);

    res.json({
      success: true,
      coupon: formattedCoupon
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Create a new coupon (store only - no challenge required)
 */
const createCoupon = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has a store account
    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
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

    // Check if coupon code already exists
    const existingCoupon = await convexService.query('coupons:getByCode', { code });
    if (existingCoupon && existingCoupon.storeId === store._id && !existingCoupon.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'A coupon with this code already exists for your store'
      });
    }

    // If userEmail is provided, find the user
    let finalUserId = assignedUserId || null;
    if (userEmail && !finalUserId) {
      const targetUser = await convexService.query('users:getByEmail', { email: userEmail });
      if (targetUser) {
        finalUserId = targetUser._id;
      } else {
        return res.status(404).json({
          success: false,
          message: `User with email ${userEmail} not found`
        });
      }
    }

    // Build mutation data - Convex doesn't accept null, use undefined instead
    const mutationData = {
      storeId: store._id,
      code,
      isUsed: false
    };
    
    // Only include optional fields if they have values (not null/empty)
    if (finalUserId) mutationData.userId = finalUserId;
    // goalId is optional - don't include if not provided
    if (description) mutationData.description = description;
    if (discount !== null && discount !== undefined) mutationData.discount = discount;
    if (discountAmount !== null && discountAmount !== undefined) mutationData.discountAmount = discountAmount;
    if (expiresAt) mutationData.expiresAt = dateToTimestamp(new Date(expiresAt));
    
    const couponId = await convexService.mutation('coupons:create', mutationData);

    const coupon = await convexService.query('coupons:getById', { id: couponId });
    const formattedCoupon = formatCoupon(coupon);

    res.status(201).json({
      success: true,
      coupon: formattedCoupon
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Mark coupon as used (works for both assigned and unassigned coupons)
 */
const useCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.params;

    const coupon = await convexService.query('coupons:getById', { id: couponId });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check access: coupon must be assigned to user OR unassigned (available to all)
    if (coupon.userId && coupon.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this coupon'
      });
    }

    if (coupon.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Coupon already used'
      });
    }

    // Check if coupon is expired
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      });
    }

    // Update coupon: mark as used and assign to user if unassigned
    const updateData = {
      id: coupon._id,
      isUsed: true,
      usedAt: Date.now()
    };

    if (!coupon.userId) {
      updateData.userId = userId;
    }

    await convexService.mutation('coupons:update', updateData);

    // Fetch updated coupon with all relations
    const updatedCoupon = await convexService.query('coupons:getById', { id: coupon._id });
    const formattedCoupon = formatCoupon(updatedCoupon);

    res.json({
      success: true,
      coupon: formattedCoupon
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get all coupons for a store (store only)
 */
const getStoreCoupons = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has a store account
    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active store account to view coupons'
      });
    }

    const coupons = await convexService.query('coupons:getByStoreId', { storeId: store._id });

    // Enrich with goal and user data
    const enrichedCoupons = await Promise.all(
      coupons.map(async (coupon) => {
        const goal = coupon.goalId ? await convexService.query('storeGoals:getById', { id: coupon.goalId }) : null;
        const user = coupon.userId ? await convexService.query('users:getById', { id: coupon.userId }) : null;
        return formatCoupon({ ...coupon, goal, user, store });
      })
    );

    // Sort by creation date (newest first)
    enrichedCoupons.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      return bDate - aDate;
    });

    res.json({
      success: true,
      coupons: enrichedCoupons
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get public coupons for a store (unassigned/unused coupons for display)
 */
const getStorePublicCoupons = async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }

    // Verify store exists and is active
    const store = await convexService.query('stores:getById', { id: storeId });

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Get all coupons for this store (getByStoreId now automatically excludes used coupons)
    const allCoupons = await convexService.query('coupons:getByStoreId', { storeId: storeId });

    // Filter for unassigned (userId is null) coupons
    const publicCoupons = allCoupons.filter(c => !c.userId);

    // Enrich with goal data
    const enrichedCoupons = await Promise.all(
      publicCoupons.map(async (coupon) => {
        const goal = coupon.goalId ? await convexService.query('storeGoals:getById', { id: coupon.goalId }) : null;
        return formatCoupon({ ...coupon, goal, store });
      })
    );

    // Sort by creation date (newest first)
    enrichedCoupons.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      return bDate - aDate;
    });

    res.json({
      success: true,
      coupons: enrichedCoupons
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Delete a coupon (store only)
 */
const deleteCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.params;

    // Check if user has a store account
    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active store account to delete coupons'
      });
    }

    // Find the coupon and verify it belongs to this store
    const coupon = await convexService.query('coupons:getById', { id: couponId });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    if (coupon.storeId !== store._id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this coupon'
      });
    }

    // Delete the coupon
    await convexService.mutation('coupons:remove', { id: couponId });

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Redeem/claim a coupon by code (for unassigned coupons)
 */
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
    const coupon = await convexService.query('coupons:getByCode', { code });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if it's unassigned and unused
    if (coupon.userId || coupon.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Coupon not available or already assigned to another user'
      });
    }

    // Check if coupon is expired
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has expired'
      });
    }

    // Check if user already has a coupon with this code
    const userCoupons = await convexService.query('coupons:getByUserId', { userId });
    const existingUserCoupon = userCoupons.find(c => c.code === code && !c.isUsed);

    if (existingUserCoupon) {
      return res.status(400).json({
        success: false,
        message: 'You already have this coupon',
        coupon: formatCoupon(existingUserCoupon)
      });
    }

    // Assign the coupon to the user
    await convexService.mutation('coupons:update', {
      id: coupon._id,
      userId: userId
    });

    // Fetch updated coupon with all relations
    const updatedCoupon = await convexService.query('coupons:getById', { id: coupon._id });
    const formattedCoupon = formatCoupon(updatedCoupon);

    res.json({
      success: true,
      message: 'Coupon redeemed successfully',
      coupon: formattedCoupon
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Assign an existing coupon to a user (store only)
 */
const assignCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { couponId } = req.params;
    const { userEmail } = req.body;

    // Check if user has a store account
    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active store account to assign coupons'
      });
    }

    // Find the coupon and verify it belongs to this store
    const coupon = await convexService.query('coupons:getById', { id: couponId });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    if (coupon.storeId !== store._id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign this coupon'
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

    const targetUser = await convexService.query('users:getByEmail', { email: userEmail });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `User with email ${userEmail} not found`
      });
    }

    // Assign the coupon
    await convexService.mutation('coupons:update', {
      id: coupon._id,
      userId: targetUser._id
    });

    // Fetch updated coupon with all relations
    const updatedCoupon = await convexService.query('coupons:getById', { id: coupon._id });
    const formattedCoupon = formatCoupon(updatedCoupon);

    res.json({
      success: true,
      message: 'Coupon assigned successfully',
      coupon: formattedCoupon
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  getUserCoupons,
  getCoupon,
  useCoupon,
  createCoupon,
  getStoreCoupons,
  getStorePublicCoupons,
  deleteCoupon,
  redeemCoupon,
  assignCoupon
};

