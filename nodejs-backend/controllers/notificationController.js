const { User } = require('../models');
const notificationScheduler = require('../services/notificationScheduler');

/**
 * @desc    Get user's notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'notificationPreferences']
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      preferences: user.notificationPreferences || {
        weeklyMatches: true,
        newMatches: true,
        newMessages: true,
        profileViews: false,
        promotions: false
      }
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to get notification preferences',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update user's notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid preferences format',
        code: 'INVALID_PREFERENCES'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Merge with existing preferences
    const currentPreferences = user.notificationPreferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences
    };

    await user.update({
      notificationPreferences: updatedPreferences
    });

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to update notification preferences',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Trigger weekly match notifications manually (admin/testing)
 * @route   POST /api/notifications/trigger-weekly-matches
 * @access  Private (should be admin only in production)
 */
const triggerWeeklyMatches = async (req, res) => {
  try {
    console.log('🧪 Manual trigger of weekly match notifications requested');
    
    // In production, add admin check here
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    // Trigger notifications asynchronously
    notificationScheduler.triggerWeeklyMatchNotifications()
      .then(() => {
        console.log('✅ Weekly match notifications completed');
      })
      .catch(error => {
        console.error('❌ Error in weekly match notifications:', error);
      });

    res.json({
      message: 'Weekly match notifications triggered',
      status: 'processing'
    });
  } catch (error) {
    console.error('Trigger weekly matches error:', error);
    res.status(500).json({ 
      error: 'Failed to trigger weekly matches',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Trigger event cleanup manually (admin/testing)
 * @route   POST /api/notifications/trigger-event-cleanup
 * @access  Private (should be admin only in production)
 */
const triggerEventCleanup = async (req, res) => {
  try {
    console.log('🧪 Manual trigger of event cleanup requested');
    
    // In production, add admin check here
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    // Trigger cleanup
    const result = await notificationScheduler.triggerEventCleanup();

    res.json({
      message: 'Event cleanup completed',
      deleted: result?.deleted || 0,
      error: result?.error || null
    });
  } catch (error) {
    console.error('Trigger event cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to trigger event cleanup',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get notification statistics (for testing/admin)
 * @route   GET /api/notifications/stats
 * @access  Private
 */
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      include: ['profile']
    });

    if (!user || !user.profile) {
      return res.status(404).json({ 
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Find potential matches
    const potentialMatches = await notificationScheduler.findTopMatches(user.profile.id, 5);

    res.json({
      userId: user.id,
      email: user.email,
      notificationPreferences: user.notificationPreferences,
      potentialMatches: potentialMatches.length,
      matchDetails: potentialMatches.map(match => ({
        id: match.id,
        firstName: match.firstName,
        age: match.age,
        keywords: match.keyWords?.slice(0, 3) || []
      }))
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get notification stats',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  triggerWeeklyMatches,
  triggerEventCleanup,
  getNotificationStats
};

