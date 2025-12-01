const { Group, GroupMember, GroupMessage, UserProfile, User, Match } = require('../models');
const { Op } = require('sequelize');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Group name cannot exceed 100 characters' });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'At least one member is required' });
    }

    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify all members are matched with the current user
    for (const memberId of memberIds) {
      const match = await Match.findOne({
        where: {
          [Op.or]: [
            { user1Id: currentProfile.id, user2Id: memberId },
            { user1Id: memberId, user2Id: currentProfile.id }
          ],
          status: 'matched'
        }
      });

      if (!match) {
        return res.status(400).json({ 
          error: 'You can only create groups with users you are matched with' 
        });
      }
    }

    // Create the group
    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      createdById: currentProfile.id
    });

    // Add the creator as a member
    await GroupMember.create({
      groupId: group.id,
      userProfileId: currentProfile.id
    });

    // Add all other members
    for (const memberId of memberIds) {
      // Skip if memberId is the creator
      if (memberId !== currentProfile.id) {
        await GroupMember.create({
          groupId: group.id,
          userProfileId: memberId
        });
      }
    }

    // Return the group with members
    const createdGroup = await Group.findByPk(group.id, {
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
                attributes: ['firstName', 'lastName', 'email']
              }]
            }
          ]
        }
      ]
    });

    res.status(201).json(createdGroup);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get all groups for the current user
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get all groups where the user is a member
    const groupMembers = await GroupMember.findAll({
      where: { userProfileId: currentProfile.id },
      include: [
        {
          model: Group,
          as: 'group',
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
                    attributes: ['firstName', 'lastName', 'email']
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
                attributes: ['firstName', 'lastName', 'email']
              }]
            }
          ]
        }
      ]
    });

    // Get the last message for each group
    const groups = await Promise.all(groupMembers.map(async (gm) => {
      const lastMessage = await GroupMessage.findOne({
        where: { groupId: gm.group.id },
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: UserProfile,
            as: 'sender',
            include: [{
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }]
          }
        ]
      });

      const groupData = gm.group.toJSON();
      groupData.lastMessage = lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        timestamp: lastMessage.createdAt,
        sender: {
          id: lastMessage.sender.id,
          firstName: lastMessage.sender.user.firstName,
          lastName: lastMessage.sender.user.lastName
        }
      } : null;

      return groupData;
    }));

    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get a specific group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify user is a member of this group
    const groupMember = await GroupMember.findOne({
      where: {
        groupId: id,
        userProfileId: currentProfile.id
      }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }

    const group = await Group.findByPk(id, {
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
                attributes: ['firstName', 'lastName', 'email']
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
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Add a member to a group
// @route   POST /api/groups/:id/members
// @access  Private
const addGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userProfileId } = req.body;

    if (!userProfileId) {
      return res.status(400).json({ error: 'User profile ID is required' });
    }

    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify user is a member of this group
    const groupMember = await GroupMember.findOne({
      where: {
        groupId: id,
        userProfileId: currentProfile.id
      }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }

    // Verify the new member is matched with the current user
    const match = await Match.findOne({
      where: {
        [Op.or]: [
          { user1Id: currentProfile.id, user2Id: userProfileId },
          { user1Id: userProfileId, user2Id: currentProfile.id }
        ],
        status: 'matched'
      }
    });

    if (!match) {
      return res.status(400).json({ 
        error: 'You can only add users you are matched with' 
      });
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findOne({
      where: {
        groupId: id,
        userProfileId: userProfileId
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    // Add the member
    const newMember = await GroupMember.create({
      groupId: id,
      userProfileId: userProfileId
    });

    // Return the member with profile info
    await newMember.reload({
      include: [
        {
          model: UserProfile,
          as: 'userProfile',
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Remove a member from a group
// @route   DELETE /api/groups/:id/members/:userProfileId
// @access  Private
const removeGroupMember = async (req, res) => {
  try {
    const { id, userProfileId } = req.params;
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify user is a member of this group
    const groupMember = await GroupMember.findOne({
      where: {
        groupId: id,
        userProfileId: currentProfile.id
      }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }

    // Check if the current user is the creator or removing themselves
    const group = await Group.findByPk(id);
    const isCreator = group.createdById === currentProfile.id;
    const isSelf = parseInt(userProfileId) === currentProfile.id;

    if (!isCreator && !isSelf) {
      return res.status(403).json({ 
        error: 'Only the group creator can remove members, or you can remove yourself' 
      });
    }

    // Remove the member
    await GroupMember.destroy({
      where: {
        groupId: id,
        userProfileId: userProfileId
      }
    });

    // If the creator leaves, delete the group
    if (isSelf && isCreator) {
      await Group.destroy({ where: { id: id } });
      return res.json({ message: 'Group deleted as creator left' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get messages for a group
// @route   GET /api/groups/:id/messages
// @access  Private
const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify user is a member of this group
    const groupMember = await GroupMember.findOne({
      where: {
        groupId: id,
        userProfileId: currentProfile.id
      }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }

    // Get messages for this group
    const messages = await GroupMessage.findAll({
      where: { groupId: id },
      include: [
        {
          model: UserProfile,
          as: 'sender',
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Format messages
    const formattedMessages = messages.map(message => ({
      id: message.id,
      groupId: message.groupId,
      content: message.content,
      timestamp: message.createdAt,
      sender: {
        id: message.sender.id,
        firstName: message.sender.user.firstName,
        lastName: message.sender.user.lastName,
        email: message.sender.user.email
      }
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Send a message to a group
// @route   POST /api/groups/:id/messages
// @access  Private
const sendGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Message content cannot exceed 1000 characters' });
    }

    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify user is a member of this group
    const groupMember = await GroupMember.findOne({
      where: {
        groupId: id,
        userProfileId: currentProfile.id
      }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Group not found or access denied' });
    }

    // Create the message
    const message = await GroupMessage.create({
      groupId: id,
      senderId: currentProfile.id,
      content: content.trim()
    });

    // Populate sender info
    await message.reload({
      include: [
        {
          model: UserProfile,
          as: 'sender',
          include: [{
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    res.status(201).json({
      id: message.id,
      groupId: message.groupId,
      content: message.content,
      timestamp: message.createdAt,
      sender: {
        id: message.sender.id,
        firstName: message.sender.user.firstName,
        lastName: message.sender.user.lastName,
        email: message.sender.user.email
      }
    });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  addGroupMember,
  removeGroupMember,
  getGroupMessages,
  sendGroupMessage
};

