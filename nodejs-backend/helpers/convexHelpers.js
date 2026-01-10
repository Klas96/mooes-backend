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

module.exports = {
  hashPassword,
  comparePassword,
  formatUser,
  formatProfile,
  dateToTimestamp,
  dateToISOString,
};

