const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const emailService = require('./services/emailService');
const { User } = require('../nodejs-backend/models');

const router = express.Router();

// Database storage (replaced in-memory storage)
// const users = new Map(); // REMOVED - now using database
// const profiles = new Map(); // REMOVED - now using database

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register user
router.post('/register', registerValidation, async (req, res) => {
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
    const user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please try logging in instead.',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    // const userId = Date.now().toString(); // REMOVED - let database auto-generate ID
    
    // Generate verification code (6 digits)
    const verificationCode = emailService.generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const newUser = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      emailVerified: false, // Require email verification
      emailVerificationToken: verificationCode,
      emailVerificationExpiry: verificationExpiry
    });

    // Create user profile
    const profile = {
      userId: newUser.id,
      genderPreference: 'B',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(
      email, 
      firstName, 
      verificationCode
    );

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: `${newUser.firstName} ${newUser.lastName}`,
        emailVerified: newUser.emailVerified
      },
      emailSent: emailSent
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
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
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.updatedAt = new Date();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default_jwt_secret_for_development_only',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful! Welcome back!',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        emailVerified: user.emailVerified
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication token required.',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret_for_development_only');
    const user = await User.findOne({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logged out successfully.'
  });
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { code } = req.body;

    console.log('Email verification attempt:', { code: code ? `${code.substring(0, 3)}...` : 'missing' });

    if (!code) {
      console.log('Verification failed: Missing code');
      return res.status(400).json({ 
        error: 'Verification code is required.',
        code: 'MISSING_CODE'
      });
    }

    // Find user with the verification code
    const user = await User.findOne({ where: { emailVerificationToken: code } });

    if (!user) {
      console.log('Verification failed: No user found with code');
      return res.status(400).json({ 
        error: 'Invalid or expired verification code. Please request a new verification email.',
        code: 'INVALID_CODE'
      });
    }

    console.log('User found for verification:', { 
      userId: user.id, 
      email: user.email, 
      alreadyVerified: user.emailVerified 
    });

    // Check if code has expired
    if (new Date() > user.emailVerificationExpiry) {
      console.log('Verification failed: Code expired');
      return res.status(400).json({ 
        error: 'Verification code has expired. Please request a new verification email.',
        code: 'EXPIRED_CODE'
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    user.updatedAt = new Date();
    await user.save();

    console.log('Email verification successful:', { userId: user.id, email: user.email });

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default_jwt_secret_for_development_only',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully! You can now log in to your account.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        emailVerified: user.emailVerified
      },
      token: jwtToken
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Verify email via GET (for email links)
router.get('/verify-email', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Email Verification Failed</h1>
            <p>Verification code is missing. Please check your email for the correct verification link.</p>
            <p><a href="https://mooves-dating-app.web.app">Return to Mooves</a></p>
          </body>
        </html>
      `);
    }

    // Find user with the verification code
    const user = await User.findOne({ where: { emailVerificationToken: code } });

    if (!user) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Email Verification Failed</h1>
            <p>Invalid or expired verification code. Please request a new verification email.</p>
            <p><a href="https://mooves-dating-app.web.app">Return to Mooves</a></p>
          </body>
        </html>
      `);
    }

    // Check if code has expired
    if (new Date() > user.emailVerificationExpiry) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Email Verification Failed</h1>
            <p>Verification code has expired. Please request a new verification email.</p>
            <p><a href="https://mooves-dating-app.web.app">Return to Mooves</a></p>
          </body>
        </html>
      `);
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    user.updatedAt = new Date();
    await user.save();

    // Redirect to success page or back to app
    res.send(`
      <html>
        <head><title>Email Verified Successfully</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #4CAF50;">Email Verified Successfully!</h1>
          <p>Your email has been verified. You can now log in to your Mooves account.</p>
          <p><a href="https://mooves-dating-app.web.app" 
                style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Return to Mooves
          </a></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send(`
      <html>
        <head><title>Email Verification Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Email Verification Error</h1>
          <p>An unexpected error occurred. Please try again.</p>
          <p><a href="https://mooves-dating-app.web.app">Return to Mooves</a></p>
        </body>
      </html>
    `);
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
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
    user.updatedAt = new Date();
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
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

module.exports = router; 

// Export users map for access from server.js
// module.exports.users = users; 