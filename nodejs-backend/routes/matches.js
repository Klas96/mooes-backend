const express = require('express');
const { body } = require('express-validator');
const { protect, requireProfile } = require('../middleware/auth');
const {
  likeProfile,
  dislikeProfile,
  getMyMatches,
  getMatchById,
  getMatchMessages,
  sendMessage,
  likeProfileWithMessage,
  unmatchUser,
  getPendingMessages,
  getLikesReceived
} = require('../controllers/matchController');

const router = express.Router();

// Validation rules
const likeDislikeValidation = [
  body('profileId')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Valid profile ID is required')
];

const messageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
];

const likeWithMessageValidation = [
  body('profileId')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Valid profile ID is required'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
];

const unmatchValidation = [
  body('matchId')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Valid match ID is required')
];

// Routes
router.post('/like', protect, requireProfile, likeDislikeValidation, likeProfile);
router.post('/dislike', protect, requireProfile, likeDislikeValidation, dislikeProfile);
router.post('/like-with-message', protect, requireProfile, likeWithMessageValidation, likeProfileWithMessage);
router.post('/unmatch', protect, requireProfile, unmatchValidation, unmatchUser);
router.get('/', protect, requireProfile, getMyMatches);
router.get('/likes-received', protect, requireProfile, getLikesReceived);
router.get('/pending-messages', protect, requireProfile, getPendingMessages);
router.get('/:id', protect, requireProfile, getMatchById);
router.get('/:id/messages', protect, requireProfile, getMatchMessages);
router.post('/:id/messages', protect, requireProfile, messageValidation, sendMessage);

module.exports = router; 