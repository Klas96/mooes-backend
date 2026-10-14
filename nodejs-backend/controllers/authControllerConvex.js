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

      // Normalize email (lowercase and trim)
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await convexService.query('users:getByEmail', { email: normalizedEmail });
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
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: false,
        emailVerificationToken: verificationCode,
        emailVerificationExpiry: verificationExpiry,
        isPremium: false,
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
      let emailSent = false;
      try {
        emailSent = await emailService.sendVerificationEmail(
          email, 
          firstName, 
          verificationCode
        );
        if (emailSent) {
          console.log(`✅ Verification email sent successfully to ${email}`);
        }
      } catch (emailError) {
        console.error(`❌ Failed to send verification email to ${email}:`, emailError.message);
        // Don't fail registration if email fails - user can request resend later
        emailSent = false;
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

      // Check if JWT_SECRET is configured
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ 
          error: 'Server configuration error',
          code: 'JWT_SECRET_MISSING',
          message: 'JWT_SECRET environment variable is not set. Please configure it in Vercel environment variables.'
        });
      }

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

      // Normalize email (lowercase and trim)
      const normalizedEmail = email.toLowerCase().trim();

      // Find user
      const user = await convexService.query('users:getByEmail', { email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ 
          error: 'No account found with this email address.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if user has a password (OAuth users might not have one)
      if (!user.password) {
        return res.status(401).json({ 
          error: 'This account was created with a social login. Please use the social login option instead.',
          code: 'OAUTH_ACCOUNT'
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

      // Check if JWT_SECRET is configured
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ 
          error: 'Server configuration error',
          code: 'JWT_SECRET_MISSING',
          message: 'JWT_SECRET environment variable is not set. Please configure it in Vercel environment variables.'
        });
      }

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
      const { idToken, email, displayName, photoUrl } = req.body;

      if (!idToken) {
        return res.status(400).json({ 
          error: 'Google ID token is required.',
          code: 'MISSING_TOKEN'
        });
      }

      // Initialize Google OAuth2 client
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

      // Extract first and last name from displayName
      const nameParts = (displayName || googleEmail.split('@')[0] || 'User').split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'User';

      // Check if user exists
      let user = await convexService.query('users:getByEmail', { email: googleEmail });
      let isNewUser = false;
      
      if (!user) {
        // Create new user
        isNewUser = true;
        const userId = await convexService.mutation('users:create', {
          email: googleEmail,
          password: undefined, // OAuth users don't have passwords
          firstName,
          lastName,
          emailVerified: true, // Google emails are pre-verified
          isPremium: false,
          isActive: true,
          lastLogin: Date.now(),
          aiMessageCount: 0,
        });

        // Create profile with Google photo if available
        await convexService.mutation('userProfiles:create', {
          userId,
          profilePicture: photoUrl || undefined,
          genderPreference: 'B',
          isHidden: false,
          locationMode: 'global',
          keyWords: [],
        });

        user = await convexService.query('users:getById', { id: userId });
        console.log('New Google user created:', googleEmail);
      } else {
        // Update last login
        await convexService.mutation('users:update', {
          id: user._id,
          lastLogin: Date.now(),
        });
        
        // Ensure email is verified for Google sign-in
        if (!user.emailVerified) {
          await convexService.mutation('users:update', {
            id: user._id,
            emailVerified: true,
          });
        }
        
        // Update profile picture if provided and user doesn't have one
        if (photoUrl) {
          const profile = await convexService.query('userProfiles:getByUserId', { userId: user._id });
          if (profile && !profile.profilePicture) {
            await convexService.mutation('userProfiles:update', {
              id: profile._id,
              profilePicture: photoUrl,
            });
          }
        }
        
        // Refresh user data
        user = await convexService.query('users:getById', { id: user._id });
        console.log('Existing user logged in with Google:', googleEmail);
      }

      const formattedUser = formatUser(user);

      // Check if JWT_SECRET is configured
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ 
          error: 'Server configuration error',
          code: 'JWT_SECRET_MISSING',
          message: 'JWT_SECRET environment variable is not set. Please configure it in Vercel environment variables.'
        });
      }

      res.json({
        token: generateToken(formattedUser.id),
        user: {
          id: formattedUser.id,
          email: formattedUser.email,
          firstName: formattedUser.firstName,
          lastName: formattedUser.lastName,
          fullName: formattedUser.getFullName(),
          emailVerified: formattedUser.emailVerified,
          isPremium: formattedUser.isPremium || false,
          premiumExpiry: formattedUser.premiumExpiry || null,
        },
        isNewUser,
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

      if (!token || !newPassword) {
        return res.status(400).json({ 
          error: 'Token and new password are required.',
          code: 'MISSING_FIELDS'
        });
      }

      // Find user by reset token (query checks expiry)
      const user = await convexService.query('users:getByResetToken', { token });

      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token.',
          code: 'INVALID_TOKEN'
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token fields
      // Note: We set them to empty strings since Convex filters out undefined
      // The tokens will expire anyway, but clearing them is better practice
      await convexService.mutation('users:update', {
        id: user._id,
        password: hashedPassword,
        resetPasswordToken: '',
        resetPasswordExpiry: 0,
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
// Note: convexService is already imported at the top of the file
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

