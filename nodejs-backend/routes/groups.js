const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroups,
  getGroup,
  addGroupMember,
  removeGroupMember,
  getGroupMessages,
  sendGroupMessage
} = require('../controllers/groupController');
const {
  requestToJoinGroup,
  getJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
  getJoinRequestsCount,
  getGroupsToExplore
} = require('../controllers/groupJoinRequestController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Group routes
router.post('/', createGroup);
router.get('/', getGroups);
router.get('/explore/discover', getGroupsToExplore);
router.get('/:id', getGroup);
router.post('/:id/members', addGroupMember);
router.delete('/:id/members/:userProfileId', removeGroupMember);
router.get('/:id/messages', getGroupMessages);
router.post('/:id/messages', sendGroupMessage);

// Join request routes
router.post('/:id/join-request', requestToJoinGroup);
router.get('/:id/join-requests', getJoinRequests);
router.get('/:id/join-requests-count', getJoinRequestsCount);
router.post('/:id/join-requests/:requestId/accept', acceptJoinRequest);
router.post('/:id/join-requests/:requestId/decline', declineJoinRequest);

module.exports = router;

