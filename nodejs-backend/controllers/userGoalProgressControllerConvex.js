/**
 * User Goal Progress Controller (Convex Version)
 *
 * This controller uses Convex instead of Sequelize for database operations.
 */

const convexService = require('../services/convexService');
const { formatStoreGoal, formatStore, formatUser } = require('../helpers/convexHelpers');

/**
 * Helper function to handle errors
 */
const handleError = (error, res) => {
  console.error('User goal progress error:', error);
  return res.status(500).json({
    success: false,
    message: error.message || 'An unexpected error occurred. Please try again.',
    error: error.message || 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * Format user goal progress for response
 */
const formatProgress = (progress) => {
  if (!progress) return null;
  
  const formatted = {
    id: progress._id,
    _id: progress._id,
    userId: progress.userId,
    goalId: progress.goalId,
    currentDistanceMeters: progress.currentDistanceMeters || 0,
    currentDurationMinutes: progress.currentDurationMinutes || 0,
    isCompleted: progress.isCompleted || false,
    completedAt: progress.completedAt ? new Date(progress.completedAt) : null,
    couponActivated: progress.couponActivated || false,
    couponActivatedAt: progress.couponActivatedAt ? new Date(progress.couponActivatedAt) : null,
    createdAt: progress.createdAt ? new Date(progress.createdAt) : null,
    updatedAt: progress.updatedAt ? new Date(progress.updatedAt) : null,
  };
  
  // Include goal if present
  if (progress.goal) {
    formatted.goal = formatStoreGoal(progress.goal);
    
    // Calculate progress percentage
    let progressPercent = 0;
    if (progress.goal.targetDistanceMeters) {
      progressPercent = Math.min(100, (formatted.currentDistanceMeters / progress.goal.targetDistanceMeters) * 100);
    } else if (progress.goal.targetDurationMinutes) {
      progressPercent = Math.min(100, (formatted.currentDurationMinutes / progress.goal.targetDurationMinutes) * 100);
    }
    formatted.progressPercent = Math.round(progressPercent);
    
    // Include store if present in goal
    if (progress.goal.store) {
      formatted.goal.store = formatStore(progress.goal.store);
    }
  }
  
  // Add toJSON method for compatibility
  formatted.toJSON = function() {
    return { ...this };
  };
  
  return formatted;
};

/**
 * Join a goal (user starts tracking progress)
 */
const joinGoal = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { goalId } = req.body;

    // Check if goal exists and is active
    const goal = await convexService.query('storeGoals:getById', { id: goalId });
    if (!goal || !goal.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found or not active'
      });
    }

    // Check if goal is still accepting participants
    if (goal.maxParticipants != null) {
      const allProgress = await convexService.query('userGoalProgress:getByGoalId', { goalId });
      const participantCount = allProgress.length;
      if (participantCount >= goal.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Goal is full'
        });
      }
    }

    // Check if user already joined
    const existing = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });

    if (existing) {
      // Get goal and store data for response
      const goalWithStore = await convexService.query('storeGoals:getById', { id: goalId });
      const store = goalWithStore ? await convexService.query('stores:getById', { id: goalWithStore.storeId }) : null;
      const enrichedProgress = { ...existing, goal: goalWithStore ? { ...goalWithStore, store } : null };
      
      return res.json({
        success: true,
        progress: formatProgress(enrichedProgress),
        message: 'You are already participating in this goal'
      });
    }

    // Create progress entry using upsert mutation
    const progressId = await convexService.mutation('userGoalProgress:upsert', {
      userId,
      goalId,
      currentDistanceMeters: 0,
      currentDurationMinutes: 0,
      isCompleted: false,
      couponActivated: false
    });

    // Calculate initial progress from existing training sessions
    await updateProgressForUser(userId, goalId);

    // Fetch the created progress with goal data
    const progress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });
    
    // Enrich with goal and store data
    const goalWithStore = await convexService.query('storeGoals:getById', { id: goalId });
    const store = goalWithStore ? await convexService.query('stores:getById', { id: goalWithStore.storeId }) : null;
    const enrichedProgress = { ...progress, goal: goalWithStore ? { ...goalWithStore, store } : null };

    res.status(201).json({
      success: true,
      progress: formatProgress(enrichedProgress)
    });
  } catch (error) {
    console.error('Error joining goal:', error);
    return handleError(error, res);
  }
};

/**
 * Get user's progress on all goals
 */
const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const progressList = await convexService.query('userGoalProgress:getByUserId', { userId });

    // Enrich with goal and store data
    const enrichedProgress = await Promise.all(
      progressList.map(async (progress) => {
        const goal = await convexService.query('storeGoals:getById', { id: progress.goalId });
        if (!goal) return null;
        
        const store = await convexService.query('stores:getById', { id: goal.storeId });
        const enriched = { ...progress, goal: { ...goal, store } };
        return formatProgress(enriched);
      })
    );

    // Filter out nulls and sort by creation date (newest first)
    const filteredProgress = enrichedProgress.filter(p => p !== null);
    filteredProgress.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.getTime() : 0;
      const bDate = b.createdAt ? b.createdAt.getTime() : 0;
      return bDate - aDate;
    });

    res.json({
      success: true,
      progress: filteredProgress
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return handleError(error, res);
  }
};

/**
 * Get progress for a specific goal
 */
const getGoalProgress = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { goalId } = req.params;

    const progress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'You are not participating in this goal'
      });
    }

    // Enrich with goal and store data
    const goal = await convexService.query('storeGoals:getById', { id: goalId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }
    
    const store = await convexService.query('stores:getById', { id: goal.storeId });
    const enrichedProgress = { ...progress, goal: { ...goal, store } };

    res.json({
      success: true,
      progress: formatProgress(enrichedProgress)
    });
  } catch (error) {
    console.error('Error fetching goal progress:', error);
    return handleError(error, res);
  }
};

/**
 * Update progress for a user (called when training sessions are added/updated)
 */
const updateProgressForUser = async (userId, goalId) => {
  try {
    console.log(`🚀 updateProgressForUser called: userId=${userId}, goalId=${goalId}`);
    const progress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });

    if (!progress) {
      console.log(`⚠️  No progress found for user ${userId}, goal ${goalId} - user may not have joined`);
      return; // User not participating in this goal
    }
    
    console.log(`✅ Found progress record: ${progress._id}`);

    const goal = await convexService.query('storeGoals:getById', { id: goalId });
    if (!goal || !goal.isActive) {
      return;
    }

    // Get all training sessions for this user since goal start date
    const startDate = goal.startDate; // ISO date string (YYYY-MM-DD)
    const allSessions = await convexService.query('trainingSessions:getByUserId', { userId });

    console.log(`🔍 Filtering sessions - Goal start date: "${startDate}"`);
    console.log(`  - Total sessions found: ${allSessions.length}`);
    
    // Log session details
    for (const s of allSessions) {
      console.log(`  - Session ${s._id}: date="${s.date}", distanceKm=${s.distanceKm}, durationMinutes=${s.durationMinutes}`);
    }

    // Filter sessions by date (sessions on or after goal start date)
    // Compare date strings directly (YYYY-MM-DD format)
    const sessions = allSessions.filter(session => {
      const isIncluded = session.date >= startDate;
      console.log(`  - Session ${session._id}: date="${session.date}", included=${isIncluded}`);
      return isIncluded;
    });

    // Calculate totals
    let totalDistanceMeters = 0;
    let totalDurationMinutes = 0;

    console.log(`📊 Updating progress for user ${userId}, goal ${goalId}`);
    console.log(`  - Goal start date: ${startDate}`);
    console.log(`  - Total sessions found: ${allSessions.length}`);
    console.log(`  - Sessions after filtering by date: ${sessions.length}`);

    for (const session of sessions) {
      // Calculate distance in meters (distanceKm is stored in kilometers)
      if (session.distanceKm) {
        const meters = Math.round(session.distanceKm * 1000);
        totalDistanceMeters += meters;
        console.log(`  - Session ${session._id}: ${session.distanceKm} km = ${meters} m`);
      }
      if (session.durationMinutes) {
        totalDurationMinutes += session.durationMinutes;
        console.log(`  - Session ${session._id}: ${session.durationMinutes} minutes`);
      }
    }

    console.log(`  - Total distance: ${totalDistanceMeters} m`);
    console.log(`  - Total duration: ${totalDurationMinutes} minutes`);

    // Check if goal requirements are met
    let requirementsMet = true;
    
    if (goal.targetDistanceMeters != null && totalDistanceMeters < goal.targetDistanceMeters) {
      requirementsMet = false;
    }
    
    if (goal.targetDurationMinutes != null && totalDurationMinutes < goal.targetDurationMinutes) {
      requirementsMet = false;
    }

    // Build update data
    const updateData = {
      id: progress._id,
      currentDistanceMeters: totalDistanceMeters,
      currentDurationMinutes: totalDurationMinutes
    };

    // Automatically complete if requirements are met and not already completed
    if (requirementsMet && !progress.isCompleted) {
      const completedAt = Date.now();
      updateData.isCompleted = true;
      updateData.completedAt = completedAt;

      // Activate coupon if not already activated
      if (!progress.couponActivated) {
        updateData.couponActivated = true;
        updateData.couponActivatedAt = completedAt;

        // Create coupon for the user
        try {
          const expiresAt = goal.endDate ? new Date(goal.endDate).getTime() : undefined;
          
          await convexService.mutation('coupons:create', {
            userId,
            goalId,
            storeId: goal.storeId,
            code: goal.couponCode,
            discount: goal.couponDiscount,
            discountAmount: goal.couponDiscountAmount,
            isUsed: false,
            expiresAt
          });
        } catch (error) {
          console.error('Error creating coupon when completing goal:', error);
          // Continue even if coupon creation fails
        }
      }
    }

    await convexService.mutation('userGoalProgress:update', updateData);
    console.log(`✅ Progress updated: ${JSON.stringify(updateData)}`);
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};

/**
 * Manually mark a goal as complete
 */
const markComplete = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { goalId } = req.params;

    // Find user's progress for this goal
    const progress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'You are not participating in this goal'
      });
    }

    // Get goal data
    const goal = await convexService.query('storeGoals:getById', { id: goalId });
    if (!goal || !goal.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This goal is not active'
      });
    }

    // If already completed, return success
    if (progress.isCompleted) {
      const store = await convexService.query('stores:getById', { id: goal.storeId });
      const enrichedProgress = { ...progress, goal: { ...goal, store } };
      
      return res.json({
        success: true,
        progress: formatProgress(enrichedProgress),
        message: 'Goal is already marked as complete'
      });
    }

    // First, update progress from training sessions to ensure we have the latest data
    await updateProgressForUser(userId, goalId);

    // Fetch updated progress after recalculating
    const updatedProgress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });

    if (!updatedProgress) {
      return res.status(404).json({
        success: false,
        message: 'Progress not found after update'
      });
    }

    // Check if goal requirements are actually met
    let requirementsMet = true;
    let missingRequirements = [];

    if (goal.targetDistanceMeters != null) {
      const currentDistance = updatedProgress.currentDistanceMeters || 0;
      if (currentDistance < goal.targetDistanceMeters) {
        requirementsMet = false;
        const remainingKm = ((goal.targetDistanceMeters - currentDistance) / 1000).toFixed(2);
        missingRequirements.push(`${remainingKm} km`);
      }
    }

    if (goal.targetDurationMinutes != null) {
      const currentDuration = updatedProgress.currentDurationMinutes || 0;
      if (currentDuration < goal.targetDurationMinutes) {
        requirementsMet = false;
        const remainingMinutes = goal.targetDurationMinutes - currentDuration;
        missingRequirements.push(`${remainingMinutes} minutes`);
      }
    }

    if (!requirementsMet) {
      const store = await convexService.query('stores:getById', { id: goal.storeId });
      const enrichedProgress = { ...updatedProgress, goal: { ...goal, store } };
      
      return res.status(400).json({
        success: false,
        message: `Challenge requirements not met. You still need: ${missingRequirements.join(' and ')}`,
        progress: formatProgress(enrichedProgress)
      });
    }

    // Mark as completed
    const completedAt = Date.now();
    await convexService.mutation('userGoalProgress:update', {
      id: updatedProgress._id,
      isCompleted: true,
      completedAt
    });

    // Activate coupon if not already activated
    if (!updatedProgress.couponActivated) {
      const couponActivatedAt = Date.now();
      await convexService.mutation('userGoalProgress:update', {
        id: updatedProgress._id,
        couponActivated: true,
        couponActivatedAt
      });

      // Create coupon
      await convexService.mutation('coupons:create', {
        userId,
        goalId,
        storeId: goal.storeId,
        code: goal.couponCode,
        description: goal.couponDescription,
        discount: goal.couponDiscount,
        discountAmount: goal.couponDiscountAmount,
        isUsed: false,
        expiresAt: goal.endDate ? new Date(goal.endDate).getTime() : undefined
      });
    }

    // Fetch final progress with goal and store data
    const finalProgress = await convexService.query('userGoalProgress:getByUserIdAndGoalId', {
      userId,
      goalId
    });
    
    const store = await convexService.query('stores:getById', { id: goal.storeId });
    const enrichedProgress = { ...finalProgress, goal: { ...goal, store } };

    res.json({
      success: true,
      progress: formatProgress(enrichedProgress),
      message: 'Goal marked as complete! Your coupon has been activated.'
    });
  } catch (error) {
    console.error('Error marking goal as complete:', error);
    console.error('Error stack:', error.stack);
    return handleError(error, res);
  }
};

module.exports = {
  joinGoal,
  getUserProgress,
  getGoalProgress,
  markComplete,
  updateProgressForUser
};
