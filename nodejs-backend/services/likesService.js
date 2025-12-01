const { User } = require('../models');

class LikesService {
  // Constants for like limits
  static FREE_DAILY_LIKES = 10;
  static PREMIUM_DAILY_LIKES = -1; // -1 indicates unlimited

  /**
   * Check if user can like and reset daily likes if needed
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Object with canLike boolean and remaining likes count
   */
  static async checkAndResetDailyLikes(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if we need to reset daily likes
      const shouldReset = await this.shouldResetDailyLikes(user);
      
      if (shouldReset) {
        await this.resetDailyLikes(user);
        user.dailyLikesUsed = 0;
        user.lastLikeResetDate = new Date();
        await user.save();
      }

      // Determine like limit based on premium status
      const isPremium = user.isPremium && 
                       user.premiumExpiry && 
                       new Date() < new Date(user.premiumExpiry);
      
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIKES : this.FREE_DAILY_LIKES;
      
      // Premium users have unlimited likes
      if (isPremium) {
        return {
          canLike: true,
          remainingLikes: -1, // -1 indicates unlimited
          dailyLimit: -1, // -1 indicates unlimited
          isPremium,
          dailyLikesUsed: user.dailyLikesUsed
        };
      }
      
      // Free users have limited likes
      const remainingLikes = Math.max(0, dailyLimit - user.dailyLikesUsed);
      const canLike = remainingLikes > 0;

      return {
        canLike,
        remainingLikes,
        dailyLimit,
        isPremium,
        dailyLikesUsed: user.dailyLikesUsed
      };
    } catch (error) {
      console.error('Error checking daily likes:', error);
      throw error;
    }
  }

  /**
   * Check if daily likes should be reset
   * @param {Object} user - The user object
   * @returns {Promise<boolean>} - True if likes should be reset
   */
  static async shouldResetDailyLikes(user) {
    if (!user.lastLikeResetDate) {
      return true; // First time using likes
    }

    const lastReset = new Date(user.lastLikeResetDate);
    const now = new Date();
    
    // Reset if it's a different day
    return lastReset.getDate() !== now.getDate() ||
           lastReset.getMonth() !== now.getMonth() ||
           lastReset.getFullYear() !== now.getFullYear();
  }

  /**
   * Reset daily likes for a user
   * @param {Object} user - The user object
   */
  static async resetDailyLikes(user) {
    user.dailyLikesUsed = 0;
    user.lastLikeResetDate = new Date();
    await user.save();
    console.log(`Reset daily likes for user ${user.id}`);
  }

  /**
   * Increment daily likes used for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Updated like status
   */
  static async incrementDailyLikes(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check and reset if needed before incrementing
      const shouldReset = await this.shouldResetDailyLikes(user);
      if (shouldReset) {
        await this.resetDailyLikes(user);
      }

      // Increment likes used
      user.dailyLikesUsed += 1;
      await user.save();

      // Get updated status
      const isPremium = user.isPremium && 
                       user.premiumExpiry && 
                       new Date() < new Date(user.premiumExpiry);
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIKES : this.FREE_DAILY_LIKES;
      
      // Premium users have unlimited likes
      if (isPremium) {
        return {
          dailyLikesUsed: user.dailyLikesUsed,
          remainingLikes: -1, // -1 indicates unlimited
          dailyLimit: -1, // -1 indicates unlimited
          isPremium
        };
      }
      
      // Free users have limited likes
      const remainingLikes = Math.max(0, dailyLimit - user.dailyLikesUsed);

      return {
        dailyLikesUsed: user.dailyLikesUsed,
        remainingLikes,
        dailyLimit,
        isPremium
      };
    } catch (error) {
      console.error('Error incrementing daily likes:', error);
      throw error;
    }
  }

  /**
   * Get current like status for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Current like status
   */
  static async getLikeStatus(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check and reset if needed
      const shouldReset = await this.shouldResetDailyLikes(user);
      if (shouldReset) {
        await this.resetDailyLikes(user);
      }

      const isPremium = user.isPremium && 
                       user.premiumExpiry && 
                       new Date() < new Date(user.premiumExpiry);
      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIKES : this.FREE_DAILY_LIKES;
      
      // Premium users have unlimited likes
      if (isPremium) {
        return {
          dailyLikesUsed: user.dailyLikesUsed,
          remainingLikes: -1, // -1 indicates unlimited
          dailyLimit: -1, // -1 indicates unlimited
          isPremium,
          canLike: true
        };
      }
      
      // Free users have limited likes
      const remainingLikes = Math.max(0, dailyLimit - user.dailyLikesUsed);

      return {
        dailyLikesUsed: user.dailyLikesUsed,
        remainingLikes,
        dailyLimit,
        isPremium,
        canLike: remainingLikes > 0
      };
    } catch (error) {
      console.error('Error getting like status:', error);
      throw error;
    }
  }
}

module.exports = LikesService; 