const { GroupJoinRequest, Group, GroupMember, UserProfile, User } = require('../models');
const { Op } = require('sequelize');
const notificationController = require('./notificationController');

/**
 * Request to join a group
 */
async function requestToJoinGroup(req, res) {
  const groupId = req.params.id;
  const { message } = req.body;

  try {
    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfileId = currentProfile.id;

    // Check if group exists
    const group = await Group.findByPk(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findOne({
      where: { groupId, userProfileId }
    });

    if (existingMember) {
      return res.status(409).json({ error: 'You are already a member of this group' });
    }

    // Check if user already has a pending request
    const existingRequest = await GroupJoinRequest.findOne({
      where: { groupId, userProfileId, status: 'pending' }
    });

    if (existingRequest) {
      return res.status(409).json({ error: 'You already have a pending request for this group' });
    }

    // Create join request
    const joinRequest = await GroupJoinRequest.create({
      groupId,
      userProfileId,
      message: message || null,
      status: 'pending'
    });

    // Send notification to group creator
    await notificationController.createNotification({
      userProfileId: group.createdById,
      type: 'group_join_request',
      title: 'New Group Join Request',
      message: `${req.user.firstName} ${req.user.lastName} wants to join "${group.name}"`,
      data: {
        groupId: groupId,
        requestId: joinRequest.id,
        requesterName: `${req.user.firstName} ${req.user.lastName}`,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Join request sent successfully',
      requestId: joinRequest.id,
    });
  } catch (error) {
    console.error('Error requesting to join group:', error);
    res.status(500).json({ error: 'Failed to send join request' });
  }
}

/**
 * Get all join requests for a group (creator only)
 */
async function getJoinRequests(req, res) {
  const groupId = req.params.id;

  try {
    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if group exists and user is the creator
    const group = await Group.findOne({
      where: { id: groupId, createdById: currentProfile.id }
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group creator can view join requests' });
    }

    // Get pending join requests with requester information
    const requests = await GroupJoinRequest.findAll({
      where: { groupId, status: 'pending' },
      include: [
        {
          model: UserProfile,
          as: 'requester',
          include: [{ model: User, as: 'user' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Format the response to match expected structure
    const formattedRequests = requests.map(req => ({
      id: req.id,
      groupId: req.groupId,
      userProfileId: req.userProfileId,
      status: req.status,
      message: req.message,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      firstName: req.requester.user.firstName,
      lastName: req.requester.user.lastName,
      bio: req.requester.bio,
      profilePicture: req.requester.profilePicture,
      age: req.requester.age
    }));

    res.json(formattedRequests);
  } catch (error) {
    console.error('Error getting join requests:', error);
    res.status(500).json({ error: 'Failed to get join requests' });
  }
}

/**
 * Accept a join request
 */
async function acceptJoinRequest(req, res) {
  const groupId = req.params.id;
  const { requestId } = req.params;

  try {
    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if group exists and user is the creator
    const group = await Group.findOne({
      where: { id: groupId, createdById: currentProfile.id }
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group creator can accept join requests' });
    }

    // Get the join request
    const request = await GroupJoinRequest.findOne({
      where: { id: requestId, groupId, status: 'pending' },
      include: [
        {
          model: UserProfile,
          as: 'requester',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Join request not found or already processed' });
    }

    // Use transaction for atomic operation
    const result = await User.sequelize.transaction(async (t) => {
      // Update request status
      await request.update({ status: 'accepted' }, { transaction: t });

      // Add user to group
      await GroupMember.create({
        groupId,
        userProfileId: request.userProfileId,
        joinedAt: new Date()
      }, { transaction: t });

      return request;
    });

    // Send notification to requester
    await notificationController.createNotification({
      userProfileId: request.userProfileId,
      type: 'group_join_accepted',
      title: 'Join Request Accepted',
      message: `Your request to join "${group.name}" has been accepted!`,
      data: {
        groupId: groupId,
        groupName: group.name,
      },
    });

    res.json({
      success: true,
      message: 'Join request accepted',
      memberName: `${result.requester.user.firstName} ${result.requester.user.lastName}`,
    });
  } catch (error) {
    console.error('Error accepting join request:', error);
    res.status(500).json({ error: 'Failed to accept join request' });
  }
}

/**
 * Decline a join request
 */
async function declineJoinRequest(req, res) {
  const groupId = req.params.id;
  const { requestId } = req.params;

  try {
    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if group exists and user is the creator
    const group = await Group.findOne({
      where: { id: groupId, createdById: currentProfile.id }
    });

    if (!group) {
      return res.status(403).json({ error: 'Only group creator can decline join requests' });
    }

    // Get the join request
    const request = await GroupJoinRequest.findOne({
      where: { id: requestId, groupId, status: 'pending' }
    });

    if (!request) {
      return res.status(404).json({ error: 'Join request not found or already processed' });
    }

    // Update request status
    await request.update({ status: 'declined' });

    // Optionally send notification to requester (less intrusive)
    await notificationController.createNotification({
      userProfileId: request.userProfileId,
      type: 'group_join_declined',
      title: 'Join Request Update',
      message: `Your request to join "${group.name}" was not approved at this time`,
      data: {
        groupId: groupId,
        groupName: group.name,
      },
    });

    res.json({
      success: true,
      message: 'Join request declined',
    });
  } catch (error) {
    console.error('Error declining join request:', error);
    res.status(500).json({ error: 'Failed to decline join request' });
  }
}

/**
 * Get pending join requests count for a group (for badge display)
 */
async function getJoinRequestsCount(req, res) {
  const groupId = req.params.id;

  try {
    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.json({ count: 0 });
    }

    // Check if user is the creator
    const group = await Group.findOne({
      where: { id: groupId, createdById: currentProfile.id }
    });

    if (!group) {
      return res.json({ count: 0 }); // Not creator, return 0
    }

    // Get count of pending requests
    const count = await GroupJoinRequest.count({
      where: { groupId, status: 'pending' }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting join requests count:', error);
    res.status(500).json({ error: 'Failed to get join requests count' });
  }
}

/**
 * Get groups to explore (groups user is NOT a member of)
 */
async function getGroupsToExplore(req, res) {
  try {
    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get IDs of groups the user is already a member of
    const userGroups = await GroupMember.findAll({
      where: { userProfileId: currentProfile.id },
      attributes: ['groupId']
    });

    const userGroupIds = userGroups.map(gm => gm.groupId);

    // Get IDs of groups the user has pending join requests for
    const pendingRequests = await GroupJoinRequest.findAll({
      where: { 
        userProfileId: currentProfile.id, 
        status: 'pending' 
      },
      attributes: ['groupId']
    });

    const pendingGroupIds = pendingRequests.map(req => req.groupId);

    // Combine both lists to exclude
    const excludedGroupIds = [...userGroupIds, ...pendingGroupIds];

    // Get all groups except those the user is in or has requested
    const whereClause = excludedGroupIds.length > 0
      ? { id: { [Op.notIn]: excludedGroupIds } }
      : {};

    const groups = await Group.findAll({
      where: whereClause,
      include: [
        {
          model: GroupMember,
          as: 'members',
          include: [
            {
              model: UserProfile,
              as: 'userProfile',
              include: [{
                model: User,
                as: 'user',
                attributes: ['firstName', 'lastName']
              }]
            }
          ]
        },
        {
          model: UserProfile,
          as: 'creator',
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName']
          }],
          attributes: ['id', 'profilePicture', 'bio']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50 // Limit to 50 groups for performance
    });

    res.json(groups);
  } catch (error) {
    console.error('Error getting groups to explore:', error);
    res.status(500).json({ error: 'Failed to get groups to explore' });
  }
}

module.exports = {
  requestToJoinGroup,
  getJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
  getJoinRequestsCount,
  getGroupsToExplore,
};
