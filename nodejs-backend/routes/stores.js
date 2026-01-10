const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { Store, User } = require('../models');
const storeController = require('../controllers/storeController')({ Store, User });

const router = express.Router();

// Configure multer for file uploads
// Use memory storage for Vercel (serverless) or disk storage for traditional servers
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const storage = isVercel
  ? multer.memoryStorage() // Use memory storage on Vercel
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, 'uploads/');
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'store-profile-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

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
  body('website')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Website must be a valid URL (including http:// or https://)'),
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

// Protected routes (must come before /:storeId to avoid route conflict)
router.post('/', protect, createStoreValidators, storeController.createStore);
router.get('/my-store', protect, storeController.getMyStore);
router.put('/my-store', protect, storeController.updateMyStore);
router.post('/upload-profile-picture', protect, upload.single('profilePicture'), storeController.uploadProfilePicture);

// Public routes (must come after specific routes like /my-store)
router.get('/:storeId', storeController.getStoreById);

module.exports = router;

