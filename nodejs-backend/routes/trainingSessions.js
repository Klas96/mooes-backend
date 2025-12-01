const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const trainingSessionController = require('../controllers/trainingSessionController');

const router = express.Router();

const createValidators = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 140 })
    .withMessage('Title must be between 1 and 140 characters'),
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  body('durationMinutes')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 2000 })
    .withMessage('Duration must be between 0 and 2000 minutes'),
  body('notes')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Notes may not exceed 2000 characters'),
  body('goalReached')
    .optional()
    .isBoolean()
    .withMessage('goalReached must be a boolean'),
];

const updateValidators = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 140 })
    .withMessage('Title must be between 1 and 140 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
  body('durationMinutes')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 2000 })
    .withMessage('Duration must be between 0 and 2000 minutes'),
  body('notes')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Notes may not exceed 2000 characters'),
  body('goalReached')
    .optional()
    .isBoolean()
    .withMessage('goalReached must be a boolean'),
];

router.use(protect);

router.get('/', trainingSessionController.listSessions);
router.post('/', createValidators, trainingSessionController.createSession);
router.patch('/:id', updateValidators, trainingSessionController.updateSession);
router.delete('/:id', trainingSessionController.deleteSession);
router.get('/:id/qr', trainingSessionController.getQrPayload);

module.exports = router;

