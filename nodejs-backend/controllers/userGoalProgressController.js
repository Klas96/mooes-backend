const { Op } = require('sequelize');

function createUserGoalProgressController({ UserGoalProgress, StoreGoal, Store, User, TrainingSession, Coupon }) {
  // Join a goal (user starts tracking progress)
  const joinGoal = async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.body;

      // Check if goal exists and is active
      const goal = await StoreGoal.findByPk(goalId);
      if (!goal || !goal.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found or not active'
        });
      }

      // Check if goal is still accepting participants
      if (goal.maxParticipants != null) {
        const participantCount = await UserGoalProgress.count({
          where: { goalId }
        });
        if (participantCount >= goal.maxParticipants) {
          return res.status(400).json({
            success: false,
            message: 'Goal is full'
          });
        }
      }

      // Check if user already joined
      const existing = await UserGoalProgress.findOne({
        where: { userId, goalId }
      });

      if (existing) {
        return res.json({
          success: true,
          progress: existing.toJSON(),
          message: 'You are already participating in this goal'
        });
      }

      // Create progress entry
      const progress = await UserGoalProgress.create({
        userId,
        goalId,
        currentDistanceMeters: 0,
        currentDurationMinutes: 0,
        isCompleted: false,
        couponActivated: false
      });

      // Calculate initial progress from existing training sessions
      await updateProgressForUser(userId, goalId);

      res.status(201).json({
        success: true,
        progress: progress.toJSON()
      });
    } catch (error) {
      console.error('Error joining goal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join goal',
        error: error.message
      });
    }
  };

  // Get user's progress on all goals
  const getUserProgress = async (req, res) => {
    try {
      const userId = req.user.id;

      const progressList = await UserGoalProgress.findAll({
        where: { userId },
        include: [
          {
            model: StoreGoal,
            as: 'goal',
            include: [
              {
                model: Store,
                as: 'store',
                attributes: ['id', 'storeName', 'logo', 'location']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const progressWithDetails = progressList.map(p => {
        const progressData = p.toJSON();
        const goal = progressData.goal;
        
        // Calculate progress percentage
        let progressPercent = 0;
        if (goal.targetDistanceMeters) {
          progressPercent = Math.min(100, (progressData.currentDistanceMeters / goal.targetDistanceMeters) * 100);
        } else if (goal.targetDurationMinutes) {
          progressPercent = Math.min(100, (progressData.currentDurationMinutes / goal.targetDurationMinutes) * 100);
        }
        progressData.progressPercent = Math.round(progressPercent);

        return progressData;
      });

      res.json({
        success: true,
        progress: progressWithDetails
      });
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user progress',
        error: error.message
      });
    }
  };

  // Get progress for a specific goal
  const getGoalProgress = async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;

      const progress = await UserGoalProgress.findOne({
        where: { userId, goalId },
        include: [
          {
            model: StoreGoal,
            as: 'goal',
            include: [
              {
                model: Store,
                as: 'store',
                attributes: ['id', 'storeName', 'logo', 'location']
              }
            ]
          }
        ]
      });

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'You are not participating in this goal'
        });
      }

      const progressData = progress.toJSON();
      const goal = progressData.goal;
      
      // Calculate progress percentage
      let progressPercent = 0;
      if (goal.targetDistanceMeters) {
        progressPercent = Math.min(100, (progressData.currentDistanceMeters / goal.targetDistanceMeters) * 100);
      } else if (goal.targetDurationMinutes) {
        progressPercent = Math.min(100, (progressData.currentDurationMinutes / goal.targetDurationMinutes) * 100);
      }
      progressData.progressPercent = Math.round(progressPercent);

      res.json({
        success: true,
        progress: progressData
      });
    } catch (error) {
      console.error('Error fetching goal progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch goal progress',
        error: error.message
      });
    }
  };

  // Update progress for a user (called when training sessions are added/updated)
  const updateProgressForUser = async (userId, goalId) => {
    try {
      const progress = await UserGoalProgress.findOne({
        where: { userId, goalId }
      });

      if (!progress) {
        return; // User not participating in this goal
      }

      const goal = await StoreGoal.findByPk(goalId);
      if (!goal || !goal.isActive) {
        return;
      }

      // Get all training sessions for this user since goal start date
      const startDate = new Date(goal.startDate);
      const sessions = await TrainingSession.findAll({
        where: {
          userId,
          date: {
            [Op.gte]: startDate
          }
        }
      });

      // Calculate totals
      let totalDistanceMeters = 0;
      let totalDurationMinutes = 0;

      for (const session of sessions) {
        if (session.distanceKm) {
          totalDistanceMeters += Math.round(session.distanceKm * 1000);
        }
        if (session.durationMinutes) {
          totalDurationMinutes += session.durationMinutes;
        }
      }

      // Check if goal is completed
      let isCompleted = false;
      if (goal.targetDistanceMeters) {
        isCompleted = totalDistanceMeters >= goal.targetDistanceMeters;
      } else if (goal.targetDurationMinutes) {
        isCompleted = totalDurationMinutes >= goal.targetDurationMinutes;
      }

      // Update progress
      const updateData = {
        currentDistanceMeters: totalDistanceMeters,
        currentDurationMinutes: totalDurationMinutes,
        isCompleted
      };

      if (isCompleted && !progress.isCompleted) {
        updateData.completedAt = new Date();
        
        // Activate coupon if not already activated
        if (!progress.couponActivated) {
          updateData.couponActivated = true;
          updateData.couponActivatedAt = new Date();

          // Create coupon
          await Coupon.create({
            userId,
            goalId,
            storeId: goal.storeId,
            code: goal.couponCode,
            description: goal.couponDescription,
            discount: goal.couponDiscount,
            discountAmount: goal.couponDiscountAmount,
            isUsed: false,
            expiresAt: goal.endDate ? new Date(goal.endDate) : null
          });
        }
      }

      await progress.update(updateData);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Export updateProgressForUser as a helper that can be called from other controllers
  const updateProgressForUserHelper = updateProgressForUser;

  return {
    joinGoal,
    getUserProgress,
    getGoalProgress,
    updateProgressForUser: updateProgressForUserHelper
  };
}

module.exports = createUserGoalProgressController;

