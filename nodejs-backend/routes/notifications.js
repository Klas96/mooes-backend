const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotificationPreferences,
  updateNotificationPreferences,
  triggerWeeklyMatches,
  triggerEventCleanup,
  getNotificationStats
} = require('../controllers/notificationController');

// @route   GET /api/notifications/preferences
// @desc    Get user's notification preferences
// @access  Private
router.get('/preferences', protect, getNotificationPreferences);

// @route   PUT /api/notifications/preferences
// @desc    Update user's notification preferences
// @access  Private
router.put('/preferences', protect, updateNotificationPreferences);

// @route   POST /api/notifications/trigger-weekly-matches
// @desc    Manually trigger weekly match notifications (testing/admin)
// @access  Private
router.post('/trigger-weekly-matches', protect, triggerWeeklyMatches);

// @route   POST /api/notifications/trigger-event-cleanup
// @desc    Manually trigger event cleanup (testing/admin)
// @access  Private
router.post('/trigger-event-cleanup', protect, triggerEventCleanup);

// @route   GET /api/notifications/stats
// @desc    Get notification statistics for current user
// @access  Private
router.get('/stats', protect, getNotificationStats);

module.exports = router;

