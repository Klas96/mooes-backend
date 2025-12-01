const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { Store, User } = require('../models');
const storeController = require('../controllers/storeController')({ Store, User });

const router = express.Router();

// Validation for creating a store
const createStoreValidators = [
  body('storeName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Store name must be between 1 and 200 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string'),
  body('location')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters'),
  body('latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('logo')
    .optional({ nullable: true })
    .isString()
    .isURL()
    .withMessage('Logo must be a valid URL')
];

// Protected routes
router.post('/', protect, createStoreValidators, storeController.createStore);
router.get('/my-store', protect, storeController.getMyStore);
router.put('/my-store', protect, storeController.updateMyStore);

module.exports = router;

