const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
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
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const verifyEmailValidation = [
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
];

const resendVerificationValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
];

const requestResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const googleLoginValidation = [
  body('idToken')
    .notEmpty()
    .withMessage('Google ID token is required'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail()
];

// Routes
router.post('/register', registerValidation, register);
router.post('/verify-email', verifyEmailValidation, verifyEmail);
router.post('/resend-verification', resendVerificationValidation, resendVerification);
router.post('/login', loginValidation, login);
router.post('/google-login', googleLoginValidation, googleLogin);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.delete('/delete-account', protect, deleteAccount);
router.post('/request-reset', requestResetValidation, requestPasswordReset);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.post('/update-fcm-token', protect, updateFcmToken);

module.exports = router; 