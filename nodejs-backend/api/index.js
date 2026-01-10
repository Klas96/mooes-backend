// Vercel serverless function entry point
// This wraps the Express app to work with Vercel's serverless functions

let app = null;
let appLoading = false;
let appLoadPromise = null;
let appLoadError = null;

// Lazy load the app to avoid initialization errors blocking requests
const getApp = async () => {
  if (app) return app;
  if (appLoadError) throw appLoadError;
  if (appLoading) {
    // Wait for existing load
    return appLoadPromise;
  }
  
  appLoading = true;
  appLoadPromise = (async () => {
    try {
      // Mark as Vercel environment before requiring server
      process.env.VERCEL = '1';
      process.env.VERCEL_ENV = process.env.VERCEL_ENV || 'production';
      
      // Load server (this might fail if DB connection fails, but we handle it)
      app = require('../server');
      appLoading = false;
      return app;
    } catch (error) {
      console.error('Failed to load app:', error);
      appLoading = false;
      appLoadError = error;
      throw error;
    }
  })();
  
  return appLoadPromise;
};

// Handler function for Vercel serverless functions
const handler = async (req, res) => {
  // Set CORS headers immediately for all requests (before any async operations)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  // Handle preflight OPTIONS requests immediately (before loading app)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Load app if not already loaded (lazy initialization)
    const expressApp = await getApp();
    
    // Pass request to Express app
    return expressApp(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    // Ensure CORS headers are set even on errors
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Return appropriate error response
    const statusCode = error.status || 500;
    res.status(statusCode).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

module.exports = handler;

