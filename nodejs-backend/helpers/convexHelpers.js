/**
 * Convex Helper Functions
 * Utility functions for working with Convex data
 */

const bcrypt = require('bcryptjs');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 * @param {string} candidatePassword - Plain text password to check
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match
 */
async function comparePassword(candidatePassword, hashedPassword) {
  if (!hashedPassword) return false;
  return await bcrypt.compare(candidatePassword, hashedPassword);
}

/**
 * Convert Convex user to format compatible with existing code
 * @param {object} convexUser - User object from Convex
 * @returns {object} Formatted user object
 */
function formatUser(convexUser) {
  if (!convexUser) return null;
  
  return {
    id: convexUser._id, // Convex uses _id
    _id: convexUser._id,
    email: convexUser.email,
    password: convexUser.password,
    firstName: convexUser.firstName,
    lastName: convexUser.lastName,
    fcmToken: convexUser.fcmToken,
    isPremium: convexUser.isPremium,
    premiumExpiry: convexUser.premiumExpiry ? new Date(convexUser.premiumExpiry) : null,
    premiumPlan: convexUser.premiumPlan,
    isActive: convexUser.isActive,
    lastLogin: convexUser.lastLogin ? new Date(convexUser.lastLogin) : null,
    emailVerified: convexUser.emailVerified,
    emailVerificationToken: convexUser.emailVerificationToken,
    emailVerificationExpiry: convexUser.emailVerificationExpiry ? new Date(convexUser.emailVerificationExpiry) : null,
    resetPasswordToken: convexUser.resetPasswordToken,
    resetPasswordExpiry: convexUser.resetPasswordExpiry ? new Date(convexUser.resetPasswordExpiry) : null,
    aiMessageCount: convexUser.aiMessageCount || 0,
    createdAt: convexUser.createdAt ? new Date(convexUser.createdAt) : null,
    updatedAt: convexUser.updatedAt ? new Date(convexUser.updatedAt) : null,
    // Helper methods
    getFullName: function() {
      return `${this.firstName} ${this.lastName}`;
    },
    comparePassword: async function(candidatePassword) {
      return await comparePassword(candidatePassword, this.password);
    },
    toJSON: function() {
      const { password, ...userWithoutPassword } = this;
      return {
        ...userWithoutPassword,
        fullName: this.getFullName()
      };
    }
  };
}

/**
 * Convert Convex profile to format compatible with existing code
 * @param {object} convexProfile - Profile object from Convex
 * @returns {object} Formatted profile object
 */
function formatProfile(convexProfile) {
  if (!convexProfile) return null;
  
  return {
    id: convexProfile._id,
    _id: convexProfile._id,
    userId: convexProfile.userId,
    profilePicture: convexProfile.profilePicture,
    bio: convexProfile.bio,
    birthDate: convexProfile.birthDate,
    gender: convexProfile.gender,
    genderPreference: convexProfile.genderPreference,
    location: convexProfile.location,
    latitude: convexProfile.latitude,
    longitude: convexProfile.longitude,
    keyWords: convexProfile.keyWords || [],
    locationMode: convexProfile.locationMode,
    isHidden: convexProfile.isHidden,
    createdAt: convexProfile.createdAt ? new Date(convexProfile.createdAt) : null,
    updatedAt: convexProfile.updatedAt ? new Date(convexProfile.updatedAt) : null,
  };
}

/**
 * Convert date to milliseconds timestamp for Convex
 * @param {Date|string|number} date - Date to convert
 * @returns {number} Milliseconds timestamp
 */
function dateToTimestamp(date) {
  if (!date) return undefined;
  if (date instanceof Date) return date.getTime();
  if (typeof date === 'number') return date;
  return new Date(date).getTime();
}

/**
 * Convert date to ISO string for Convex
 * @param {Date|string} date - Date to convert
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function dateToISOString(date) {
  if (!date) return undefined;
  if (typeof date === 'string') return date.split('T')[0]; // Already ISO string
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Convert Convex store to format compatible with existing code
 * @param {object} convexStore - Store object from Convex
 * @returns {object} Formatted store object
 */
function formatStore(convexStore) {
  if (!convexStore) return null;
  
  const formatted = {
    id: convexStore._id, // Convex uses _id
    _id: convexStore._id,
    userId: convexStore.userId,
    storeName: convexStore.storeName,
    description: convexStore.description,
    logo: convexStore.logo,
    profilePicture: convexStore.profilePicture,
    location: convexStore.location,
    website: convexStore.website,
    latitude: convexStore.latitude,
    longitude: convexStore.longitude,
    isActive: convexStore.isActive,
    createdAt: convexStore.createdAt ? new Date(convexStore.createdAt) : null,
    updatedAt: convexStore.updatedAt ? new Date(convexStore.updatedAt) : null,
  };
  
  // Include user if present
  if (convexStore.user) {
    formatted.user = formatUser(convexStore.user);
  }
  
  // Add toJSON method for compatibility
  formatted.toJSON = function() {
    return { ...this };
  };
  
  return formatted;
}

/**
 * Convert Convex store goal to format compatible with existing code
 * @param {object} convexGoal - Store goal object from Convex
 * @returns {object} Formatted store goal object
 */
function formatStoreGoal(convexGoal) {
  if (!convexGoal) return null;
  
  const formatted = {
    id: convexGoal._id,
    _id: convexGoal._id,
    storeId: convexGoal.storeId,
    title: convexGoal.title,
    description: convexGoal.description,
    targetDistanceMeters: convexGoal.targetDistanceMeters,
    targetDurationMinutes: convexGoal.targetDurationMinutes,
    startDate: convexGoal.startDate,
    endDate: convexGoal.endDate,
    isActive: convexGoal.isActive,
    maxParticipants: convexGoal.maxParticipants,
    couponCode: convexGoal.couponCode,
    couponDescription: convexGoal.couponDescription,
    couponDiscount: convexGoal.couponDiscount,
    couponDiscountAmount: convexGoal.couponDiscountAmount,
    createdAt: convexGoal.createdAt ? new Date(convexGoal.createdAt) : null,
    updatedAt: convexGoal.updatedAt ? new Date(convexGoal.updatedAt) : null,
  };
  
  // Include store if present
  if (convexGoal.store) {
    formatted.store = formatStore(convexGoal.store);
  }
  
  // Add toJSON method for compatibility
  formatted.toJSON = function() {
    return { ...this };
  };
  
  return formatted;
}

/**
 * Convert Convex coupon to format compatible with existing code
 * @param {object} convexCoupon - Coupon object from Convex
 * @returns {object} Formatted coupon object
 */
function formatCoupon(convexCoupon) {
  if (!convexCoupon) return null;
  
  const formatted = {
    id: convexCoupon._id,
    _id: convexCoupon._id,
    userId: convexCoupon.userId,
    goalId: convexCoupon.goalId,
    storeId: convexCoupon.storeId,
    code: convexCoupon.code,
    description: convexCoupon.description,
    discount: convexCoupon.discount,
    discountAmount: convexCoupon.discountAmount,
    isUsed: convexCoupon.isUsed,
    usedAt: convexCoupon.usedAt ? new Date(convexCoupon.usedAt) : null,
    expiresAt: convexCoupon.expiresAt ? new Date(convexCoupon.expiresAt) : null,
    qrCode: convexCoupon.qrCode,
    createdAt: convexCoupon.createdAt ? new Date(convexCoupon.createdAt) : null,
    updatedAt: convexCoupon.updatedAt ? new Date(convexCoupon.updatedAt) : null,
  };
  
  // Include store if present
  if (convexCoupon.store) {
    formatted.store = formatStore(convexCoupon.store);
  }
  
  // Include goal if present
  if (convexCoupon.goal) {
    formatted.goal = formatStoreGoal(convexCoupon.goal);
  }
  
  // Include user if present
  if (convexCoupon.user) {
    formatted.user = formatUser(convexCoupon.user);
  }
  
  // Add toJSON method for compatibility
  formatted.toJSON = function() {
    return { ...this };
  };
  
  return formatted;
}

module.exports = {
  hashPassword,
  comparePassword,
  formatUser,
  formatProfile,
  formatStore,
  formatStoreGoal,
  formatCoupon,
  dateToTimestamp,
  dateToISOString,
};

