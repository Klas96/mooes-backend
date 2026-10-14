const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
// User goal progress controller exports methods directly (uses Convex or Sequelize automatically)
const userGoalProgressController = require('../controllers/userGoalProgressController');

const router = express.Router();

// Validation for joining a goal
// Note: goalId can be either UUID (legacy) or Convex ID (starts with letter)
const joinGoalValidators = [
  body('goalId')
    .notEmpty()
    .withMessage('goalId is required')
];

// Protected routes
router.post('/join', protect, joinGoalValidators, userGoalProgressController.joinGoal);
router.get('/my-progress', protect, userGoalProgressController.getUserProgress);
// IMPORTANT: More specific routes must come before less specific ones
router.post('/goal/:goalId/mark-complete', protect, userGoalProgressController.markComplete);
router.get('/goal/:goalId', protect, userGoalProgressController.getGoalProgress);

module.exports = router;

// Export the updateProgressForUser function for use in other controllers
module.exports.updateProgressForUser = userGoalProgressController.updateProgressForUser;

