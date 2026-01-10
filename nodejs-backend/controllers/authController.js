const { generateToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const convexService = require('../services/convexService');
const { hashPassword, comparePassword, formatUser, formatProfile, dateToTimestamp } = require('../helpers/convexHelpers');


function createAuthController({ User, UserProfile, emailService }) {
  // Helper function to handle database connection errors
  const handleDatabaseError = (error, res) => {
    console.error('Database error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.original) {
      console.error('Original error:', error.original);
    }
    
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError' || error.name === 'SequelizeTimeoutError') {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again in a few moments.',
        code: 'DATABASE_CONNECTION_ERROR'
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: 'This email is already registered. Please try logging in instead.',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }
    
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  };

  // @desc    Register user
  // @route   POST /api/auth/register
  // @access  Public
  const register = async (req, res) => {
    try {
      // Check for validation errors
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
      const userExists = await User.findOne({ where: { email } });
      if (userExists) {
        return res.status(400).json({ 
          error: 'An account with this email already exists. Please try logging in instead.',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Generate verification code
      const verificationCode = emailService.generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user with email verification fields
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        emailVerified: false,
        emailVerificationToken: verificationCode,
        emailVerificationExpiry: verificationExpiry
      });

      // Create user profile with default values
      await UserProfile.create({
        userId: user.id,
        genderPreference: 'B',  // Default to 'Both' - let user set gender during profile setup
        relationshipType: 'C,S,F,B'  // Default to all relationship categories
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

      if (user) {
        res.status(201).json({
          message: 'Registration successful! Please check your email to verify your account.',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.getFullName(),
            emailVerified: user.emailVerified
          },
          emailSent: emailSent
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      return handleDatabaseError(error, res);
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
        console.log('=== [verifyEmail] No code provided');
        return res.status(400).json({ 
          error: 'Verification code is required.',
          code: 'MISSING_CODE'
        });
      }

      // Find user with the verification code
      const user = await User.findOne({
        where: {
          emailVerificationToken: code,
          emailVerified: false
        }
      });
      console.log('=== [verifyEmail] User lookup result:', user ? `Found user ID ${user.id}` : 'No user found');

      if (!user) {
        console.log('=== [verifyEmail] Invalid or expired code');
        return res.status(400).json({ 
          error: 'Invalid or expired verification code. Please request a new verification email.',
          code: 'INVALID_CODE'
        });
      }

      // Check if code has expired
      const now = new Date();
      console.log('=== [verifyEmail] Now:', now, 'Expiry:', user.emailVerificationExpiry);
      if (now > user.emailVerificationExpiry) {
        console.log('=== [verifyEmail] Code expired');
        return res.status(400).json({ 
          error: 'Verification code has expired. Please request a new verification email.',
          code: 'EXPIRED_CODE'
        });
      }

      // Mark email as verified
      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpiry = null;
      await user.save();
      console.log('=== [verifyEmail] Email marked as verified for user ID:', user.id);

      // Generate token and log user in automatically
      const token = generateToken(user.id);
      console.log('=== [verifyEmail] Token generated:', token.substring(0, 20) + '...');

      res.json({
        message: 'Email verified successfully! You can now continue with your profile setup.',
        token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          emailVerified: user.emailVerified
        }
      });
      console.log('=== [verifyEmail] Verification response sent');
    } catch (error) {
      console.error('=== [verifyEmail] Unexpected error:', error);
      return handleDatabaseError(error, res);
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
          error: 'Email address is required.',
          code: 'MISSING_EMAIL'
        });
      }

      // Find user
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ 
          error: 'No account found with this email address. Please check your email or register a new account.',
          code: 'USER_NOT_FOUND'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ 
          error: 'This email is already verified. You can log in to your account.',
          code: 'EMAIL_ALREADY_VERIFIED'
        });
      }

      // Generate new verification code
      const verificationCode = emailService.generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with new code
      user.emailVerificationToken = verificationCode;
      user.emailVerificationExpiry = verificationExpiry;
      await user.save();

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        email, 
        user.firstName, 
        verificationCode
      );

      res.json({
        message: 'Verification email sent successfully! Please check your inbox.',
        emailSent: emailSent
      });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Login user
  // @route   POST /api/auth/login
  // @access  Public
  const login = async (req, res) => {
    console.log('🔐 Login attempt started');
    try {
      const { email, password } = req.body;
      console.log('📧 Login email:', email);

      // Check for email and password
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Please provide both email and password.',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Validate connection before query
      console.log('🔍 Checking User.sequelize:', !!User.sequelize);
      if (!User.sequelize) {
        console.error('❌ User.sequelize is null!');
        return res.status(503).json({ 
          error: 'Database connection not available. Please try again in a few moments.',
          code: 'DATABASE_CONNECTION_ERROR'
        });
      }

      // Test connection
      try {
        await User.sequelize.authenticate();
        console.log('✅ Connection authenticated');
      } catch (authError) {
        console.error('❌ Connection authentication failed:', authError.name, authError.message);
        return handleDatabaseError(authError, res);
      }

      // Check for user
      console.log('🔍 Querying user...');
      let user;
      try {
        user = await User.findOne({ where: { email } });
        console.log('✅ User query completed, found:', !!user);
      } catch (dbError) {
        console.error('❌ Database query error in login:', dbError.name, dbError.message);
        if (dbError.original) {
          console.error('❌ Original error code:', dbError.original.code);
          console.error('❌ Original error message:', dbError.original.message);
        }
        // Check if it's a connection error
        if (dbError.name === 'SequelizeConnectionError' || 
            dbError.name === 'SequelizeConnectionRefusedError' ||
            dbError.name === 'SequelizeTimeoutError') {
          return handleDatabaseError(dbError, res);
        }
        throw dbError; // Re-throw if it's not a connection error
      }
      if (!user) {
        return res.status(401).json({ 
          error: 'No account found with this email address.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          error: 'Invalid email or password. Please check your credentials and try again.',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Allow login but flag if email is not verified
      // The frontend will redirect to verification screen
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        token: generateToken(user.id),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          emailVerified: user.emailVerified
        },
        requiresVerification: !user.emailVerified
      });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Logout user
  // @route   POST /api/auth/logout
  // @access  Private
  const logout = async (req, res) => {
    try {
      // In a JWT-based system, logout is typically handled client-side
      // by removing the token. However, we can implement a token blacklist
      // or simply return a success message.
      res.json({ message: 'Successfully logged out' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        error: 'An error occurred during logout. Please try again.',
        code: 'LOGOUT_ERROR'
      });
    }
  };

  // @desc    Google Sign-In
  // @route   POST /api/auth/google-login
  // @access  Public
  const googleLogin = async (req, res) => {
    try {
      const { idToken, email, displayName, photoUrl } = req.body;

      if (!idToken) {
        return res.status(400).json({ 
          error: 'Google ID token is required.',
          code: 'MISSING_TOKEN'
        });
      }

      // Initialize Google OAuth2 client
      // Note: You can add your Google Client ID for additional verification
      // For now, we'll trust the token verification from the client
      const client = new OAuth2Client();
      
      let payload;
      try {
        // Verify the token with Google
        if (process.env.GOOGLE_CLIENT_ID) {
          // Support multiple client IDs (comma-separated for debug, release, web)
          const clientIds = process.env.GOOGLE_CLIENT_ID.split(',').map(id => id.trim());
          const ticket = await client.verifyIdToken({ 
            idToken, 
            audience: clientIds 
          });
          payload = ticket.getPayload();
        } else {
          // Fallback: use email from request if no GOOGLE_CLIENT_ID configured
          console.warn('⚠️ GOOGLE_CLIENT_ID not set - using email from request without verification');
          payload = { email };
        }
      } catch (verifyError) {
        console.error('Google token verification error:', verifyError);
        return res.status(401).json({ 
          error: 'Invalid Google token.',
          code: 'INVALID_TOKEN'
        });
      }

      const googleEmail = email || payload.email;
      
      if (!googleEmail) {
        return res.status(400).json({ 
          error: 'Email is required for Google Sign-In.',
          code: 'MISSING_EMAIL'
        });
      }

      // Check if user exists
      let user = await User.findOne({ where: { email: googleEmail } });
      let isNewUser = false;

      if (!user) {
        // Create new user from Google account
        isNewUser = true;
        
        // Extract first and last name from displayName
        const nameParts = (displayName || googleEmail.split('@')[0]).split(' ');
        const firstName = nameParts[0] || 'User';
        // If no last name provided, use first name as last name to satisfy DB validation
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'User';

        user = await User.create({
          email: googleEmail,
          password: Math.random().toString(36).slice(-16), // Random password (user won't use it)
          firstName,
          lastName,
          emailVerified: true, // Google accounts are pre-verified
          googleId: idToken.substring(0, 255), // Store a reference (truncated for DB)
        });

        // Create user profile with default values
        await UserProfile.create({
          userId: user.id,
          genderPreference: 'B',  // Default to 'Both'
          relationshipType: 'C,S,F,B',  // Default to all relationship categories
          profilePictureUrl: photoUrl || null,
        });

        console.log('New Google user created:', googleEmail);
      } else {
        // Update last login
        user.lastLogin = new Date();
        
        // Ensure email is verified for Google sign-in
        if (!user.emailVerified) {
          user.emailVerified = true;
        }
        
        await user.save();
        console.log('Existing user logged in with Google:', googleEmail);
      }

      res.json({
        token: generateToken(user.id),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          emailVerified: user.emailVerified,
          isPremium: user.isPremium,
          premiumExpiry: user.premiumExpiry
        },
        isNewUser,
      });
    } catch (error) {
      console.error('Google login error:', error);
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Get current user
  // @route   GET /api/auth/me
  // @access  Private
  const getMe = async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          emailVerified: user.emailVerified
        }
      });
    } catch (error) {
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Delete user account
  // @route   DELETE /api/auth/delete-account
  // @access  Private
  const deleteAccount = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Find the user with all related data
      const user = await User.findByPk(userId, {
        include: [
          {
            model: UserProfile,
            as: 'profile'
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      console.log(`🗑️ Deleting user account: ${user.email} (ID: ${user.id})`);
      console.log(`📊 Data to be deleted:`);
      console.log(`   - Profile ID: ${user.profile?.id || 'None'}`);
      console.log(`   - User ID: ${user.id}`);

      // First, delete all matches that reference this user's profile
      if (user.profile) {
        const { Match } = require('../models');
        await Match.destroy({
          where: {
            [require('sequelize').Op.or]: [
              { user1Id: user.profile.id },
              { user2Id: user.profile.id }
            ]
          }
        });
        console.log('✅ Deleted all matches for this user');
      }

      // Delete the user (this will cascade delete all related data)
      await user.destroy();
      
      console.log('✅ User account and all related data deleted successfully');

      res.json({
        message: 'Account deleted successfully',
        code: 'ACCOUNT_DELETED'
      });
    } catch (error) {
      console.error('❌ Error deleting user account:', error);
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Request password reset
  // @route   POST /api/auth/request-reset
  // @access  Public
  const requestPasswordReset = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email address is required.',
          code: 'MISSING_EMAIL'
        });
      }

      // Find user
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message: 'If an account with this email exists, a password reset link has been sent.',
          emailSent: true
        });
      }

      // Generate reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpiry = resetExpiry;
      await user.save();

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        email,
        user.firstName,
        resetToken
      );

      res.json({
        message: 'If an account with this email exists, a password reset link has been sent.',
        emailSent: emailSent
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Reset password with token
  // @route   POST /api/auth/reset-password
  // @access  Public
  const resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ 
          error: 'Token and new password are required.',
          code: 'MISSING_FIELDS'
        });
      }

      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long.',
          code: 'INVALID_PASSWORD'
        });
      }

      // Find user with valid reset token
      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpiry: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token. Please request a new password reset.',
          code: 'INVALID_TOKEN'
        });
      }

      // Update password and clear reset token
      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;
      await user.save();

      res.json({
        message: 'Password reset successfully. You can now log in with your new password.',
        code: 'PASSWORD_RESET_SUCCESS'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return handleDatabaseError(error, res);
    }
  };

  // @desc    Update FCM token for push notifications
  // @route   POST /api/auth/update-fcm-token
  // @access  Private
  const updateFcmToken = async (req, res) => {
    try {
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res.status(400).json({ 
          error: 'FCM token is required.',
          code: 'MISSING_FCM_TOKEN'
        });
      }

      // Update user's FCM token
      await User.update(
        { fcmToken },
        { where: { id: req.user.id } }
      );

      res.json({
        message: 'FCM token updated successfully',
        code: 'FCM_TOKEN_UPDATED'
      });
    } catch (error) {
      console.error('FCM token update error:', error);
      return handleDatabaseError(error, res);
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

// Default export for app use
// Try Convex first, fallback to Sequelize if available
const convexService = require('../services/convexService');

let defaultAuthController;
if (convexService.isAvailable()) {
  console.log('✅ Using Convex-based auth controller');
  // Use Convex version
  defaultAuthController = require('./authControllerConvex');
} else {
  // Fallback to Sequelize version
  const { User: UserModel, UserProfile: UserProfileModel } = require('../models');
  const emailService = require('../services/emailService');
  
  if (UserModel && UserProfileModel && UserModel.sequelize) {
    console.log('✅ Creating auth controller with Sequelize models');
    defaultAuthController = createAuthController({ User: UserModel, UserProfile: UserProfileModel, emailService });
  } else {
    console.error('⚠️ ERROR: Cannot create auth controller - neither Convex nor Sequelize available');
    console.error('⚠️ CONVEX_URL:', process.env.CONVEX_URL ? 'SET' : 'NOT SET');
    console.error('⚠️ DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    // Create a dummy controller that returns errors for all methods
    const errorResponse = (req, res) => {
      console.error(`❌ ${req.method} ${req.path} called but no database available`);
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
}

// Export default instance's methods for router destructuring
module.exports = {
  register: defaultAuthController.register,
  verifyEmail: defaultAuthController.verifyEmail,
  resendVerification: defaultAuthController.resendVerification,
  login: defaultAuthController.login,
  googleLogin: defaultAuthController.googleLogin,
  logout: defaultAuthController.logout,
  getMe: defaultAuthController.getMe,
  deleteAccount: defaultAuthController.deleteAccount,
  requestPasswordReset: defaultAuthController.requestPasswordReset,
  resetPassword: defaultAuthController.resetPassword,
  updateFcmToken: defaultAuthController.updateFcmToken,
  // Export the factory function for testing
  createAuthController,
}; 