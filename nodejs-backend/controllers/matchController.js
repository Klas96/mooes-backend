const { Match, UserProfile, Message, User } = require('../models');
const { Op } = require('sequelize');
const LikesService = require('../services/likesService');
const { sendMatchNotification, sendLikeNotification, sendMessageNotification } = require('../services/notificationService');

// Track recently sent notifications to prevent duplicates (Set of notification keys)
const recentNotifications = new Set();


// @desc    Like a profile
// @route   POST /api/matches/like
// @access  Private
const likeProfile = async (req, res) => {
  try {
    console.log('=== LIKE PROFILE REQUEST ===');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    
    const { profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    // Check if user can like (daily limit check)
    const likeStatus = await LikesService.checkAndResetDailyLikes(req.user.id);
    
    if (!likeStatus.canLike) {
      return res.status(429).json({ 
        error: 'Daily like limit reached',
        remainingLikes: likeStatus.remainingLikes,
        dailyLimit: likeStatus.dailyLimit,
        isPremium: likeStatus.isPremium,
        message: likeStatus.isPremium 
          ? 'You have used all your premium likes for today. They will reset tomorrow.'
          : 'You have used all your free likes for today. Upgrade to Premium for more likes or wait until tomorrow.'
      });
    }

    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    const targetProfile = await UserProfile.findByPk(profileId);

    console.log('Current profile found:', currentProfile ? currentProfile.id : 'Not found');
    console.log('Target profile found:', targetProfile ? targetProfile.id : 'Not found');

    if (!currentProfile) {
      return res.status(404).json({ error: 'Your profile not found' });
    }

    if (!targetProfile) {
      return res.status(404).json({ error: 'Target profile not found' });
    }

    if (currentProfile.id === targetProfile.id) {
      return res.status(400).json({ error: 'Cannot like your own profile' });
    }

    // Ensure consistent ordering: smaller ID is always user1Id
    const user1Id = Math.min(currentProfile.id, targetProfile.id);
    const user2Id = Math.max(currentProfile.id, targetProfile.id);
    const isCurrentUserUser1 = currentProfile.id === user1Id;

    console.log('User1Id:', user1Id, 'User2Id:', user2Id, 'IsCurrentUserUser1:', isCurrentUserUser1);

    // Check if there's already a match record between these users
    let existingMatch = await Match.findOne({
      where: {
        user1Id: user1Id,
        user2Id: user2Id
      }
    });

    console.log('Existing match found:', existingMatch ? existingMatch.id : 'Not found');

    if (existingMatch) {
      console.log('Updating existing match. Current status:', existingMatch.status);
      // Update existing match based on who is liking
      if (isCurrentUserUser1) {
        // Current user is user1, so we need to track their like
        existingMatch.user1Liked = true;
      } else {
        // Current user is user2, so we need to track their like
        existingMatch.user2Liked = true;
      }
      
      // Check if both users have liked each other
      if (existingMatch.user1Liked && existingMatch.user2Liked) {
        existingMatch.status = 'matched';
        existingMatch.matchedAt = new Date();
        console.log('Both users liked each other - creating match!');
      } else {
        existingMatch.status = 'liked';
        console.log('Single like - status set to liked');
      }
      
      await existingMatch.save();
      console.log('Match updated successfully. New status:', existingMatch.status);
    } else {
      console.log('Creating new match record');
      // Create new match record
      const matchData = {
        user1Id: user1Id,
        user2Id: user2Id,
        status: 'liked'
      };
      
      if (isCurrentUserUser1) {
        matchData.user1Liked = true;
        matchData.user2Liked = false;
      } else {
        matchData.user1Liked = false;
        matchData.user2Liked = true;
      }
      
      existingMatch = await Match.create(matchData);
      console.log('New match created successfully. ID:', existingMatch.id);
    }

    // Check if it's a mutual match
    if (existingMatch.status === 'matched') {
      console.log('MATCH DETECTED! Processing match notification...');
      // Get the other user's profile info for notification
      const otherProfileId = currentProfile.id === existingMatch.user1Id ? existingMatch.user2Id : existingMatch.user1Id;
      const otherProfile = await UserProfile.findByPk(otherProfileId, {
        include: [{
          model: require('../models').User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'fcmToken']
        }]
      });

      // Emit match notification to both users via WebSocket
      if (req.io) {
        const matchData = {
          matchId: existingMatch.id,
          matchedAt: existingMatch.matchedAt,
          matchedUserId: otherProfileId,
          matchedUserName: `${otherProfile.user.firstName} ${otherProfile.user.lastName}`,
          currentUserId: req.user.id,
          currentUserName: `${req.user.firstName} ${req.user.lastName}`
        };

        // Emit to current user
        req.io.to(`user_${req.user.id}`).emit('new_match', {
          ...matchData,
          isCurrentUser: true
        });

        // Emit to other user
        req.io.to(`user_${otherProfile.userId}`).emit('new_match', {
          ...matchData,
          isCurrentUser: false
        });
      }

      // Send FCM push notification to the other user
      if (otherProfile.user.fcmToken) {
        console.log('Sending FCM match notification to other user');
        await sendMatchNotification(otherProfile.user.fcmToken, {
          matchId: existingMatch.id,
          userId: currentProfile.id,
          name: `${req.user.firstName} ${req.user.lastName}`
        });
      }

      // Send FCM push notification to current user
      if (req.user.fcmToken) {
        console.log('Sending FCM match notification to current user');
        await sendMatchNotification(req.user.fcmToken, {
          matchId: existingMatch.id,
          userId: otherProfileId,
          name: `${otherProfile.user.firstName} ${otherProfile.user.lastName}`
        });
      }

      // Increment daily likes count
      const updatedLikeStatus = await LikesService.incrementDailyLikes(req.user.id);
      
      res.json({ 
        message: 'It\'s a match!', 
        isMatch: true,
        matchId: existingMatch.id,
        remainingLikes: updatedLikeStatus.remainingLikes,
        dailyLimit: updatedLikeStatus.dailyLimit
      });
    } else {
      console.log('No match - regular like response');
      
      // Send notification to the person who GOT liked
      const likedUserId = currentProfile.id === existingMatch.user1Id ? existingMatch.user2Id : existingMatch.user1Id;
      const likedProfile = await UserProfile.findByPk(likedUserId, {
        include: [{
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'fcmToken']
        }]
      });
      
      if (likedProfile && likedProfile.user && likedProfile.user.fcmToken) {
        console.log(`Sending like notification to user ${likedProfile.userId}`);
        await sendLikeNotification(likedProfile.user.fcmToken, {
          likerId: currentProfile.id,
          likedUserId: likedUserId,
          name: `${req.user.firstName} ${req.user.lastName}`
        });
      } else {
        console.log('No FCM token for liked user, skipping notification');
      }
      
      // Increment daily likes count
      const updatedLikeStatus = await LikesService.incrementDailyLikes(req.user.id);
      
      res.json({ 
        message: 'Profile liked successfully', 
        isMatch: false,
        remainingLikes: updatedLikeStatus.remainingLikes,
        dailyLimit: updatedLikeStatus.dailyLimit
      });
    }
    
    console.log('=== LIKE PROFILE COMPLETED ===');
  } catch (error) {
    console.error('Like profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Dislike a profile
// @route   POST /api/matches/dislike
// @access  Private
const dislikeProfile = async (req, res) => {
  try {
    console.log('=== Dislike Profile Request ===');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    
    const { profileId } = req.body;

    if (!profileId) {
      console.log('Missing profileId in request');
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    console.log('Looking for current profile for user:', req.user.id);
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    console.log('Current profile found:', currentProfile ? currentProfile.id : 'Not found');
    
    console.log('Looking for target profile:', profileId);
    const targetProfile = await UserProfile.findByPk(profileId);
    console.log('Target profile found:', targetProfile ? targetProfile.id : 'Not found');

    if (!currentProfile) {
      console.log('Current profile not found');
      return res.status(404).json({ error: 'Your profile not found' });
    }

    if (!targetProfile) {
      console.log('Target profile not found');
      return res.status(404).json({ error: 'Target profile not found' });
    }

    if (currentProfile.id === targetProfile.id) {
      console.log('User trying to dislike their own profile');
      return res.status(400).json({ error: 'Cannot dislike your own profile' });
    }

    // Ensure consistent ordering: smaller ID is always user1Id
    const user1Id = Math.min(currentProfile.id, targetProfile.id);
    const user2Id = Math.max(currentProfile.id, targetProfile.id);
    const isCurrentUserUser1 = currentProfile.id === user1Id;

    console.log('Checking for existing match between profiles:', user1Id, 'and', user2Id);
    // Check if there's already a match record between these users
    const existingMatch = await Match.findOne({
      where: {
        user1Id: user1Id,
        user2Id: user2Id
      }
    });

    console.log('Existing match found:', existingMatch ? existingMatch.id : 'Not found');

    if (existingMatch) {
      // Update existing match to 'disliked' status and reset likes
      console.log('Updating existing match to disliked status');
      console.log('Previous status:', existingMatch.status);
      existingMatch.status = 'disliked';
      if (isCurrentUserUser1) {
        existingMatch.user1Liked = false;
      } else {
        existingMatch.user2Liked = false;
      }
      await existingMatch.save();
      console.log('Match updated successfully. New status:', existingMatch.status);
    } else {
      // Create new match record with dislike status
      console.log('Creating new match with disliked status');
      const matchData = {
        user1Id: user1Id,
        user2Id: user2Id,
        status: 'disliked'
      };
      
      if (isCurrentUserUser1) {
        matchData.user1Liked = false;
        matchData.user2Liked = false;
      } else {
        matchData.user1Liked = false;
        matchData.user2Liked = false;
      }
      
      const newMatch = await Match.create(matchData);
      console.log('New match created successfully. ID:', newMatch.id, 'Status:', newMatch.status);
    }

    console.log('Dislike operation completed successfully');
    console.log('=== DISLIKE PROFILE COMPLETED ===');
    res.json({ message: 'Profile disliked successfully' });
  } catch (error) {
    console.error('Dislike profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get my matches
// @route   GET /api/matches
// @access  Private
const getMyMatches = async (req, res) => {
  try {
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const matches = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ],
        status: 'matched'
      },
      include: [
        {
          model: UserProfile,
          as: 'user1',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        },
        {
          model: UserProfile,
          as: 'user2',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    // Format matches to show the other user's info with images
    const formattedMatches = await Promise.all(matches.map(async (match) => {
      const isUser1 = match.user1Id === currentProfile.id;
      const otherProfile = isUser1 ? match.user2 : match.user1;
      
      // Get the other user's images
      const images = await require('../models').Image.findAll({
        where: { userId: otherProfile.userId },
        attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
      });
      
      // Transform images to match frontend expectations
      const transformedImages = images.map(image => ({
        id: image.id,
        imageUrl: image.imageUrl,
        isPrimary: image.isPrimary,
        order: image.order,
        uploadedAt: image.createdAt
      }));

      // Create a transformed profile with images
      const profileData = otherProfile.toJSON();
      const transformedProfile = {
        id: profileData.id,
        userId: profileData.userId, // Include userId from UserProfile
        bio: profileData.bio,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        genderPreference: profileData.genderPreference,
        relationshipType: profileData.relationshipType,
        location: profileData.location,
        keyWords: profileData.keyWords,
        locationMode: profileData.locationMode,
        profilePicture: transformedImages.length > 0 ? transformedImages[0].imageUrl : null,
        images: transformedImages,
        user: {
          id: profileData.user.id,
          firstName: profileData.user.firstName,
          lastName: profileData.user.lastName,
          email: profileData.user.email,
          username: `${profileData.user.firstName} ${profileData.user.lastName}`.trim()
        },
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt
      };
      
      return {
        id: match.id,
        matchedAt: match.matchedAt,
        profile: transformedProfile
      };
    }));

    res.json(formattedMatches);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get match by ID
// @route   GET /api/matches/:id
// @access  Private
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const match = await Match.findOne({
      where: {
        id: id,
        [require('sequelize').Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ],
        status: 'matched'
      },
      include: [
        {
          model: UserProfile,
          as: 'user1',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        },
        {
          model: UserProfile,
          as: 'user2',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const isUser1 = match.user1Id === currentProfile.id;
    const otherProfile = isUser1 ? match.user2 : match.user1;

    // Get the other user's images
    const images = await require('../models').Image.findAll({
      where: { userId: otherProfile.userId },
      attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    
    // Transform images to match frontend expectations
    const transformedImages = images.map(image => ({
      id: image.id,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary,
      order: image.order,
      uploadedAt: image.createdAt
    }));

    // Create a transformed profile with images
    const profileData = otherProfile.toJSON();
    const transformedProfile = {
      id: profileData.id,
      bio: profileData.bio,
      birthDate: profileData.birthDate,
      gender: profileData.gender,
      genderPreference: profileData.genderPreference,
      relationshipType: profileData.relationshipType,
      location: profileData.location,
      keyWords: profileData.keyWords,
      locationMode: profileData.locationMode,
      profilePicture: transformedImages.length > 0 ? transformedImages[0].imageUrl : null,
      images: transformedImages,
      user: {
        id: profileData.user.id,
        firstName: profileData.user.firstName,
        lastName: profileData.user.lastName,
        email: profileData.user.email,
        username: `${profileData.user.firstName} ${profileData.user.lastName}`.trim()
      },
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt
    };

    res.json({
      id: match.id,
      matchedAt: match.matchedAt,
      profile: transformedProfile
    });
  } catch (error) {
    console.error('Get match by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get messages for a match
// @route   GET /api/matches/:id/messages
// @access  Private
const getMatchMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify the match exists and user is part of it
    const match = await Match.findOne({
      where: {
        id: id,
        [require('sequelize').Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ],
        status: 'matched'
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found or access denied' });
    }

    // Get messages for this match
    const messages = await Message.findAll({
      where: { matchId: id },
      include: [
        {
          model: UserProfile,
          as: 'sender',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Format messages to include sender info
    const formattedMessages = messages.map(message => ({
      id: message.id,
      match: message.matchId,
      content: message.content,
      timestamp: message.createdAt,
      isRead: message.isRead,
      sender: {
        id: message.sender.id,
        firstName: message.sender.user.firstName,
        lastName: message.sender.user.lastName,
        email: message.sender.user.email
      }
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get match messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Send a message to a match
// @route   POST /api/matches/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
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

    // Verify the match exists and user is part of it
    const match = await Match.findOne({
      where: {
        id: id,
        [require('sequelize').Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ],
        status: 'matched'
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found or access denied' });
    }

    // Create the message
    const message = await Message.create({
      matchId: id,
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
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    // Send FCM push notification to the recipient
    const recipientId = match.user1Id === currentProfile.id ? match.user2Id : match.user1Id;
    const recipientProfile = await UserProfile.findByPk(recipientId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['fcmToken', 'firstName', 'lastName', 'email']
      }]
    });
    
    if (recipientProfile && recipientProfile.user && recipientProfile.user.fcmToken) {
      // Only send notification if message was just created (within last 2 seconds)
      // This prevents duplicates when multiple requests hit the endpoint simultaneously
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      
      if (messageAge > 2000) {
        console.log(`⚠️  [HTTP] Skipping notification for message ${message.id} (message is ${messageAge}ms old - already processed)`);
      } else {
        console.log(`📤 [HTTP] Sending FCM notification to ${recipientProfile.user.email} (message ID: ${message.id}, age: ${messageAge}ms)`);
        const senderName = `${message.sender.user.firstName} ${message.sender.user.lastName}`;
        const messagePreview = content.trim().length > 50 ? content.trim().substring(0, 50) + '...' : content.trim();
        
        console.log(`   Sender: ${senderName}`);
        console.log(`   Message: ${messagePreview}`);
        
        const notificationSent = await sendMessageNotification(recipientProfile.user.fcmToken, {
          matchId: String(id),
          messageId: String(message.id),
          senderId: String(currentProfile.id),
          senderName: senderName,
          messagePreview: messagePreview
        });
        
        if (notificationSent) {
          console.log(`✅ [HTTP] FCM notification sent successfully to ${recipientProfile.user.email}`);
        } else {
          console.log(`❌ [HTTP] Failed to send FCM notification to ${recipientProfile.user.email}`);
        }
      }
    } else {
      console.log(`⚠️  [HTTP] Recipient has no FCM token - notification not sent`);
    }

    // Format the response
    const formattedMessage = {
      id: message.id,
      match: message.matchId,
      content: message.content,
      timestamp: message.createdAt,
      isRead: message.isRead,
      sender: {
        id: message.sender.id,
        firstName: message.sender.user.firstName,
        lastName: message.sender.user.lastName,
        email: message.sender.user.email
      }
    };

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Like a profile with a message
// @route   POST /api/matches/like-with-message
// @access  Private
const likeProfileWithMessage = async (req, res) => {
  try {
    console.log('=== LIKE PROFILE WITH MESSAGE REQUEST ===');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    
    const { profileId, message } = req.body;

    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message content cannot exceed 1000 characters' });
    }

    // Check if user can like (daily limit check)
    const likeStatus = await LikesService.checkAndResetDailyLikes(req.user.id);
    
    if (!likeStatus.canLike) {
      return res.status(429).json({ 
        error: 'Daily like limit reached',
        remainingLikes: likeStatus.remainingLikes,
        dailyLimit: likeStatus.dailyLimit,
        isPremium: likeStatus.isPremium,
        message: likeStatus.isPremium 
          ? 'You have unlimited likes with Premium!'
          : 'You have used all your free likes for today. Upgrade to Premium for unlimited likes or wait until tomorrow.'
      });
    }

    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    const targetProfile = await UserProfile.findByPk(profileId);

    console.log('Current profile found:', currentProfile ? currentProfile.id : 'Not found');
    console.log('Target profile found:', targetProfile ? targetProfile.id : 'Not found');

    if (!currentProfile) {
      return res.status(404).json({ error: 'Your profile not found' });
    }

    if (!targetProfile) {
      return res.status(404).json({ error: 'Target profile not found' });
    }

    if (currentProfile.id === targetProfile.id) {
      return res.status(400).json({ error: 'Cannot like your own profile' });
    }

    // Ensure consistent ordering: smaller ID is always user1Id
    const user1Id = Math.min(currentProfile.id, targetProfile.id);
    const user2Id = Math.max(currentProfile.id, targetProfile.id);
    const isCurrentUserUser1 = currentProfile.id === user1Id;

    console.log('User1Id:', user1Id, 'User2Id:', user2Id, 'IsCurrentUserUser1:', isCurrentUserUser1);

    // Check if there's already a match record between these users
    let existingMatch = await Match.findOne({
      where: {
        user1Id: user1Id,
        user2Id: user2Id
      }
    });

    console.log('Existing match found:', existingMatch ? existingMatch.id : 'Not found');

    if (existingMatch) {
      console.log('Updating existing match. Current status:', existingMatch.status);
      // Update existing match based on who is liking
      if (isCurrentUserUser1) {
        existingMatch.user1Liked = true;
      } else {
        existingMatch.user2Liked = true;
      }
      
      // Premium message feature: Automatically create match for premium users
      // Check if both users have liked each other OR if this is a premium message
      console.log('Premium message sent - creating match immediately!');
      existingMatch.status = 'matched';
      existingMatch.matchedAt = existingMatch.matchedAt || new Date();
      if (!existingMatch.user1Liked || !existingMatch.user2Liked) {
        // Mark both as liked for premium message feature
        existingMatch.user1Liked = true;
        existingMatch.user2Liked = true;
      }
      
      await existingMatch.save();
      console.log('Match updated successfully. New status:', existingMatch.status);
    } else {
      console.log('Creating new match record');
      // Premium message feature: Create as matched immediately
      const matchData = {
        user1Id: user1Id,
        user2Id: user2Id,
        status: 'matched',
        matchedAt: new Date(),
        user1Liked: true,
        user2Liked: true
      };
      
      existingMatch = await Match.create(matchData);
      console.log('New match created successfully as matched. ID:', existingMatch.id);
    }

    // Create the message
    const messageRecord = await Message.create({
      matchId: existingMatch.id,
      senderId: currentProfile.id,
      content: message.trim()
    });

    // Populate sender info for the message
    await messageRecord.reload({
      include: [
        {
          model: UserProfile,
          as: 'sender',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        }
      ]
    });

    // Format the message response
    const formattedMessage = {
      id: messageRecord.id,
      match: messageRecord.matchId,
      content: messageRecord.content,
      timestamp: messageRecord.createdAt,
      isRead: messageRecord.isRead,
      sender: {
        id: messageRecord.sender.id,
        firstName: messageRecord.sender.user.firstName,
        lastName: messageRecord.sender.user.lastName,
        email: messageRecord.sender.user.email
      }
    };

    // Premium message feature: Always create a match and send notifications
    console.log('MATCH CREATED! Processing match notification...');
    // Get the other user's profile info for notification
    const otherProfileId = currentProfile.id === existingMatch.user1Id ? existingMatch.user2Id : existingMatch.user1Id;
    const otherProfile = await UserProfile.findByPk(otherProfileId, {
      include: [{
        model: require('../models').User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'fcmToken']
      }]
    });

    // Emit match notification to both users via WebSocket
    if (req.io) {
      const matchData = {
        matchId: existingMatch.id,
        matchedAt: existingMatch.matchedAt,
        matchedUserId: otherProfileId,
        matchedUserName: `${otherProfile.user.firstName} ${otherProfile.user.lastName}`,
        currentUserId: req.user.id,
        currentUserName: `${req.user.firstName} ${req.user.lastName}`
      };

      // Emit to current user
      req.io.to(`user_${req.user.id}`).emit('new_match', {
        ...matchData,
        isCurrentUser: true
      });

      // Emit to other user
      req.io.to(`user_${otherProfile.userId}`).emit('new_match', {
        ...matchData,
        isCurrentUser: false
      });
    }

    // Send FCM push notification to the other user with message preview
    if (otherProfile.user.fcmToken) {
      console.log('Sending FCM message notification to other user');
      const senderName = `${req.user.firstName} ${req.user.lastName}`;
      const messagePreview = message.trim().length > 50 ? message.trim().substring(0, 50) + '...' : message.trim();
      
      await sendMessageNotification(otherProfile.user.fcmToken, {
        matchId: String(existingMatch.id),
        messageId: String(formattedMessage.id),
        senderId: String(currentProfile.id),
        senderName: senderName,
        messagePreview: messagePreview
      });
    }

    res.json({ 
      message: 'Match created! Your message was sent.', 
      isMatch: true,
      matchId: existingMatch.id,
      sentMessage: formattedMessage
    });
    
    console.log('=== LIKE PROFILE WITH MESSAGE COMPLETED ===');
  } catch (error) {
    console.error('Like profile with message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Unmatch a user
// @route   POST /api/matches/unmatch
// @access  Private
const unmatchUser = async (req, res) => {
  try {
    console.log('=== UNMATCH USER REQUEST ===');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    
    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'Your profile not found' });
    }

    // Find the match and verify the current user is part of it
    const match = await Match.findOne({
      where: {
        id: matchId,
        [require('sequelize').Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ],
        status: 'matched' // Only allow unmatching from matched status
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found or you are not part of this match' });
    }

    // Update match status to unmatched
    match.status = 'unmatched';
    await match.save();

    console.log('Match unmatch successful. Match ID:', match.id);

    // Emit unmatch notification via WebSocket if available
    if (req.io) {
      const otherProfileId = currentProfile.id === match.user1Id ? match.user2Id : match.user1Id;
      
      // Emit to current user
      req.io.to(`user_${req.user.id}`).emit('match_unmatched', {
        matchId: match.id,
        unmatchedAt: new Date(),
        currentUserId: req.user.id
      });

      // Emit to other user
      req.io.to(`user_${otherProfileId}`).emit('match_unmatched', {
        matchId: match.id,
        unmatchedAt: new Date(),
        currentUserId: req.user.id
      });
    }

    res.json({ 
      message: 'User unmatched successfully',
      matchId: match.id
    });
    
    console.log('=== UNMATCH USER COMPLETED ===');
  } catch (error) {
    console.error('Unmatch user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get pending messages (premium messages sent to people who haven't liked you back yet)
// @route   GET /api/matches/pending-messages
// @access  Private
const getPendingMessages = async (req, res) => {
  try {
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Find matches where current user has liked but the other person hasn't liked back
    // AND there are actual messages sent (premium message feature)
    const pendingMatches = await Match.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { user1Id: currentProfile.id },
          { user2Id: currentProfile.id }
        ],
        status: 'liked'
      },
      include: [
        {
          model: UserProfile,
          as: 'user1',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        },
        {
          model: UserProfile,
          as: 'user2',
          include: [{
            model: require('../models').User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email']
          }]
        },
        {
          model: Message,
          as: 'messages',
          where: {
            senderId: currentProfile.id
          },
          required: true // Only include matches that have messages from current user
        }
      ]
    });

    // Filter to only include matches where current user has liked but other person hasn't
    const filteredPendingMatches = pendingMatches.filter(match => {
      const isUser1 = match.user1Id === currentProfile.id;
      return isUser1 ? match.user1Liked && !match.user2Liked : match.user2Liked && !match.user1Liked;
    });

    // Format matches to show the other user's info with images
    const formattedPendingMatches = await Promise.all(filteredPendingMatches.map(async (match) => {
      const isUser1 = match.user1Id === currentProfile.id;
      const otherProfile = isUser1 ? match.user2 : match.user1;
      
      // Get the other user's images
      const images = await require('../models').Image.findAll({
        where: { userId: otherProfile.userId },
        attributes: ['id', 'userId', 'imageUrl', 'isPrimary', 'order', 'createdAt', 'updatedAt'],
        order: [['order', 'ASC'], ['createdAt', 'ASC']]
      });
      
      // Transform images to match frontend expectations
      const transformedImages = images.map(image => ({
        id: image.id,
        imageUrl: image.imageUrl,
        isPrimary: image.isPrimary,
        order: image.order,
        uploadedAt: image.createdAt
      }));

      // Create a transformed profile with images
      const profileData = otherProfile.toJSON();
      const transformedProfile = {
        id: profileData.id,
        bio: profileData.bio,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        genderPreference: profileData.genderPreference,
        relationshipType: profileData.relationshipType,
        location: profileData.location,
        keyWords: profileData.keyWords,
        locationMode: profileData.locationMode,
        profilePicture: transformedImages.length > 0 ? transformedImages[0].imageUrl : null,
        images: transformedImages,
        user: {
          id: profileData.user.id,
          firstName: profileData.user.firstName,
          lastName: profileData.user.lastName,
          email: profileData.user.email,
          username: `${profileData.user.firstName} ${profileData.user.lastName}`.trim()
        },
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt
      };
      
      // Get the latest message sent by current user
      const latestMessage = match.messages && match.messages.length > 0 
        ? match.messages[match.messages.length - 1] 
        : null;
      
      return {
        id: match.id,
        status: 'pending',
        profile: transformedProfile,
        lastMessage: latestMessage ? {
          id: latestMessage.id,
          content: latestMessage.content,
          timestamp: latestMessage.createdAt,
          isRead: latestMessage.isRead
        } : null
      };
    }));

    res.json(formattedPendingMatches);
  } catch (error) {
    console.error('Get pending messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get all likes received (Who Likes You feature)
// @route   GET /api/matches/likes-received
// @access  Private
const getLikesReceived = async (req, res) => {
  try {
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log(`Getting likes received for profile ${currentProfile.id}`);

    // Find all matches where someone has liked current user
    // Status = 'liked' means ONE person liked, not mutual yet
    const likesReceived = await Match.findAll({
      where: {
        [Op.or]: [
          {
            // Current user is user2, and user1 has liked them
            user2Id: currentProfile.id,
            user1Liked: true,
            user2Liked: false // Current user hasn't liked back yet
          },
          {
            // Current user is user1, and user2 has liked them  
            user1Id: currentProfile.id,
            user2Liked: true,
            user1Liked: false // Current user hasn't liked back yet
          }
        ],
        status: 'liked' // Not matched yet
      },
      include: [
        {
          model: UserProfile,
          as: 'user1',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        },
        {
          model: UserProfile,
          as: 'user2',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        }
      ],
      order: [['createdAt', 'DESC']] // Most recent likes first
    });

    console.log(`Found ${likesReceived.length} likes received`);

    // Format the response with the person who liked them
    const formattedLikes = likesReceived.map(match => {
      // Determine who liked the current user
      const isCurrentUserUser1 = match.user1Id === currentProfile.id;
      const likerProfile = isCurrentUserUser1 ? match.user2 : match.user1;
      
      return {
        matchId: match.id,
        likerId: likerProfile.id,
        likerUserId: likerProfile.userId,
        likerName: `${likerProfile.user.firstName} ${likerProfile.user.lastName}`,
        likerProfilePicture: likerProfile.profilePicture,
        likerBio: likerProfile.bio,
        likerKeywords: likerProfile.keyWords,
        likerAge: likerProfile.getAge(),
        likerGender: likerProfile.gender,
        likerLocation: likerProfile.location,
        likedAt: match.createdAt,
        // Full profile data for display
        profile: {
          id: likerProfile.id,
          userId: likerProfile.userId,
          profilePicture: likerProfile.profilePicture,
          bio: likerProfile.bio,
          birthDate: likerProfile.birthDate,
          age: likerProfile.getAge(),
          gender: likerProfile.gender,
          genderPreference: likerProfile.genderPreference,
          relationshipType: likerProfile.relationshipType,
          keyWords: likerProfile.keyWords,
          location: likerProfile.location,
          user: {
            id: likerProfile.user.id,
            firstName: likerProfile.user.firstName,
            lastName: likerProfile.user.lastName
          }
        }
      };
    });

    res.json({
      likesReceived: formattedLikes,
      totalCount: formattedLikes.length,
      isPremium: req.user.isPremium // Frontend can use this to gate feature
    });

  } catch (error) {
    console.error('Get likes received error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
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
}; 