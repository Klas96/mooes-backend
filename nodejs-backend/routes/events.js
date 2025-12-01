const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  participateInEvent,
  leaveEvent,
  addExternalParticipant,
  updateExternalParticipant,
  removeExternalParticipant,
  getMyEvents,
  getMyParticipations,
  messageEventCreator,
  inviteUsersToEvent
} = require('../controllers/eventController');

// Public routes (with authentication)
router.post('/', protect, createEvent);
router.get('/', protect, getEvents);
router.get('/my-events', protect, getMyEvents);
router.get('/my-participations', protect, getMyParticipations);
router.get('/:id', protect, getEventById);
router.put('/:id', protect, updateEvent);
router.delete('/:id', protect, deleteEvent);
router.post('/:id/participate', protect, participateInEvent);
router.delete('/:id/participate', protect, leaveEvent);
router.post('/:id/external-participants', protect, addExternalParticipant);
router.put('/:eventId/external-participants/:participantId', protect, updateExternalParticipant);
router.delete('/:eventId/external-participants/:participantId', protect, removeExternalParticipant);
router.post('/:id/message-creator', protect, messageEventCreator);
router.post('/:id/invite', protect, inviteUsersToEvent);

module.exports = router;

