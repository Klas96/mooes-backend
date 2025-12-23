const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { Coupon, StoreGoal, Store, User } = require('../models');
const couponController = require('../controllers/couponController')({ Coupon, StoreGoal, Store, User });

const router = express.Router();

// Validation for creating a coupon
const createCouponValidators = [
  body('code')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Coupon code must be between 1 and 50 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string'),
  body('discount')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  body('discountAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  body('expiresAt')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format'),
  body('userEmail')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('User email must be a valid email address'),
  body('userId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
];

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

// Protected routes
// IMPORTANT: Specific routes must come before parameterized routes
router.post('/', protect, createCouponValidators, handleValidationErrors, couponController.createCoupon);
router.post('/redeem', protect, [body('code').notEmpty().withMessage('Coupon code is required')], handleValidationErrors, couponController.redeemCoupon);
router.post('/:couponId/assign', protect, [body('userEmail').isEmail().withMessage('Valid user email is required')], handleValidationErrors, couponController.assignCoupon);
router.get('/my-coupons', protect, couponController.getUserCoupons);
router.get('/store/my-coupons', protect, couponController.getStoreCoupons);
router.post('/:couponId/use', protect, couponController.useCoupon);
router.delete('/:couponId', protect, couponController.deleteCoupon);
router.get('/:couponId', protect, couponController.getCoupon);

// Log route registration
console.log('✅ Coupon routes configured: POST /, POST /redeem, GET /my-coupons, GET /store/my-coupons, POST /:couponId/use, DELETE /:couponId, GET /:couponId');

module.exports = router;

