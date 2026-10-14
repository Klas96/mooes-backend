const stravaService = require('../services/stravaService');
const convexService = require('../services/convexService');

// Always use Convex (Convex is the only database)
let defaultStravaController;

if (convexService.isAvailable()) {
  console.log('✅ Using Convex-based Strava controller');
  defaultStravaController = require('./stravaControllerConvex');
} else {
  console.error('⚠️ ERROR: Convex is not available');
  console.error('⚠️ CONVEX_URL:', process.env.CONVEX_URL ? 'SET' : 'NOT SET');
  // Create a dummy controller that returns errors for all methods
  const errorResponse = (req, res) => {
    console.error(`❌ ${req.method} ${req.path} called but Convex is not available`);
    return res.status(503).json({ 
      error: 'Database connection not available. Please configure CONVEX_URL.',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  };
  
  defaultStravaController = {
    getAuthUrl: errorResponse,
    handleCallback: errorResponse,
    syncActivities: errorResponse,
    getStatus: errorResponse,
    disconnect: errorResponse,
  };
}

// Export Convex controller methods directly
module.exports = {
  getAuthUrl: defaultStravaController.getAuthUrl,
  handleCallback: defaultStravaController.handleCallback,
  syncActivities: defaultStravaController.syncActivities,
  getStatus: defaultStravaController.getStatus,
  disconnect: defaultStravaController.disconnect,
};

