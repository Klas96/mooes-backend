const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, UserProfile, Match, Message, Group, GroupMember, GroupMessage } = require('../models');
const { sendMessageNotification } = require('../services/notificationService');


const setupWebSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: '*', // Allow all origins for mobile app compatibility
      credentials: false, // Changed to false when using origin: '*'
      methods: ['GET', 'POST']
    }
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      const user = await User.findByPk(userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.email}`);

    try {
      // Get user's profile
      const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
      
      if (userProfile) {
        // Join user's personal room
        socket.join(`user_${socket.userId}`);
        
        // Join all match rooms for this user
        const matches = await Match.findAll({
          where: {
            [require('sequelize').Op.or]: [
              { user1Id: userProfile.id },
              { user2Id: userProfile.id }
            ],
            status: 'matched'
          }
        });

        matches.forEach(match => {
          socket.join(`match_${match.id}`);
        });

        console.log(`User ${socket.user.email} joined ${matches.length} match rooms`);
        
        // Join all group rooms for this user
        const groupMembers = await GroupMember.findAll({
          where: { userProfileId: userProfile.id }
        });
        
        groupMembers.forEach(gm => {
          socket.join(`group_${gm.groupId}`);
        });
        
        console.log(`User ${socket.user.email} joined ${groupMembers.length} group rooms`);
      }
    } catch (error) {
      console.error('Error setting up socket rooms:', error);
    }

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { matchId, content } = data;

        if (!matchId || !content) {
          socket.emit('error', { message: 'Match ID and content are required' });
          return;
        }

        // Verify user is part of this match
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        const match = await Match.findOne({
          where: {
            id: matchId,
            [require('sequelize').Op.or]: [
              { user1Id: userProfile.id },
              { user2Id: userProfile.id }
            ],
            status: 'matched'
          }
        });

        if (!match) {
          socket.emit('error', { message: 'Match not found or access denied' });
          return;
        }

        // Create message
        const message = await Message.create({
          matchId: matchId,
          senderId: userProfile.id,
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
                attributes: ['firstName', 'lastName']
              }]
            }
          ]
        });

        const messageData = {
          id: message.id,
          matchId: matchId,
          content: message.content,
          sender: {
            id: message.sender.id,
            firstName: message.sender.user.firstName,
            lastName: message.sender.user.lastName
          },
          timestamp: message.createdAt,
          isRead: message.isRead
        };

        // Emit to all users in the match room
        io.to(`match_${matchId}`).emit('new_message', messageData);

        // Send push notification to the other user in the match
        const recipientId = match.user1Id === userProfile.id ? match.user2Id : match.user1Id;
        const recipientProfile = await UserProfile.findByPk(recipientId, {
          include: [{
            model: User,
            as: 'user',
            attributes: ['fcmToken']
          }]
        });
        
        if (recipientProfile) {
          // Emit notification to the recipient's personal room
          io.to(`user_${recipientProfile.userId}`).emit('new_message', {
            ...messageData,
            notification: true
          });

          // Send FCM push notification
          if (recipientProfile.user && recipientProfile.user.fcmToken) {
            console.log(`📤 [WebSocket] Sending FCM notification to ${recipientProfile.user.email}`);
            const senderName = `${message.sender.user.firstName} ${message.sender.user.lastName}`;
            const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
            
            console.log(`   [WebSocket] Sender: ${senderName}`);
            console.log(`   [WebSocket] Message: ${messagePreview}`);
            
            const notificationSent = await sendMessageNotification(recipientProfile.user.fcmToken, {
              matchId: String(matchId),
              messageId: String(message.id),
              senderId: String(userProfile.id),
              senderName: senderName,
              messagePreview: messagePreview
            });
            
            if (notificationSent) {
              console.log(`✅ [WebSocket] FCM notification sent successfully to ${recipientProfile.user.email}`);
            } else {
              console.log(`❌ [WebSocket] Failed to send FCM notification to ${recipientProfile.user.email}`);
            }
          } else {
            console.log(`⚠️  [WebSocket] Recipient has no FCM token - notification not sent`);
          }
        }

        console.log(`Message sent in match ${matchId} by ${socket.user.email}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', async (data) => {
      try {
        const { matchId } = data;
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        
        // Verify user is part of this match
        const match = await Match.findOne({
          where: {
            id: matchId,
            [require('sequelize').Op.or]: [
              { user1Id: userProfile.id },
              { user2Id: userProfile.id }
            ],
            status: 'matched'
          }
        });

        if (match) {
          socket.to(`match_${matchId}`).emit('user_typing', {
            matchId,
            userId: socket.userId,
            firstName: socket.user.firstName
          });
        }
      } catch (error) {
        console.error('Error handling typing start:', error);
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const { matchId } = data;
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        
        // Verify user is part of this match
        const match = await Match.findOne({
          where: {
            id: matchId,
            [require('sequelize').Op.or]: [
              { user1Id: userProfile.id },
              { user2Id: userProfile.id }
            ],
            status: 'matched'
          }
        });

        if (match) {
          socket.to(`match_${matchId}`).emit('user_stopped_typing', {
            matchId,
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Error handling typing stop:', error);
      }
    });

    // Handle group message
    socket.on('send_group_message', async (data) => {
      try {
        const { groupId, content } = data;

        if (!groupId || !content) {
          socket.emit('error', { message: 'Group ID and content are required' });
          return;
        }

        // Verify user is a member of this group
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        const groupMember = await GroupMember.findOne({
          where: {
            groupId: groupId,
            userProfileId: userProfile.id
          }
        });

        if (!groupMember) {
          socket.emit('error', { message: 'Group not found or access denied' });
          return;
        }

        // Create message
        const message = await GroupMessage.create({
          groupId: groupId,
          senderId: userProfile.id,
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
                attributes: ['firstName', 'lastName']
              }]
            }
          ]
        });

        const messageData = {
          id: message.id,
          groupId: groupId,
          content: message.content,
          sender: {
            id: message.sender.id,
            firstName: message.sender.user.firstName,
            lastName: message.sender.user.lastName
          },
          timestamp: message.createdAt
        };

        // Emit to all users in the group room
        io.to(`group_${groupId}`).emit('new_group_message', messageData);

        console.log(`Group message sent in group ${groupId} by ${socket.user.email}`);
      } catch (error) {
        console.error('Error sending group message:', error);
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    // Handle group typing indicator
    socket.on('group_typing_start', async (data) => {
      try {
        const { groupId } = data;
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        
        // Verify user is a member of this group
        const groupMember = await GroupMember.findOne({
          where: {
            groupId: groupId,
            userProfileId: userProfile.id
          }
        });

        if (groupMember) {
          socket.to(`group_${groupId}`).emit('group_user_typing', {
            groupId,
            userId: socket.userId,
            firstName: socket.user.firstName
          });
        }
      } catch (error) {
        console.error('Error handling group typing start:', error);
      }
    });

    socket.on('group_typing_stop', async (data) => {
      try {
        const { groupId } = data;
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        
        // Verify user is a member of this group
        const groupMember = await GroupMember.findOne({
          where: {
            groupId: groupId,
            userProfileId: userProfile.id
          }
        });

        if (groupMember) {
          socket.to(`group_${groupId}`).emit('group_user_stopped_typing', {
            groupId,
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Error handling group typing stop:', error);
      }
    });

    // Handle message read
    socket.on('mark_read', async (data) => {
      try {
        const { matchId } = data;
        const userProfile = await UserProfile.findOne({ where: { userId: socket.userId } });
        
        // Verify user is part of this match
        const match = await Match.findOne({
          where: {
            id: matchId,
            [require('sequelize').Op.or]: [
              { user1Id: userProfile.id },
              { user2Id: userProfile.id }
            ],
            status: 'matched'
          }
        });

        if (match) {
          // Mark messages as read
          await Message.update(
            {
              isRead: true,
              readAt: new Date()
            },
            {
              where: {
                matchId: matchId,
                senderId: { [require('sequelize').Op.ne]: userProfile.id },
                isRead: false
              }
            }
          );

          // Notify other users in the match
          socket.to(`match_${matchId}`).emit('messages_read', {
            matchId,
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email}`);
    });
  });

  return io;
};

module.exports = setupWebSocket; 