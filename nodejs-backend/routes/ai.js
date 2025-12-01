const express = require('express');
const { body } = require('express-validator');
const { protect, requireProfile } = require('../middleware/auth');
const {
  sendMessage,
  sendMessageStream,
  getConversationHistory,
  clearConversationHistory,
  getMessageUsage,
  updateUserKeywords
} = require('../controllers/aiController');

const router = express.Router();

// Validation rules
const messageValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
];

const keywordsValidation = [
  body('keywords')
    .isArray({ min: 1, max: 20 })
    .withMessage('Keywords must be an array with 1-20 items'),
  body('keywords.*')
    .isString()
    .isLength({ min: 1, max: 20 })
    .withMessage('Each keyword must be a string with 1-20 characters')
];

// Routes
router.post('/chat', protect, requireProfile, messageValidation, sendMessage);
router.post('/chat/stream', protect, requireProfile, messageValidation, sendMessageStream);
router.get('/conversation-history', protect, requireProfile, getConversationHistory);
router.delete('/conversation-history', protect, requireProfile, clearConversationHistory);
router.get('/usage', protect, requireProfile, getMessageUsage);
router.post('/update-keywords', protect, requireProfile, keywordsValidation, updateUserKeywords);

module.exports = router; 