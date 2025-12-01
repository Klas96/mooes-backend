const cron = require('node-cron');
const { User, UserProfile, Match, Event } = require('../models');
const { Op } = require('sequelize');
const { sendNotification } = require('./notificationService');

/**
 * Notification Scheduler Service
 * Handles weekly match recommendation notifications
 */

class NotificationScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduled jobs
   */
  start() {
    console.log('🔔 Starting notification scheduler...');
    
    // Get current server time for logging
    const now = new Date();
    const serverTime = now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    console.log(`   Server time: ${serverTime}`);
    console.log(`   Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    // Weekly match recommendations - Every Friday at 18:00 (6:00 PM) server time
    const weeklyMatchJob = cron.schedule('0 18 * * 5', async () => {
      const jobTime = new Date().toLocaleString();
      console.log(`📅 Running weekly match recommendations job at ${jobTime}...`);
      await this.sendWeeklyMatchRecommendations();
    }, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Daily event cleanup - Every day at 03:00 (3:00 AM) to remove old events
    const eventCleanupJob = cron.schedule('0 3 * * *', async () => {
      const jobTime = new Date().toLocaleString();
      console.log(`🗑️  Running event cleanup job at ${jobTime}...`);
      await this.cleanupOldEvents();
    }, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Daily event digest - Every day at 09:00 (9:00 AM) to show today's events
    const eventDigestJob = cron.schedule('0 9 * * *', async () => {
      const jobTime = new Date().toLocaleString();
      console.log(`📅 Running daily event digest job at ${jobTime}...`);
      await this.sendDailyEventDigest();
    }, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    this.jobs.push(weeklyMatchJob);
    this.jobs.push(eventCleanupJob);
    this.jobs.push(eventDigestJob);

    console.log('✅ Notification scheduler started');
    console.log('📋 Scheduled jobs:');
    console.log(`   - Weekly match recommendations: Every Friday at 18:00 (6:00 PM) ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`   - Event cleanup (2 days after event): Every day at 03:00 (3:00 AM) ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`   - Daily event digest: Every day at 09:00 (9:00 AM) ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 Stopping notification scheduler...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('✅ Notification scheduler stopped');
  }

  /**
   * Send weekly match recommendations to all active users
   */
  async sendWeeklyMatchRecommendations() {
    try {
      console.log('🔍 Finding users for weekly match recommendations...');

      // Get all users who have notification preferences enabled
      const users = await User.findAll({
        where: {
          emailVerified: true,
          notificationPreferences: {
            weeklyMatches: true
          }
        },
        attributes: ['id', 'email', 'fcmToken', 'emailVerified', 'notificationPreferences'],
        include: ['profile']
      });

      console.log(`📊 Found ${users.length} users eligible for notifications`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          if (!user.profile) {
            console.log(`⚠️  User ${user.id} has no profile, skipping...`);
            continue;
          }

          // Find top matches for this user
          const matches = await this.findTopMatches(user.profile.id);

          if (matches.length === 0) {
            console.log(`ℹ️  No matches found for user ${user.id}`);
            continue;
          }

          // Send notification
          await this.sendMatchNotification(user, matches);
          successCount++;

          console.log(`✅ Sent notification to user ${user.id} (${matches.length} matches)`);
        } catch (error) {
          console.error(`❌ Error sending notification to user ${user.id}:`, error);
          errorCount++;
        }
      }

      console.log(`📊 Weekly match notifications complete:`);
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Errors: ${errorCount}`);
    } catch (error) {
      console.error('❌ Error in sendWeeklyMatchRecommendations:', error);
    }
  }

  /**
   * Find top matches for a user
   */
  async findTopMatches(profileId, limit = 5) {
    try {
      const userProfile = await UserProfile.findByPk(profileId);
      if (!userProfile) return [];

      // Get existing matches
      const matches = await Match.findAll({
        where: {
          [Op.or]: [
            { user1Id: profileId },
            { user2Id: profileId }
          ]
        }
      });

      const matchedProfileIds = matches.map(m => 
        m.user1Id === profileId ? m.user2Id : m.user1Id
      );

      // Combine excluded IDs (only matched profiles and self)
      const excludedIds = [...new Set([...matchedProfileIds, profileId])];

      // Find potential matches
      const potentialMatches = await UserProfile.findAll({
        where: {
          id: { [Op.notIn]: excludedIds }
        },
        limit: limit * 3, // Get more to filter
        order: [['createdAt', 'DESC']]
      });

      // Score and sort matches based on keyword overlap
      const scoredMatches = potentialMatches.map(profile => {
        const score = this.calculateMatchScore(userProfile, profile);
        return { profile, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

      return scoredMatches.map(m => m.profile);
    } catch (error) {
      console.error('Error finding top matches:', error);
      return [];
    }
  }

  /**
   * Calculate match score based on shared keywords
   */
  calculateMatchScore(userProfile, otherProfile) {
    let score = 0;

    // Ensure keyWords is an array (handle both array and comma-separated string)
    const userKeywords = Array.isArray(userProfile.keyWords) 
      ? userProfile.keyWords 
      : (userProfile.keyWords ? String(userProfile.keyWords).split(',').map(k => k.trim()) : []);
    
    const otherKeywords = Array.isArray(otherProfile.keyWords)
      ? otherProfile.keyWords
      : (otherProfile.keyWords ? String(otherProfile.keyWords).split(',').map(k => k.trim()) : []);

    // Keyword overlap
    const sharedKeywords = userKeywords.filter(k => otherKeywords.includes(k));
    score += sharedKeywords.length * 10;

    // Gender compatibility
    const userGender = userProfile.gender;
    const userPreference = userProfile.genderPreference;
    const otherGender = otherProfile.gender;
    const otherPreference = otherProfile.genderPreference;

    const userSeeksOther = userPreference === 'B' || userPreference === otherGender;
    const otherSeeksUser = otherPreference === 'B' || otherPreference === userGender;

    if (userSeeksOther && otherSeeksUser) {
      score += 5;
    } else {
      return 0; // No compatibility
    }

    return score;
  }

  /**
   * Send match notification to user
   * This would integrate with your notification service (FCM, email, etc.)
   */
  async sendMatchNotification(user, matches) {
    const matchCount = matches.length;
    const title = `🔥 ${matchCount} new people match your interests!`;
    
    // Get first few keywords for personalization
    const userKeyWords = user.profile?.keyWords;
    const keywords = Array.isArray(userKeyWords)
      ? userKeyWords.slice(0, 3)
      : (userKeyWords ? String(userKeyWords).split(',').map(k => k.trim()).slice(0, 3) : []);
    const keywordText = keywords.length > 0 ? keywords.join(', ') : 'your interests';
    
    const body = `We found ${matchCount} people who love ${keywordText} too. Check them out!`;

    const notificationData = {
      userId: user.id,
      email: user.email,
      title,
      body,
      type: 'weekly_matches',
      data: {
        matchCount: String(matchCount),
        profileIds: matches.map(m => String(m.id)).join(','),
        type: 'weekly_matches'
      },
      createdAt: new Date()
    };

    // Send FCM push notification
    if (user.fcmToken) {
      try {
        const sent = await sendNotification(user.fcmToken, {
          title,
          body,
          data: notificationData.data
        });
        
        if (sent) {
          console.log(`✅ FCM notification sent to user ${user.id} (${user.email})`);
        } else {
          console.log(`⚠️  FCM notification failed for user ${user.id} (${user.email})`);
        }
      } catch (error) {
        console.error(`❌ Error sending FCM notification to user ${user.id}:`, error);
      }
    } else {
      console.log(`⚠️  User ${user.id} has no FCM token, skipping push notification`);
    }

    return notificationData;
  }

  /**
   * Manual trigger for testing (can be called via API endpoint)
   */
  async triggerWeeklyMatchNotifications() {
    console.log('🧪 Manually triggering weekly match notifications...');
    await this.sendWeeklyMatchRecommendations();
  }

  /**
   * Clean up events that are 2 days past their event date
   */
  async cleanupOldEvents() {
    try {
      console.log('🗑️  Starting event cleanup...');

      // Calculate the cutoff date (2 days ago)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0); // Start of day

      console.log(`   Cutoff date: ${twoDaysAgo.toISOString()}`);

      // Find events that are older than 2 days past their event date
      const oldEvents = await Event.findAll({
        where: {
          eventDate: {
            [Op.lt]: twoDaysAgo,
            [Op.not]: null // Only events with an event date
          }
        },
        attributes: ['id', 'name', 'eventDate', 'status']
      });

      if (oldEvents.length === 0) {
        console.log('   No events to clean up');
        return;
      }

      console.log(`   Found ${oldEvents.length} events to delete`);

      // Delete the events (cascade will delete participants too)
      const deletedCount = await Event.destroy({
        where: {
          id: {
            [Op.in]: oldEvents.map(e => e.id)
          }
        }
      });

      console.log(`✅ Event cleanup complete: ${deletedCount} events deleted`);
      
      // Log some details about deleted events
      oldEvents.slice(0, 5).forEach(event => {
        console.log(`   - Deleted: "${event.name}" (${event.eventDate.toISOString().split('T')[0]})`);
      });
      
      if (oldEvents.length > 5) {
        console.log(`   ... and ${oldEvents.length - 5} more`);
      }

      return { deleted: deletedCount };
    } catch (error) {
      console.error('❌ Error in event cleanup:', error);
      return { deleted: 0, error: error.message };
    }
  }

  /**
   * Manual trigger for event cleanup (testing)
   */
  async triggerEventCleanup() {
    console.log('🧪 Manually triggering event cleanup...');
    return await this.cleanupOldEvents();
  }

  /**
   * Send daily event digest to users
   * Shows today's and tomorrow's events that match their interests
   */
  async sendDailyEventDigest() {
    try {
      console.log('📅 Starting daily event digest...');

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 2); // Today + tomorrow

      console.log(`   Date range: ${today.toISOString()} to ${tomorrow.toISOString()}`);

      // Find events happening today or tomorrow
      const upcomingEvents = await Event.findAll({
        where: {
          status: 'upcoming',
          isPublic: true,
          eventDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        }],
        order: [['eventDate', 'ASC']]
      });

      if (upcomingEvents.length === 0) {
        console.log('   No events happening today/tomorrow');
        return { sent: 0 };
      }

      console.log(`   Found ${upcomingEvents.length} events happening soon`);

      // Get users who should receive event notifications
      const users = await User.findAll({
        where: {
          emailVerified: true,
          fcmToken: { [Op.not]: null },
          notificationPreferences: {
            newMatches: true // Using existing preference, could add eventDigest later
          }
        },
        include: ['profile'],
        attributes: ['id', 'email', 'fcmToken']
      });

      console.log(`   Found ${users.length} users eligible for event digest`);

      let sentCount = 0;

      for (const user of users) {
        try {
          // Find events matching user's interests
          const userKeywords = user.profile?.keyWords || [];
          
          const relevantEvents = upcomingEvents.filter(event => {
            // Parse event tags
            const eventTags = Array.isArray(event.tags) 
              ? event.tags 
              : (event.tags ? JSON.parse(event.tags) : []);
            
            // Check if any event tags match user keywords
            if (userKeywords.length > 0 && eventTags.length > 0) {
              return eventTags.some(tag => 
                userKeywords.some(keyword => 
                  keyword.toLowerCase().includes(tag.toLowerCase()) ||
                  tag.toLowerCase().includes(keyword.toLowerCase())
                )
              );
            }
            
            // If user has no keywords, show all events
            return userKeywords.length === 0;
          });

          if (relevantEvents.length === 0) {
            continue; // Skip users with no relevant events
          }

          // Send notification
          const eventCount = relevantEvents.length;
          const firstEvent = relevantEvents[0];
          const title = eventCount === 1 
            ? `📅 ${firstEvent.name} happening soon!`
            : `📅 ${eventCount} events happening soon!`;
          
          const body = eventCount === 1
            ? `${firstEvent.name} - Check it out!`
            : `${firstEvent.name} and ${eventCount - 1} more events you might like`;

          const sent = await sendNotification(user.fcmToken, {
            title,
            body,
            data: {
              type: 'event_digest',
              eventCount: String(eventCount),
              eventIds: relevantEvents.map(e => String(e.id)).join(',')
            }
          });

          if (sent) {
            sentCount++;
            console.log(`   ✅ Sent digest to user ${user.id} (${eventCount} events)`);
          }
        } catch (error) {
          console.error(`   ❌ Error sending digest to user ${user.id}:`, error);
        }
      }

      console.log(`✅ Daily event digest complete: ${sentCount} notifications sent`);
      return { sent: sentCount };
    } catch (error) {
      console.error('❌ Error in sendDailyEventDigest:', error);
      return { sent: 0, error: error.message };
    }
  }

  /**
   * Manual trigger for event digest (testing)
   */
  async triggerEventDigest() {
    console.log('🧪 Manually triggering daily event digest...');
    return await this.sendDailyEventDigest();
  }
}

// Singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;

