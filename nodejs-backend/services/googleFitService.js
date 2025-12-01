const { google } = require('googleapis');

class GoogleFitService {
  constructor() {
    this.oauth2Client = null;
  }

  /**
   * Initialize OAuth2 client for Google Fit
   */
  initializeOAuth2(clientId, clientSecret, redirectUri) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    return this.oauth2Client;
  }

  /**
   * Get authorization URL for Google Fit OAuth
   */
  getAuthUrl(scopes = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.activity.write',
    'https://www.googleapis.com/auth/fitness.location.read'
  ]) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Set credentials for API calls
   */
  setCredentials(tokens) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token if expired
   */
  async refreshTokenIfNeeded(user) {
    if (!user.googleFitRefreshToken) {
      throw new Error('No refresh token available');
    }

    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    this.oauth2Client.setCredentials({
      refresh_token: user.googleFitRefreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  /**
   * Get running activities from Google Fit
   */
  async getRunningActivities(startTimeMillis, endTimeMillis) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });

    // Data source for running activities
    const dataSourceId = 'derived:com.google.distance.delta:com.google.android.gms:merge_distance';
    const activityType = 8; // Running

    try {
      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.distance.delta',
            dataSourceId: dataSourceId,
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
          startTimeMillis: startTimeMillis,
          endTimeMillis: endTimeMillis,
        },
      });

      // Also get activity segments (running sessions)
      const sessionsResponse = await fitness.users.sessions.list({
        userId: 'me',
        startTime: new Date(startTimeMillis).toISOString(),
        endTime: new Date(endTimeMillis).toISOString(),
        activityType: activityType,
      });

      return {
        aggregated: response.data,
        sessions: sessionsResponse.data.session || [],
      };
    } catch (error) {
      console.error('Error fetching Google Fit data:', error);
      throw error;
    }
  }

  /**
   * Get detailed activity data for a specific session
   */
  async getActivityDetails(sessionId) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const fitness = google.fitness({ version: 'v1', auth: this.oauth2Client });

    try {
      const session = await fitness.users.sessions.get({
        userId: 'me',
        sessionId: sessionId,
      });

      // Get data points for this session
      const startTime = new Date(parseInt(session.data.startTimeMillisNanos) / 1000000);
      const endTime = new Date(parseInt(session.data.endTimeMillisNanos) / 1000000);

      const dataResponse = await fitness.users.dataSources.datasets.get({
        userId: 'me',
        dataSourceId: 'derived:com.google.distance.delta:com.google.android.gms:merge_distance',
        datasetId: `${startTime.getTime() * 1000000}-${endTime.getTime() * 1000000}`,
      });

      return {
        session: session.data,
        dataPoints: dataResponse.data.point || [],
      };
    } catch (error) {
      console.error('Error fetching activity details:', error);
      throw error;
    }
  }

  /**
   * Calculate distance and duration from Google Fit data
   */
  parseActivityData(activityData) {
    const sessions = activityData.sessions || [];
    const activities = [];

    for (const session of sessions) {
      const startTime = parseInt(session.startTimeMillis);
      const endTime = parseInt(session.endTimeMillis);
      const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

      // Try to get distance from aggregated data
      let distanceKm = 0;
      if (activityData.aggregated?.bucket) {
        for (const bucket of activityData.aggregated.bucket) {
          if (bucket.startTimeMillisNanos && bucket.endTimeMillisNanos) {
            const bucketStart = parseInt(bucket.startTimeMillisNanos) / 1000000;
            const bucketEnd = parseInt(bucket.endTimeMillisNanos) / 1000000;
            
            if (startTime >= bucketStart && endTime <= bucketEnd) {
              if (bucket.dataset && bucket.dataset[0]?.point) {
                for (const point of bucket.dataset[0].point) {
                  if (point.value && point.value[0]?.fpVal) {
                    distanceKm += point.value[0].fpVal / 1000; // Convert meters to km
                  }
                }
              }
            }
          }
        }
      }

      activities.push({
        id: session.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        durationMinutes: durationMinutes,
        distanceKm: distanceKm,
        activityType: session.activityType || 8, // 8 = Running
        name: session.name || 'Running',
      });
    }

    return activities;
  }
}

module.exports = new GoogleFitService();

