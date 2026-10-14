const express = require('express');
const { protect } = require('../middleware/auth');
const stravaController = require('../controllers/stravaController');

const router = express.Router();

// All routes require authentication
router.get('/auth-url', protect, stravaController.getAuthUrl);
router.post('/callback', protect, stravaController.handleCallback);
router.post('/sync', protect, stravaController.syncActivities);
router.get('/status', protect, stravaController.getStatus);
router.delete('/disconnect', protect, stravaController.disconnect);

module.exports = router;

