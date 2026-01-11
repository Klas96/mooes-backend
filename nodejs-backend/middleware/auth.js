const jwt = require('jsonwebtoken');
const { User, UserProfile } = require('../models');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      console.log('=== DEBUG: Auth middleware ===');
      console.log('Token received:', token ? `${token.substring(0, 20)}...` : 'missing');
      console.log('Request path:', req.path);

      // Verify token
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ 
          error: 'Server configuration error',
          code: 'JWT_SECRET_MISSING',
          message: 'JWT_SECRET environment variable is not set.'
        });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully, user ID:', decoded.userId || decoded.id);

      // Get user from token - check for both userId and id for compatibility
      const userId = decoded.userId || decoded.id;
      
      if (!userId) {
        throw new Error('Token does not contain user ID');
      }
      
      // Try to find user - support both Sequelize and Convex
      // Check Convex first if available, then Sequelize
      const convexService = require('../services/convexService');
      req.user = null;
      
      if (convexService.isAvailable()) {
        // Try Convex first
        try {
          console.log('Looking up user via Convex, ID:', userId, 'Type:', typeof userId);
          // Convex expects the ID as-is (it should already be a Convex ID string)
          const convexId = typeof userId === 'string' ? userId : userId.toString();
          req.user = await convexService.query('users:getById', { id: convexId });
          if (req.user && req.user.password) {
            delete req.user.password;
          }
          console.log('User found via Convex:', req.user ? req.user.email : 'not found');
        } catch (convexError) {
          console.error('Convex user lookup failed:', convexError.message);
          console.error('Convex error details:', convexError);
          // Don't throw - continue to Sequelize fallback
        }
      }
      
      // Fallback to Sequelize if Convex didn't work and Sequelize is available
      if (!req.user && User && typeof User.findByPk === 'function') {
        try {
          console.log('Looking up user via Sequelize, ID:', userId);
          req.user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
          });
          console.log('User found via Sequelize:', req.user ? req.user.email : 'not found');
        } catch (sequelizeError) {
          console.error('Sequelize user lookup failed:', sequelizeError.message);
          console.error('Sequelize error details:', sequelizeError);
        }
      }
      
      if (!req.user) {
        console.log('User not found in database for ID:', userId, 'Type:', typeof userId);
        return res.status(401).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          message: 'Your session has expired. Please log in again.'
        });
      }

      console.log('User found:', req.user.email);
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check if it's a JWT error
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Not authorized, token invalid',
          code: 'TOKEN_INVALID',
          message: 'Your session has expired. Please log in again.'
        });
      }
      
      // Other errors (including user lookup failures)
      return res.status(401).json({ 
        error: 'Not authorized, token failed',
        code: 'TOKEN_INVALID',
        message: 'Your session has expired. Please log in again.'
      });
    }
  }

  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ 
      error: 'Not authorized, no token',
      code: 'NO_TOKEN',
      message: 'Please log in to continue.'
    });
  }
};

// Optional authentication - doesn't require token but adds user if present
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!process.env.JWT_SECRET) {
        // Skip optional auth if JWT_SECRET is not configured
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      req.user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });
    } catch (error) {
      // Token is invalid but we don't fail the request
      console.error('Optional auth token error:', error);
    }
  }

  next();
};

// Check if user has profile
const requireProfile = async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne({ 
      where: { userId: req.user.id }
    });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });
    }
    
    req.userProfile = profile;
    next();
  } catch (error) {
    console.error('Profile check error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Generate JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Please configure it in your Vercel environment variables.');
  }
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = {
  protect,
  optionalAuth,
  requireProfile,
  generateToken
}; 