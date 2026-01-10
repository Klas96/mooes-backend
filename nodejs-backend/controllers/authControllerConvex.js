/**
 * Auth Controller (Convex Version)
 * 
 * This controller uses Convex instead of Sequelize for database operations.
 */

const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const convexService = require('../services/convexService');
const { hashPassword, comparePassword, formatUser, formatProfile, dateToTimestamp } = require('../helpers/convexHelpers');

function createAuthControllerConvex({ emailService }) {
  // Helper function to handle errors
  const handleError = (error, res) => {
    console.error('Auth error:', error);
    
    if (error.message?.includes('already exists') || error.message?.includes('EMAIL_ALREADY_EXISTS')) {
      return res.status(400).json({ 
        error: 'This email is already registered. Please try logging in instead.',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }
    
    if (error.message?.includes('Convex client not initialized')) {
      return res.status(503).json({ 
        error: 'Database connection not available. Please try again in a few moments.',
        code: 'DATABASE_CONNECTION_ERROR'
      });
    }
    
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  };

  // @desc    Register user
  // @route   POST /api/auth/register
  // @access  Public
  const register = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Please check your input and try again.',
          details: errors.array(),
          code: 'VALIDATION_ERROR'
        });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await convexService.query('users:getByEmail', { email });
      if (existingUser) {
        return res.status(400).json({ 
          error: 'An account with this email already exists. Please try logging in instead.',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate verification code
      const verificationCode = emailService.generateVerificationCode();
      const verificationExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Create user
      const userId = await convexService.mutation('users:create', {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: false,
        emailVerificationToken: verificationCode,
        emailVerificationExpiry: verificationExpiry,
        isPremium: false,
        isActive: true,
        lastLogin: Date.now(),
        aiMessageCount: 0,
      });

      // Create user profile
      await convexService.mutation('userProfiles:create', {
        userId,
        genderPreference: 'B', // Default to 'Both'
        isHidden: false,
        locationMode: 'global',
        keyWords: [],
      });

      // Send verification email
      console.log(`📧 Attempting to send verification email to ${email}...`);
      const emailSent = await emailService.sendVerificationEmail(
        email, 
        firstName, 
        verificationCode
      );

      if (!emailSent) {
        console.error(`❌ Failed to send verification email to ${email}`);
      } else {
        console.log(`✅ Verification email sent successfully to ${email}`);
      }

      // Get created user
      const user = await convexService.query('users:getById', { id: userId });
      const formattedUser = formatUser(user);

      res.status(201).json({
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          id: formattedUser.id,
          email: formattedUser.email,
          firstName: formattedUser.firstName,
          lastName: formattedUser.lastName,
          fullName: formattedUser.getFullName(),
          emailVerified: formattedUser.emailVerified
        },
        emailSent: emailSent
      });
    } catch (error) {
      console.error('Registration error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Verify email
  // @route   POST /api/auth/verify-email
  // @access  Public
  const verifyEmail = async (req, res) => {
    try {
      const { code } = req.body;
      console.log('=== [verifyEmail] Received code:', code);

      if (!code) {
        return res.status(400).json({ 
          error: 'Verification code is required.',
          code: 'MISSING_CODE'
        });
      }

      // Find user by verification token (we need to query all users and filter)
      // Note: In production, you might want to add an index for emailVerificationToken
      const allUsers = await convexService.query('users:list', { limit: 1000 });
      const user = allUsers.find(u => 
        u.emailVerificationToken === code && 
        !u.emailVerified &&
        u.emailVerificationExpiry &&
        Date.now() <= u.emailVerificationExpiry
      );

      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired verification code. Please request a new verification email.',
          code: 'INVALID_CODE'
        });
      }

      // Update user to mark email as verified
      await convexService.mutation('users:update', {
        id: user._id,
        emailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpiry: undefined,
      });

      // Get updated user
      const updatedUser = await convexService.query('users:getById', { id: user._id });
      const formattedUser = formatUser(updatedUser);

      // Generate token
      const token = generateToken(formattedUser.id);

      res.json({
        message: 'Email verified successfully! You can now continue with your profile setup.',
        token: token,
        user: {
          id: formattedUser.id,
          email: formattedUser.email,
          firstName: formattedUser.firstName,
          lastName: formattedUser.lastName,
          fullName: formattedUser.getFullName(),
          emailVerified: formattedUser.emailVerified
        }
      });
    } catch (error) {
      console.error('=== [verifyEmail] Unexpected error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Resend verification email
  // @route   POST /api/auth/resend-verification
  // @access  Public
  const resendVerification = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email is required.',
          code: 'MISSING_EMAIL'
        });
      }

      // Find user
      const user = await convexService.query('users:getByEmail', { email });
      if (!user) {
        return res.status(404).json({ 
          error: 'No account found with this email address.',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ 
          error: 'Email is already verified.',
          code: 'ALREADY_VERIFIED'
        });
      }

      // Generate new verification code
      const verificationCode = emailService.generateVerificationCode();
      const verificationExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Update user
      await convexService.mutation('users:update', {
        id: user._id,
        emailVerificationToken: verificationCode,
        emailVerificationExpiry: verificationExpiry,
      });

      // Send email
      const emailSent = await emailService.sendVerificationEmail(
        email,
        user.firstName,
        verificationCode
      );

      res.json({
        message: 'Verification email sent successfully!',
        emailSent: emailSent
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Login user
  // @route   POST /api/auth/login
  // @access  Public
  const login = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Please check your input and try again.',
          details: errors.array(),
          code: 'VALIDATION_ERROR'
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await convexService.query('users:getByEmail', { email });
      if (!user) {
        return res.status(401).json({ 
          error: 'No account found with this email address.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check password
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          error: 'Invalid email or password. Please check your credentials and try again.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Update last login
      await convexService.mutation('users:update', {
        id: user._id,
        lastLogin: Date.now(),
      });

      const formattedUser = formatUser(user);

      res.json({
        token: generateToken(formattedUser.id),
        user: {
          id: formattedUser.id,
          email: formattedUser.email,
          firstName: formattedUser.firstName,
          lastName: formattedUser.lastName,
          fullName: formattedUser.getFullName(),
          emailVerified: formattedUser.emailVerified
        },
        requiresVerification: !formattedUser.emailVerified
      });
    } catch (error) {
      console.error('Login error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Google login
  // @route   POST /api/auth/google-login
  // @access  Public
  const googleLogin = async (req, res) => {
    try {
      const { idToken, email, firstName, lastName, googleId } = req.body;

      // Verify Google token (simplified - you should verify properly)
      // For now, we'll trust the client-provided email

      // Check if user exists
      let user = await convexService.query('users:getByEmail', { email });
      
      if (!user) {
        // Create new user
        const userId = await convexService.mutation('users:create', {
          email,
          password: undefined, // OAuth users don't have passwords
          firstName,
          lastName,
          emailVerified: true, // Google emails are pre-verified
          isPremium: false,
          isActive: true,
          lastLogin: Date.now(),
          aiMessageCount: 0,
        });

        // Create profile
        await convexService.mutation('userProfiles:create', {
          userId,
          genderPreference: 'B',
          isHidden: false,
          locationMode: 'global',
          keyWords: [],
        });

        user = await convexService.query('users:getById', { id: userId });
      } else {
        // Update last login
        await convexService.mutation('users:update', {
          id: user._id,
          lastLogin: Date.now(),
        });
        // Refresh user data
        user = await convexService.query('users:getById', { id: user._id });
      }

      const formattedUser = formatUser(user);

      res.json({
        token: generateToken(formattedUser.id),
        user: {
          id: formattedUser.id,
          email: formattedUser.email,
          firstName: formattedUser.firstName,
          lastName: formattedUser.lastName,
          fullName: formattedUser.getFullName(),
          emailVerified: formattedUser.emailVerified
        }
      });
    } catch (error) {
      console.error('Google login error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Logout user
  // @route   POST /api/auth/logout
  // @access  Private
  const logout = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
  };

  // @desc    Get current user
  // @route   GET /api/auth/me
  // @access  Private
  const getMe = async (req, res) => {
    try {
      const userId = req.user.id; // From auth middleware
      const user = await convexService.query('users:getById', { id: userId });
      
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const formattedUser = formatUser(user);

      res.json({
        user: {
          id: formattedUser.id,
          email: formattedUser.email,
          firstName: formattedUser.firstName,
          lastName: formattedUser.lastName,
          fullName: formattedUser.getFullName(),
          emailVerified: formattedUser.emailVerified
        }
      });
    } catch (error) {
      console.error('Get me error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Delete account
  // @route   DELETE /api/auth/delete-account
  // @access  Private
  const deleteAccount = async (req, res) => {
    try {
      const userId = req.user.id;

      // Delete user (this will cascade to related data if configured in Convex)
      await convexService.mutation('users:remove', { id: userId });

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Request password reset
  // @route   POST /api/auth/request-reset
  // @access  Public
  const requestPasswordReset = async (req, res) => {
    try {
      const { email } = req.body;

      const user = await convexService.query('users:getByEmail', { email });
      if (!user) {
        // Don't reveal if user exists
        return res.json({ 
          message: 'If an account exists with this email, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

      await convexService.mutation('users:update', {
        id: user._id,
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry,
      });

      // Send reset email
      await emailService.sendPasswordResetEmail(email, user.firstName, resetToken);

      res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Request password reset error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Reset password
  // @route   POST /api/auth/reset-password
  // @access  Public
  const resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // Find user by reset token
      const allUsers = await convexService.query('users:list', { limit: 1000 });
      const user = allUsers.find(u => 
        u.resetPasswordToken === token &&
        u.resetPasswordExpiry &&
        Date.now() <= u.resetPasswordExpiry
      );

      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token.',
          code: 'INVALID_TOKEN'
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await convexService.mutation('users:update', {
        id: user._id,
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpiry: undefined,
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      return handleError(error, res);
    }
  };

  // @desc    Update FCM token
  // @route   POST /api/auth/update-fcm-token
  // @access  Private
  const updateFcmToken = async (req, res) => {
    try {
      const userId = req.user.id;
      const { fcmToken } = req.body;

      await convexService.mutation('users:update', {
        id: userId,
        fcmToken: fcmToken || undefined,
      });

      res.json({ message: 'FCM token updated successfully' });
    } catch (error) {
      console.error('Update FCM token error:', error);
      return handleError(error, res);
    }
  };

  return {
    register,
    verifyEmail,
    resendVerification,
    login,
    googleLogin,
    logout,
    getMe,
    deleteAccount,
    requestPasswordReset,
    resetPassword,
    updateFcmToken,
  };
}

// Default export
const emailService = require('../services/emailService');

// Use Convex if available, otherwise fallback to error responses
let defaultAuthController;
if (convexService.isAvailable()) {
  console.log('✅ Creating auth controller with Convex');
  defaultAuthController = createAuthControllerConvex({ emailService });
} else {
  console.error('⚠️ ERROR: Convex not available - CONVEX_URL not set');
  const errorResponse = (req, res) => {
    console.error(`❌ ${req.method} ${req.path} called but Convex not available`);
    return res.status(503).json({ 
      error: 'Database connection not available. Please try again in a few moments.',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  };
  
  defaultAuthController = {
    register: errorResponse,
    verifyEmail: errorResponse,
    resendVerification: errorResponse,
    login: errorResponse,
    googleLogin: errorResponse,
    logout: errorResponse,
    getMe: errorResponse,
    deleteAccount: errorResponse,
    requestPasswordReset: errorResponse,
    resetPassword: errorResponse,
    updateFcmToken: errorResponse,
  };
}

module.exports = defaultAuthController;

