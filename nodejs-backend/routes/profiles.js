const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { protect, requireProfile } = require('../middleware/auth');
const {
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  deleteImage,
  updateImageOrder,
  hideAccount,
  unhideAccount,
  getAccountVisibility
} = require('../controllers/profileControllerTraining');

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
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Validation rules
const updateProfileValidation = [
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('keyWords')
    .optional()
    .isArray()
    .withMessage('Key words must be an array')
    .custom((value) => {
      if (!value) return true; // Allow null/undefined
      
      if (!Array.isArray(value)) {
        throw new Error('Key words must be an array');
      }
      
      if (value.length > 20) {
        throw new Error('Maximum 20 keywords allowed');
      }
      
      for (let i = 0; i < value.length; i++) {
        const keyword = value[i];
        if (typeof keyword !== 'string') {
          throw new Error(`Keyword at index ${i} must be a string`);
        }
        
        if (keyword.trim().length === 0) {
          throw new Error(`Keyword at index ${i} cannot be empty`);
        }
        
        if (keyword.length > 50) {
          throw new Error(`Keyword at index ${i} is too long (maximum 50 characters)`);
        }
        
        // Check for valid characters
        const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
        if (!validPattern.test(keyword)) {
          throw new Error(`Keyword at index ${i} contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed.`);
        }
      }
      
      return true;
    }),
];

// Routes
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateProfileValidation, updateMyProfile);
router.post('/upload-picture', protect, upload.single('image'), uploadProfilePicture);
router.delete('/images/:imageId', protect, deleteImage);
router.put('/images/order', protect, updateImageOrder);

// Account visibility routes (must come before /:id route)
router.post('/hide', protect, requireProfile, hideAccount);
router.post('/unhide', protect, requireProfile, unhideAccount);
router.get('/visibility', protect, requireProfile, getAccountVisibility);

module.exports = router; 