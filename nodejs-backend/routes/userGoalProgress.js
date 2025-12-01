const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { UserGoalProgress, StoreGoal, Store, User, TrainingSession, Coupon } = require('../models');
const userGoalProgressController = require('../controllers/userGoalProgressController')({ UserGoalProgress, StoreGoal, Store, User, TrainingSession, Coupon });

const router = express.Router();

// Validation for joining a goal
const joinGoalValidators = [
  body('goalId')
    .isUUID()
    .withMessage('goalId must be a valid UUID')
];

// Protected routes
router.post('/join', protect, joinGoalValidators, userGoalProgressController.joinGoal);
router.get('/my-progress', protect, userGoalProgressController.getUserProgress);
router.get('/goal/:goalId', protect, userGoalProgressController.getGoalProgress);

module.exports = router;

// Export the updateProgressForUser function for use in other controllers
module.exports.updateProgressForUser = userGoalProgressController.updateProgressForUser;

