const axios = require('axios');

class StravaService {
  constructor() {
    this.baseUrl = 'https://www.strava.com/api/v3';
  }

  /**
   * Get authorization URL for Strava OAuth
   */
  getAuthUrl(clientId, redirectUri, scopes = ['activity:read']) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      approval_prompt: 'force', // Force consent screen to get refresh token
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code, clientId, clientSecret, redirectUri) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at, // Unix timestamp
        athlete: response.data.athlete,
      };
    } catch (error) {
      console.error('Error exchanging Strava code for tokens:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken, clientId, clientSecret) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken, // Strava may return new refresh token
        expires_at: response.data.expires_at,
      };
    } catch (error) {
      console.error('Error refreshing Strava token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt) {
    if (!expiresAt) return true;
    // expiresAt is a Unix timestamp (seconds)
    return Date.now() / 1000 >= expiresAt;
  }

  /**
   * Get athlete activities from Strava
   */
  async getActivities(accessToken, options = {}) {
    try {
      const {
        before, // Unix timestamp (seconds)
        after, // Unix timestamp (seconds)
        page = 1,
        perPage = 30,
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      if (before) params.append('before', before.toString());
      if (after) params.append('after', after.toString());

      const response = await axios.get(`${this.baseUrl}/athlete/activities?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Strava activities:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get a specific activity by ID
   */
  async getActivity(accessToken, activityId) {
    try {
      const response = await axios.get(`${this.baseUrl}/activities/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Strava activity:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get athlete profile
   */
  async getAthlete(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/athlete`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Strava athlete:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Parse Strava activities into a consistent format
   */
  parseActivities(activities) {
    return activities.map(activity => ({
      id: activity.id.toString(),
      stravaActivityId: activity.id,
      name: activity.name || 'Activity',
      type: activity.type || 'Run',
      startTime: new Date(activity.start_date),
      durationSeconds: activity.moving_time || activity.elapsed_time || 0,
      durationMinutes: Math.round((activity.moving_time || activity.elapsed_time || 0) / 60),
      distanceMeters: activity.distance || 0,
      distanceKm: activity.distance ? parseFloat((activity.distance / 1000).toFixed(2)) : 0,
      elevationGain: activity.total_elevation_gain || 0,
      averageSpeed: activity.average_speed || 0,
      maxSpeed: activity.max_speed || 0,
      averageHeartRate: activity.average_heartrate || null,
      maxHeartRate: activity.max_heartrate || null,
      calories: activity.calories || null,
      description: activity.description || null,
      gear: activity.gear_id || null,
    }));
  }

  /**
   * Filter activities by type (e.g., 'Run', 'Ride', 'Walk')
   */
  filterActivitiesByType(activities, type = 'Run') {
    return activities.filter(activity => 
      activity.type === type || 
      (type === 'Run' && ['Run', 'Trail Run', 'Virtual Run'].includes(activity.type))
    );
  }
}

module.exports = new StravaService();

