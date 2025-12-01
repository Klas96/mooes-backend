const googleFitService = require('../services/googleFitService');

function createGoogleFitController({ User, UserProfile, TrainingSession }) {
  /**
   * @desc    Get Google Fit authorization URL
   * @route   GET /api/google-fit/auth-url
   * @access  Private
   */
  const getAuthUrl = async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI || `${process.env.FRONTEND_URL}/google-fit-callback`;

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          error: 'Google Fit OAuth credentials not configured',
          code: 'OAUTH_NOT_CONFIGURED'
        });
      }

      googleFitService.initializeOAuth2(clientId, clientSecret, redirectUri);
      const authUrl = googleFitService.getAuthUrl();

      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating Google Fit auth URL:', error);
      res.status(500).json({
        error: 'Failed to generate authorization URL',
        code: 'AUTH_URL_ERROR'
      });
    }
  };

  /**
   * @desc    Handle Google Fit OAuth callback and store tokens
   * @route   POST /api/google-fit/callback
   * @access  Private
   */
  const handleCallback = async (req, res) => {
    try {
      const { code } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json({
          error: 'Authorization code is required',
          code: 'MISSING_CODE'
        });
      }

      const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI || `${process.env.FRONTEND_URL}/google-fit-callback`;

      googleFitService.initializeOAuth2(clientId, clientSecret, redirectUri);
      const tokens = await googleFitService.getTokens(code);

      // Store tokens in user record
      await User.update({
        googleFitAccessToken: tokens.access_token,
        googleFitRefreshToken: tokens.refresh_token,
        googleFitTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleFitConnected: true,
      }, {
        where: { id: userId }
      });

      res.json({
        success: true,
        message: 'Google Fit connected successfully'
      });
    } catch (error) {
      console.error('Error handling Google Fit callback:', error);
      res.status(500).json({
        error: 'Failed to connect Google Fit',
        code: 'CALLBACK_ERROR'
      });
    }
  };

  /**
   * @desc    Sync running activities from Google Fit
   * @route   POST /api/google-fit/sync
   * @access  Private
   */
  const syncActivities = async (req, res) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.body;

      const user = await User.findByPk(userId);
      if (!user || !user.googleFitConnected) {
        return res.status(400).json({
          error: 'Google Fit not connected',
          code: 'NOT_CONNECTED'
        });
      }

      // Refresh token if needed
      let accessToken = user.googleFitAccessToken;
      if (user.googleFitTokenExpiry && new Date(user.googleFitTokenExpiry) < new Date()) {
        const credentials = await googleFitService.refreshTokenIfNeeded(user);
        accessToken = credentials.access_token;
        
        await User.update({
          googleFitAccessToken: credentials.access_token,
          googleFitTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        }, {
          where: { id: userId }
        });
      }

      // Initialize OAuth client with user's token
      const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI || `${process.env.FRONTEND_URL}/google-fit-callback`;

      googleFitService.initializeOAuth2(clientId, clientSecret, redirectUri);
      googleFitService.setCredentials({
        access_token: accessToken,
        refresh_token: user.googleFitRefreshToken,
      });

      // Get date range
      const startTime = startDate ? new Date(startDate).getTime() : Date.now() - (7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      const endTime = endDate ? new Date(endDate).getTime() : Date.now();

      // Fetch activities from Google Fit
      const activityData = await googleFitService.getRunningActivities(startTime, endTime);
      const activities = googleFitService.parseActivityData(activityData);

      // Create or update training sessions
      const syncedSessions = [];
      for (const activity of activities) {
        const [session, created] = await TrainingSession.findOrCreate({
          where: {
            userId: userId,
            googleFitActivityId: activity.id,
          },
          defaults: {
            userId: userId,
            title: activity.name || 'Running',
            date: activity.startTime.toISOString().split('T')[0],
            durationMinutes: activity.durationMinutes,
            distanceKm: activity.distanceKm ? parseFloat(activity.distanceKm.toFixed(2)) : null,
            googleFitActivityId: activity.id,
            goalReached: false, // Will be checked separately
          }
        });

        // Update existing session if needed
        if (!created) {
          await session.update({
            durationMinutes: activity.durationMinutes,
            distanceKm: activity.distanceKm ? parseFloat(activity.distanceKm.toFixed(2)) : null,
          });
        }

        syncedSessions.push(session);
      }

      // Update last sync time
      await User.update({
        lastGoogleFitSync: new Date(),
      }, {
        where: { id: userId }
      });

      // Check goals for synced sessions
      await checkGoalsForSessions(userId, syncedSessions);

      res.json({
        success: true,
        message: `Synced ${syncedSessions.length} activities`,
        activities: syncedSessions.map(s => ({
          id: s.id,
          title: s.title,
          date: s.date,
          durationMinutes: s.durationMinutes,
          distanceKm: s.distanceKm,
          goalReached: s.goalReached,
        }))
      });
    } catch (error) {
      console.error('Error syncing Google Fit activities:', error);
      res.status(500).json({
        error: 'Failed to sync activities',
        code: 'SYNC_ERROR',
        message: error.message
      });
    }
  };

  /**
   * @desc    Check if goals are reached for training sessions
   */
  const checkGoalsForSessions = async (userId, sessions) => {
    try {
      const profile = await UserProfile.findOne({ where: { userId } });
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
          await session.update({ goalReached });
        }
      }
    } catch (error) {
      console.error('Error checking goals:', error);
    }
  };

  /**
   * @desc    Get Google Fit connection status
   * @route   GET /api/google-fit/status
   * @access  Private
   */
  const getStatus = async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId, {
        attributes: ['googleFitConnected', 'lastGoogleFitSync']
      });

      res.json({
        connected: user?.googleFitConnected || false,
        lastSync: user?.lastGoogleFitSync || null,
      });
    } catch (error) {
      console.error('Error getting Google Fit status:', error);
      res.status(500).json({
        error: 'Failed to get status',
        code: 'STATUS_ERROR'
      });
    }
  };

  /**
   * @desc    Disconnect Google Fit
   * @route   DELETE /api/google-fit/disconnect
   * @access  Private
   */
  const disconnect = async (req, res) => {
    try {
      const userId = req.user.id;

      await User.update({
        googleFitAccessToken: null,
        googleFitRefreshToken: null,
        googleFitTokenExpiry: null,
        googleFitConnected: false,
        lastGoogleFitSync: null,
      }, {
        where: { id: userId }
      });

      res.json({
        success: true,
        message: 'Google Fit disconnected'
      });
    } catch (error) {
      console.error('Error disconnecting Google Fit:', error);
      res.status(500).json({
        error: 'Failed to disconnect',
        code: 'DISCONNECT_ERROR'
      });
    }
  };

  return {
    getAuthUrl,
    handleCallback,
    syncActivities,
    getStatus,
    disconnect,
  };
}

module.exports = createGoogleFitController;

