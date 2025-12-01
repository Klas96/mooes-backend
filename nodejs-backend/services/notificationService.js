const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

// Track recently sent notifications to prevent duplicates
const sentNotifications = new Map();
const NOTIFICATION_DEDUP_WINDOW_MS = 5000; // 5 seconds

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Try to load service account from various locations
    const possiblePaths = [
      path.join(__dirname, '../firebase-service-account.json'),      // services/ -> mooves/
      path.join(__dirname, '../../firebase-service-account.json'),   // nodejs-backend/ -> mooves-backend/
      path.join(__dirname, '../../../firebase-service-account.json'), // mooves-backend/ -> mooves-project/
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    ].filter(Boolean);

    let serviceAccount = null;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        serviceAccount = require(filePath);
        console.log('✅ Firebase service account loaded from:', filePath);
        break;
      }
    }

    if (!serviceAccount) {
      console.warn('⚠️  Firebase service account not found. FCM notifications will not work.');
      console.warn('   Place firebase-service-account.json in the backend root directory.');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  }
};

// Initialize on module load
initializeFirebase();

/**
 * Send a push notification to a specific user
 * @param {string} fcmToken - User's FCM device token
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Additional data payload
 * @returns {Promise<boolean>} - Success status
 */
const sendNotification = async (fcmToken, notification) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notification.');
    return false;
  }

  if (!fcmToken) {
    console.warn('No FCM token provided. Skipping notification.');
    return false;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'mooves_notifications',
          sound: 'default',
          priority: 'high',
          icon: '@mipmap/ic_launcher',
          color: '#FF4081'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ FCM notification sent successfully:', response);
    return true;
  } catch (error) {
    console.error('❌ Failed to send FCM notification:', error.message);
    
    // If token is invalid, return false so caller can handle it
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log('Invalid or unregistered FCM token');
    }
    
    return false;
  }
};

/**
 * Send notification to multiple users
 * @param {Array<string>} fcmTokens - Array of FCM tokens
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} - Result with success and failure counts
 */
const sendMulticastNotification = async (fcmTokens, notification) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized. Skipping notifications.');
    return { successCount: 0, failureCount: fcmTokens.length };
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'mooves_notifications',
          sound: 'default',
          priority: 'high',
          icon: '@mipmap/ic_launcher',
          color: '#FF4081'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Multicast: ${response.successCount} sent, ${response.failureCount} failed`);
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    console.error('❌ Failed to send multicast notification:', error.message);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
};

/**
 * Send a new match notification
 * @param {string} fcmToken - Recipient's FCM token
 * @param {Object} matchData - Match information
 * @returns {Promise<boolean>}
 */
const sendMatchNotification = async (fcmToken, matchData) => {
  return sendNotification(fcmToken, {
    title: '🎉 New Match!',
    body: `You matched with ${matchData.name}! Start chatting now.`,
    data: {
      type: 'new_match',
      matchId: String(matchData.matchId),
      userId: String(matchData.userId),
      userName: matchData.name
    }
  });
};

/**
 * Send a new like notification
 * @param {string} fcmToken - Recipient's FCM token
 * @param {Object} likeData - Like information
 * @returns {Promise<boolean>}
 */
const sendLikeNotification = async (fcmToken, likeData) => {
  // Create deduplication key
  const dedupKey = `like_${likeData.likerId}_${likeData.likedUserId}_${Date.now()}`;
  
  // Check if we recently sent this notification (within 5 seconds)
  if (sentNotifications.has(dedupKey)) {
    console.log('⏭️  Skipping duplicate like notification');
    return false;
  }
  
  // Mark as sent
  sentNotifications.set(dedupKey, true);
  setTimeout(() => sentNotifications.delete(dedupKey), NOTIFICATION_DEDUP_WINDOW_MS);
  
  return sendNotification(fcmToken, {
    title: '💖 Someone likes you!',
    body: `${likeData.name} liked your profile. Like them back to match!`,
    data: {
      type: 'new_like',
      likerId: String(likeData.likerId),
      likerName: likeData.name,
      likedUserId: String(likeData.likedUserId)
    }
  });
};

/**
 * Send a new message notification
 * @param {string} fcmToken - Recipient's FCM token
 * @param {Object} messageData - Message information
 * @returns {Promise<boolean>}
 */
const sendMessageNotification = async (fcmToken, messageData) => {
  // Create a unique key for this notification to prevent duplicates
  const notificationKey = `message_${messageData.messageId}_${fcmToken}`;
  const now = Date.now();
  
  // Check if we've recently sent this exact notification
  if (sentNotifications.has(notificationKey)) {
    const lastSent = sentNotifications.get(notificationKey);
    if (now - lastSent < NOTIFICATION_DEDUP_WINDOW_MS) {
      console.log(`⚠️  Skipping duplicate message notification (message ID: ${messageData.messageId}, sent ${now - lastSent}ms ago)`);
      return false;
    }
  }
  
  // Mark this notification as sent
  sentNotifications.set(notificationKey, now);
  
  // Clean up old entries to prevent memory leak
  for (const [key, timestamp] of sentNotifications.entries()) {
    if (now - timestamp > NOTIFICATION_DEDUP_WINDOW_MS) {
      sentNotifications.delete(key);
    }
  }
  
  return sendNotification(fcmToken, {
    title: messageData.senderName,
    body: messageData.messagePreview,
    data: {
      type: 'new_message',
      matchId: String(messageData.matchId),
      messageId: String(messageData.messageId),
      senderId: String(messageData.senderId),
      senderName: messageData.senderName
    }
  });
};


/**
 * Send event invitation notification
 * @param {Object} invitedUser - User being invited
 * @param {Object} creator - User who created the event
 * @param {Object} event - Event information
 * @returns {Promise<boolean>}
 */
const sendEventInvitationNotification = async (invitedUser, creator, event) => {
  if (!invitedUser.fcmToken) {
    console.log(`User ${invitedUser.id} has no FCM token`);
    return false;
  }

  return sendNotification(invitedUser.fcmToken, {
    title: `Event Invitation from ${creator.firstName}`,
    body: `${creator.firstName} invited you to "${event.name}"`,
    data: {
      type: 'event_invitation',
      eventId: String(event.id),
      eventName: event.name,
      creatorId: String(creator.id),
      creatorName: `${creator.firstName} ${creator.lastName}`
    }
  });
};

module.exports = {
  sendNotification,
  sendMulticastNotification,
  sendMatchNotification,
  sendMessageNotification,
  sendLikeNotification,
  sendEventInvitationNotification
};

