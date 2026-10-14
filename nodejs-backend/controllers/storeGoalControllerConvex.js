/**
 * Store Goal Controller (Convex Version)
 *
 * This controller uses Convex instead of Sequelize for database operations.
 */

const convexService = require('../services/convexService');
const { formatStoreGoal, formatStore, formatUser } = require('../helpers/convexHelpers');

/**
 * Helper function to handle errors
 */
const handleError = (error, res) => {
  console.error('Store goal error:', error);
  return res.status(500).json({
    success: false,
    message: error.message || 'An unexpected error occurred. Please try again.',
    error: error.message || 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * Helper to check if a goal is currently active based on dates
 */
function isGoalActive(goal) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const startDate = goal.startDate;
  const endDate = goal.endDate;
  
  // Goal must be active and start date must be today or in the past
  if (!goal.isActive || startDate > today) {
    return false;
  }
  
  // If no end date, goal is active if started
  if (!endDate) {
    return true;
  }
  
  // Goal is active if today is between start and end date
  return today <= endDate;
}

/**
 * Get all active store goals (for users to browse)
 */
const getActiveGoals = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user?.id; // Optional - user may not be logged in

    // Check if user has a store (to show their own goals even with future dates)
    let userStore = null;
    if (userId) {
      try {
        userStore = await convexService.query('stores:getByUserId', { userId });
      } catch (e) {
        // User doesn't have a store, that's fine
      }
    }

    // Get all active goals
    const goals = await convexService.query('storeGoals:listActive', { limit: 50 });

    // Filter by date range and enrich with store data
    const activeGoals = [];
    for (const goal of goals) {
      // If user owns the store, show the goal even if it has a future start date
      const isOwnGoal = userStore && goal.storeId === userStore._id;
      if (!isOwnGoal && !isGoalActive(goal)) continue;

      // Get store data
      const store = await convexService.query('stores:getById', { id: goal.storeId });
      if (!store || !store.isActive) continue;

      // Get user data for store
      const storeUser = await convexService.query('users:getById', { id: store.userId });

      // Get participant counts
      const allProgress = await convexService.query('userGoalProgress:getByGoalId', { goalId: goal._id });
      const participantCount = allProgress.length;
      const completedCount = allProgress.filter(p => p.isCompleted).length;

      // Check if current user has progress
      let userProgress = null;
      let isCompleted = false;
      if (userId) {
        userProgress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
          userId,
          goalId: goal._id
        });
        if (userProgress) {
          isCompleted = userProgress.isCompleted;
        }
      }

      const goalData = formatStoreGoal({
        ...goal,
        store: { ...store, user: storeUser }
      });

      goalData.participantCount = participantCount;
      goalData.completedCount = completedCount;
      goalData.isFull = goal.maxParticipants != null && participantCount >= goal.maxParticipants;
      goalData.isCompleted = isCompleted;
      goalData.userProgress = userProgress ? {
        id: userProgress._id,
        isCompleted: userProgress.isCompleted,
        completedAt: userProgress.completedAt ? new Date(userProgress.completedAt) : null,
        currentDistanceMeters: userProgress.currentDistanceMeters,
        currentDurationMinutes: userProgress.currentDurationMinutes
      } : null;

      activeGoals.push(goalData);
    }

    // Sort by creation date (newest first)
    activeGoals.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      return bDate - aDate;
    });

    res.json({
      success: true,
      goals: activeGoals
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Create a new store goal (store only)
 */
const createGoal = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has a store account
    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active store account to create goals'
      });
    }

    const {
      title,
      description,
      targetDistanceMeters,
      targetDurationMinutes,
      startDate,
      endDate,
      maxParticipants,
      couponCode,
      couponDescription,
      couponDiscount,
      couponDiscountAmount
    } = req.body;

    // Validate that at least one target is set
    if (!targetDistanceMeters && !targetDurationMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Either targetDistanceMeters or targetDurationMinutes must be provided'
      });
    }

    // Build mutation data - Convex doesn't accept null, use undefined instead
    const mutationData = {
      storeId: store._id,
      title,
      startDate,
      couponCode,
      isActive: true
    };
    
    // Only include optional fields if they have values (not null/empty)
    if (description) mutationData.description = description;
    if (targetDistanceMeters !== null && targetDistanceMeters !== undefined) mutationData.targetDistanceMeters = targetDistanceMeters;
    if (targetDurationMinutes !== null && targetDurationMinutes !== undefined) mutationData.targetDurationMinutes = targetDurationMinutes;
    if (endDate) mutationData.endDate = endDate;
    if (maxParticipants !== null && maxParticipants !== undefined) mutationData.maxParticipants = maxParticipants;
    if (couponDescription) mutationData.couponDescription = couponDescription;
    if (couponDiscount !== null && couponDiscount !== undefined) mutationData.couponDiscount = couponDiscount;
    if (couponDiscountAmount !== null && couponDiscountAmount !== undefined) mutationData.couponDiscountAmount = couponDiscountAmount;
    
    const goalId = await convexService.mutation('storeGoals:create', mutationData);

    const goal = await convexService.query('storeGoals:getById', { id: goalId });
    const formattedGoal = formatStoreGoal(goal);

    res.status(201).json({
      success: true,
      goal: formattedGoal
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get goals for a specific store (store only)
 */
const getStoreGoals = async (req, res) => {
  try {
    const userId = req.user.id;

    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active store account'
      });
    }

    const goals = await convexService.query('storeGoals:getByStoreId', { storeId: store._id });

    // Add participant counts
    const goalsWithCounts = await Promise.all(
      goals.map(async (goal) => {
        const allProgress = await convexService.query('userGoalProgress:getByGoalId', { goalId: goal._id });
        const participantCount = allProgress.length;
        const completedCount = allProgress.filter(p => p.isCompleted).length;

        const goalData = formatStoreGoal(goal);
        goalData.participantCount = participantCount;
        goalData.completedCount = completedCount;
        goalData.userProgress = allProgress.map(p => ({
          id: p._id,
          userId: p.userId,
          isCompleted: p.isCompleted,
          completedAt: p.completedAt ? new Date(p.completedAt) : null
        }));

        return goalData;
      })
    );

    // Sort by creation date (newest first)
    goalsWithCounts.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      return bDate - aDate;
    });

    res.json({
      success: true,
      goals: goalsWithCounts
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Get a specific goal with details
 */
const getGoal = async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await convexService.query('storeGoals:getById', { id: goalId });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // Get store data
    const store = await convexService.query('stores:getById', { id: goal.storeId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found for this goal'
      });
    }

    // Get user data for store
    const storeUser = await convexService.query('users:getById', { id: store.userId });

    // Get participant count
    const allProgress = await convexService.query('userGoalProgress:getByGoalId', { goalId: goal._id });
    const participantCount = allProgress.length;

    const goalData = formatStoreGoal({
      ...goal,
      store: { ...store, user: storeUser }
    });

    goalData.participantCount = participantCount;
    goalData.isFull = goal.maxParticipants != null && participantCount >= goal.maxParticipants;

    res.json({
      success: true,
      goal: goalData
    });
  } catch (error) {
    return handleError(error, res);
  }
};

/**
 * Delete a store goal (store only)
 */
const deleteGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { goalId } = req.params;

    // Check if user has a store account
    const store = await convexService.query('stores:getByUserId', { userId });

    if (!store || !store.isActive) {
      return res.status(403).json({
        success: false,
        message: 'You must have an active store account to delete goals'
      });
    }

    // Find the goal and verify it belongs to this store
    const goal = await convexService.query('storeGoals:getById', { id: goalId });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    if (goal.storeId !== store._id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this goal'
      });
    }

    // Check if there are any participants
    const allProgress = await convexService.query('userGoalProgress:getByGoalId', { goalId: goal._id });
    const participantCount = allProgress.length;

    if (participantCount > 0) {
      // Delete related progress records first
      for (const progress of allProgress) {
        await convexService.mutation('userGoalProgress:remove', { id: progress._id });
      }
    }

    // Delete related coupons
    const coupons = await convexService.query('coupons:getByGoalId', { goalId: goal._id });
    for (const coupon of coupons) {
      await convexService.mutation('coupons:remove', { id: coupon._id });
    }

    // Delete the goal
    await convexService.mutation('storeGoals:remove', { id: goalId });

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = {
  getActiveGoals,
  createGoal,
  getStoreGoals,
  getGoal,
  deleteGoal
};

