const { Op } = require('sequelize');

function createStoreGoalController({ Store, StoreGoal, UserGoalProgress, User }) {
  // Get all active store goals (for users to browse)
  const getActiveGoals = async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const goals = await StoreGoal.findAll({
        where: {
          isActive: true,
          startDate: {
            [Op.lte]: today
          },
          [Op.or]: [
            { endDate: null },
            { endDate: { [Op.gte]: today } }
          ]
        },
        include: [
          {
            model: Store,
            as: 'store',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ],
            attributes: ['id', 'storeName', 'logo', 'location']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // Get participant counts for each goal
      const goalsWithCounts = await Promise.all(
        goals.map(async (goal) => {
          const participantCount = await UserGoalProgress.count({
            where: { goalId: goal.id }
          });
          
          const goalData = goal.toJSON();
          goalData.participantCount = participantCount;
          goalData.isFull = goal.maxParticipants != null && participantCount >= goal.maxParticipants;
          
          return goalData;
        })
      );

      res.json({
        success: true,
        goals: goalsWithCounts
      });
    } catch (error) {
      console.error('Error fetching active goals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active goals',
        error: error.message
      });
    }
  };

  // Create a new store goal (store only)
  const createGoal = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user has a store account
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
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

      const goal = await StoreGoal.create({
        storeId: store.id,
        title,
        description,
        targetDistanceMeters: targetDistanceMeters || null,
        targetDurationMinutes: targetDurationMinutes || null,
        startDate,
        endDate: endDate || null,
        maxParticipants: maxParticipants || null,
        couponCode,
        couponDescription,
        couponDiscount: couponDiscount || null,
        couponDiscountAmount: couponDiscountAmount || null,
        isActive: true
      });

      res.status(201).json({
        success: true,
        goal: goal.toJSON()
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create goal',
        error: error.message
      });
    }
  };

  // Get goals for a specific store (store only)
  const getStoreGoals = async (req, res) => {
    try {
      const userId = req.user.id;
      
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You must have an active store account'
        });
      }

      const goals = await StoreGoal.findAll({
        where: { storeId: store.id },
        include: [
          {
            model: UserGoalProgress,
            as: 'userProgress',
            attributes: ['id', 'userId', 'isCompleted', 'completedAt']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Add participant counts
      const goalsWithCounts = await Promise.all(
        goals.map(async (goal) => {
          const participantCount = await UserGoalProgress.count({
            where: { goalId: goal.id }
          });
          const completedCount = await UserGoalProgress.count({
            where: { goalId: goal.id, isCompleted: true }
          });
          
          const goalData = goal.toJSON();
          goalData.participantCount = participantCount;
          goalData.completedCount = completedCount;
          
          return goalData;
        })
      );

      res.json({
        success: true,
        goals: goalsWithCounts
      });
    } catch (error) {
      console.error('Error fetching store goals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store goals',
        error: error.message
      });
    }
  };

  // Get a specific goal with details
  const getGoal = async (req, res) => {
    try {
      const { goalId } = req.params;

      const goal = await StoreGoal.findByPk(goalId, {
        include: [
          {
            model: Store,
            as: 'store',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ],
            attributes: ['id', 'storeName', 'logo', 'location', 'description']
          }
        ]
      });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      const participantCount = await UserGoalProgress.count({
        where: { goalId: goal.id }
      });

      const goalData = goal.toJSON();
      goalData.participantCount = participantCount;
      goalData.isFull = goal.maxParticipants != null && participantCount >= goal.maxParticipants;

      res.json({
        success: true,
        goal: goalData
      });
    } catch (error) {
      console.error('Error fetching goal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch goal',
        error: error.message
      });
    }
  };

  // Delete a store goal (store only)
  const deleteGoal = async (req, res) => {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;

      // Check if user has a store account
      const store = await Store.findOne({
        where: { userId, isActive: true }
      });

      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'You must have an active store account to delete goals'
        });
      }

      // Find the goal and verify it belongs to this store
      const goal = await StoreGoal.findOne({
        where: { id: goalId, storeId: store.id }
      });

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found or you do not have permission to delete it'
        });
      }

      // Check if there are any participants
      const participantCount = await UserGoalProgress.count({
        where: { goalId: goal.id }
      });

      if (participantCount > 0) {
        // Optionally, we could still allow deletion but warn the user
        // For now, we'll allow deletion even with participants
        // The CASCADE delete will handle UserGoalProgress records
      }

      // Delete the goal (CASCADE will handle related UserGoalProgress and Coupons)
      await goal.destroy();

      res.json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete goal',
        error: error.message
      });
    }
  };

  return {
    getActiveGoals,
    createGoal,
    getStoreGoals,
    getGoal,
    deleteGoal
  };
}

module.exports = createStoreGoalController;

