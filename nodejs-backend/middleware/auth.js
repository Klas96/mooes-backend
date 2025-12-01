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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully, user ID:', decoded.userId || decoded.id);

      // Get user from token - check for both userId and id for compatibility
      const userId = decoded.userId || decoded.id;
      req.user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });
      
      if (!req.user) {
        console.log('User not found in database for ID:', userId);
        return res.status(401).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          message: 'Your session has expired. Please log in again.'
        });
      }

      console.log('User found:', req.user.email);
      next();
    } catch (error) {
      console.error('Token verification error:', error);
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