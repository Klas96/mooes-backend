const express = require('express');
const { protect } = require('../middleware/auth');
const createGoogleFitController = require('../controllers/googleFitController');
const { User, UserProfile, TrainingSession } = require('../models');

const router = express.Router();
const googleFitController = createGoogleFitController({ User, UserProfile, TrainingSession });

// All routes require authentication
router.get('/auth-url', protect, googleFitController.getAuthUrl);
router.post('/callback', protect, googleFitController.handleCallback);
router.post('/sync', protect, googleFitController.syncActivities);
router.get('/status', protect, googleFitController.getStatus);
router.delete('/disconnect', protect, googleFitController.disconnect);

module.exports = router;

