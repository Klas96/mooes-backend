/**
 * Strava Controller (Convex Version)
 *
 * This controller uses Convex instead of Sequelize for database operations.
 */

const stravaService = require('../services/stravaService');
const convexService = require('../services/convexService');

/**
 * Helper function to handle errors
 */
const handleError = (error, res) => {
  console.error('Strava error:', error);
  return res.status(500).json({
    error: error.message || 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_SERVER_ERROR'
  });
};

/**
 * @desc    Get Strava authorization URL
 * @route   GET /api/strava/auth-url
 * @access  Private
 */
const getAuthUrl = async (req, res) => {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const redirectUri = process.env.STRAVA_REDIRECT_URI || `${process.env.FRONTEND_URL}/strava-callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Strava OAuth credentials not configured',
        code: 'OAUTH_NOT_CONFIGURED'
      });
    }

    const authUrl = stravaService.getAuthUrl(clientId, redirectUri, ['activity:read']);

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Strava auth URL:', error);
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      code: 'AUTH_URL_ERROR'
    });
  }
};

/**
 * @desc    Handle Strava OAuth callback and store tokens
 * @route   POST /api/strava/callback
 * @access  Private
 */
const handleCallback = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id || req.user._id; // Convex ID from auth middleware

    if (!code) {
      return res.status(400).json({
        error: 'Authorization code is required',
        code: 'MISSING_CODE'
      });
    }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const redirectUri = process.env.STRAVA_REDIRECT_URI || `${process.env.FRONTEND_URL}/strava-callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Strava OAuth credentials not configured',
        code: 'OAUTH_NOT_CONFIGURED'
      });
    }

    const tokens = await stravaService.getTokens(code, clientId, clientSecret, redirectUri);

    // Calculate expiry date from Unix timestamp
    const expiresAt = tokens.expires_at ? tokens.expires_at * 1000 : null; // Convert to milliseconds

    // Store tokens in user record
    await convexService.mutation('users:update', {
      id: userId,
      stravaAccessToken: tokens.access_token,
      stravaRefreshToken: tokens.refresh_token,
      stravaTokenExpiry: expiresAt,
      stravaConnected: true,
      stravaAthleteId: tokens.athlete?.id || null,
    });

    res.json({
      success: true,
      message: 'Strava connected successfully',
      athlete: tokens.athlete,
    });
  } catch (error) {
    console.error('Error handling Strava callback:', error);
    res.status(500).json({
      error: 'Failed to connect Strava',
      code: 'CALLBACK_ERROR',
      message: error.response?.data?.message || error.message
    });
  }
};

/**
 * @desc    Sync activities from Strava
 * @route   POST /api/strava/sync
 * @access  Private
 */
const syncActivities = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // Convex ID from auth middleware
    const { startDate, endDate, activityType } = req.body;

    const user = await convexService.query('users:getById', { id: userId });
    if (!user || !user.stravaConnected) {
      return res.status(400).json({
        error: 'Strava not connected',
        code: 'NOT_CONNECTED'
      });
    }

    // Refresh token if needed
    let accessToken = user.stravaAccessToken;
    let refreshToken = user.stravaRefreshToken;
    
    // Check if token is expired (expires_at is Unix timestamp in seconds)
    const expiresAt = user.stravaTokenExpiry ? Math.floor(user.stravaTokenExpiry / 1000) : null;
    if (stravaService.isTokenExpired(expiresAt)) {
      const clientId = process.env.STRAVA_CLIENT_ID;
      const clientSecret = process.env.STRAVA_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          error: 'Strava OAuth credentials not configured',
          code: 'OAUTH_NOT_CONFIGURED'
        });
      }

      const credentials = await stravaService.refreshToken(refreshToken, clientId, clientSecret);
      accessToken = credentials.access_token;
      refreshToken = credentials.refresh_token;
      
      const newExpiresAt = credentials.expires_at ? credentials.expires_at * 1000 : null; // Convert to milliseconds
      
      await convexService.mutation('users:update', {
        id: userId,
        stravaAccessToken: credentials.access_token,
        stravaRefreshToken: credentials.refresh_token,
        stravaTokenExpiry: newExpiresAt,
      });
    }

    // Get date range
    const after = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : Math.floor((Date.now() - (7 * 24 * 60 * 60 * 1000)) / 1000); // Default: last 7 days
    const before = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

    // Fetch activities from Strava
    const activities = await stravaService.getActivities(accessToken, {
      after,
      before,
      perPage: 200, // Strava allows up to 200 per page
    });

    // Filter by activity type if specified
    let filteredActivities = activities;
    if (activityType) {
      filteredActivities = stravaService.filterActivitiesByType(activities, activityType);
    }

    // Parse activities
    const parsedActivities = stravaService.parseActivities(filteredActivities);

    // Create or update training sessions
    const syncedSessions = [];
    for (const activity of parsedActivities) {
      // Check if session already exists by stravaActivityId
      const existingSession = await convexService.query('trainingSessions:getByStravaActivityId', {
        userId: userId,
        stravaActivityId: activity.stravaActivityId,
      });

      let sessionId;
      if (existingSession) {
        // Update existing session
        sessionId = await convexService.mutation('trainingSessions:update', {
          id: existingSession._id,
          durationMinutes: activity.durationMinutes,
          notes: activity.description || null,
        });
      } else {
        // Create new session
        sessionId = await convexService.mutation('trainingSessions:create', {
          userId: userId,
          title: activity.name,
          date: activity.startTime.toISOString().split('T')[0],
          durationMinutes: activity.durationMinutes,
          notes: activity.description || null,
          goalReached: false, // Will be checked separately
          stravaActivityId: activity.stravaActivityId,
        });
      }

      // Get the session to return
      const session = await convexService.query('trainingSessions:getById', { id: sessionId });
      if (session) {
        syncedSessions.push(session);
      }
    }

    // Update last sync time
    await convexService.mutation('users:update', {
      id: userId,
      lastStravaSync: Date.now(),
    });

    // Check goals for synced sessions
    await checkGoalsForSessions(userId, syncedSessions);

    res.json({
      success: true,
      message: `Synced ${syncedSessions.length} activities`,
      activities: syncedSessions.map(s => ({
        id: s._id,
        title: s.title,
        date: s.date,
        durationMinutes: s.durationMinutes,
        distanceKm: null, // Not stored in trainingSessions currently
        goalReached: s.goalReached,
      }))
    });
  } catch (error) {
    console.error('Error syncing Strava activities:', error);
    res.status(500).json({
      error: 'Failed to sync activities',
      code: 'SYNC_ERROR',
      message: error.response?.data?.message || error.message
    });
  }
};

/**
 * @desc    Check if goals are reached for training sessions
 */
const checkGoalsForSessions = async (userId, sessions) => {
  try {
    const profile = await convexService.query('userProfiles:getByUserId', { userId });
    if (!profile) return;

    const goalDistance = profile.runningGoalDistanceKm;
    const goalDuration = profile.runningGoalDurationMinutes;
    const goalPeriod = profile.goalPeriod || 'daily';

    if (!goalDistance && !goalDuration) {
      return; // No goals set
    }

    // Group sessions by period
    const sessionsByPeriod = {};
    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      let periodKey;

      if (goalPeriod === 'daily') {
        periodKey = sessionDate.toISOString().split('T')[0];
      } else if (goalPeriod === 'weekly') {
        const weekStart = new Date(sessionDate);
        weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else if (goalPeriod === 'monthly') {
        periodKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!sessionsByPeriod[periodKey]) {
        sessionsByPeriod[periodKey] = [];
      }
      sessionsByPeriod[periodKey].push(session);
    }

    // Check goals for each period
    for (const [periodKey, periodSessions] of Object.entries(sessionsByPeriod)) {
      const totalDistance = periodSessions.reduce((sum, s) => sum + (s.distanceKm || 0), 0);
      const totalDuration = periodSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      const distanceGoalReached = goalDistance ? totalDistance >= parseFloat(goalDistance) : true;
      const durationGoalReached = goalDuration ? totalDuration >= goalDuration : true;
      const goalReached = distanceGoalReached && durationGoalReached;

      // Update all sessions in this period
      for (const session of periodSessions) {
        await convexService.mutation('trainingSessions:update', {
          id: session._id,
          goalReached,
        });
      }
    }
  } catch (error) {
    console.error('Error checking goals:', error);
  }
};

/**
 * @desc    Get Strava connection status
 * @route   GET /api/strava/status
 * @access  Private
 */
const getStatus = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // Convex ID from auth middleware
    const user = await convexService.query('users:getById', { id: userId });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      connected: user.stravaConnected || false,
      lastSync: user.lastStravaSync || null,
      athleteId: user.stravaAthleteId || null,
    });
  } catch (error) {
    console.error('Error getting Strava status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      code: 'STATUS_ERROR'
    });
  }
};

/**
 * @desc    Disconnect Strava
 * @route   DELETE /api/strava/disconnect
 * @access  Private
 */
const disconnect = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // Convex ID from auth middleware

    await convexService.mutation('users:update', {
      id: userId,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiry: null,
      stravaConnected: false,
      stravaAthleteId: null,
      lastStravaSync: null,
    });

    res.json({
      success: true,
      message: 'Strava disconnected'
    });
  } catch (error) {
    console.error('Error disconnecting Strava:', error);
    res.status(500).json({
      error: 'Failed to disconnect',
      code: 'DISCONNECT_ERROR'
    });
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  syncActivities,
  getStatus,
  disconnect,
};

