const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { Store, StoreGoal, UserGoalProgress, User } = require('../models');
const storeGoalController = require('../controllers/storeGoalController')({ Store, StoreGoal, UserGoalProgress, User });

const router = express.Router();

// Validation for creating a goal
const createGoalValidators = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string'),
  body('targetDistanceMeters')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('targetDistanceMeters must be a positive integer'),
  body('targetDurationMinutes')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('targetDurationMinutes must be a positive integer'),
  body('startDate')
    .isISO8601()
    .withMessage('startDate must be in ISO 8601 format (YYYY-MM-DD)'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('endDate must be in ISO 8601 format (YYYY-MM-DD)'),
  body('maxParticipants')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('maxParticipants must be a positive integer'),
  body('couponCode')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('couponCode must be between 1 and 50 characters'),
  body('couponDescription')
    .optional({ nullable: true })
    .isString()
    .withMessage('couponDescription must be a string'),
  body('couponDiscount')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('couponDiscount must be between 0 and 100'),
  body('couponDiscountAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('couponDiscountAmount must be a positive number')
];

// Public routes
router.get('/active', storeGoalController.getActiveGoals);
router.get('/:goalId', storeGoalController.getGoal);

// Protected routes (store only for creating)
router.post('/', protect, createGoalValidators, storeGoalController.createGoal);
router.get('/store/my-goals', protect, storeGoalController.getStoreGoals);

module.exports = router;

