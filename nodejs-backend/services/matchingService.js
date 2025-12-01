/**
 * Smart Matching Service
 * Ranks profiles and events by relevance BEFORE sending to AI
 * Reduces tokens, improves quality, lowers costs
 */

const { UserProfile, Event, User, EventParticipant } = require('../models');
const { Op } = require('sequelize');

/**
 * Normalize keywords to an array of strings
 */
function normalizeKeywords(keywords) {
  if (!keywords) return [];
  
  if (Array.isArray(keywords)) {
    return keywords.filter(Boolean).map(keyword => String(keyword));
  }
  
  if (typeof keywords === 'string') {
    const trimmed = keywords.trim();
    if (trimmed.length === 0) return [];
    
    // Try to parse JSON string if it looks like an array
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map(keyword => String(keyword));
        }
      } catch (e) {
        // Fall through to comma-separated handling
      }
    }
    
    // Fallback: treat as comma-separated list
    return trimmed.split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .map(keyword => String(keyword));
  }
  
  return [];
}

/**
 * Calculate keyword similarity score (0-1)
 */
function calculateKeywordSimilarity(userKeywords, otherKeywords) {
  const normalizedUserKeywords = normalizeKeywords(userKeywords);
  const normalizedOtherKeywords = normalizeKeywords(otherKeywords);

  if (normalizedUserKeywords.length === 0 || normalizedOtherKeywords.length === 0) {
    return 0;
  }
  
  const userSet = new Set(normalizedUserKeywords.map(k => k.toLowerCase()));
  const otherSet = new Set(normalizedOtherKeywords.map(k => k.toLowerCase()));
  
  // Count matching keywords
  let matches = 0;
  for (const keyword of userSet) {
    if (otherSet.has(keyword)) {
      matches++;
    }
  }
  
  // Jaccard similarity: intersection / union
  const union = new Set([...userSet, ...otherSet]).size;
  return matches / union;
}

/**
 * Calculate distance between two locations (rough estimate in km)
 * Using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Check if gender preferences match
 */
function checkGenderCompatibility(user1Gender, user1Pref, user2Gender, user2Pref) {
  // Convert gender preferences
  const prefMap = { 'M': 'M', 'W': 'F', 'F': 'F', 'B': 'B', 'O': 'O' };
  
  const u1g = user1Gender;
  const u1p = prefMap[user1Pref] || user1Pref;
  const u2g = user2Gender;
  const u2p = prefMap[user2Pref] || user2Pref;
  
  // Both prefer anyone (B = Both)
  if (u1p === 'B' && u2p === 'B') return true;
  
  // User1 prefers user2's gender AND user2 prefers user1's gender
  if ((u1p === 'B' || u1p === u2g) && (u2p === 'B' || u2p === u1g)) {
    return true;
  }
  
  return false;
}

/**
 * Rank profiles by relevance to user
 * @param {Object} userProfile - Current user's profile
 * @param {Array} profiles - Array of potential match profiles
 * @param {Object} options - Filtering options
 * @returns {Array} Sorted profiles with scores
 */
async function rankProfiles(userProfile, profiles, options = {}) {
  const {
    limit = 5,
    maxDistance = null, // km, null = no limit
    minKeywordScore = 0.1 // minimum keyword similarity
  } = options;
  
  const userKeywords = normalizeKeywords(userProfile.keyWords);
  const userLat = userProfile.latitude;
  const userLon = userProfile.longitude;
  
  console.log(`🎯 Ranking ${profiles.length} profiles for user ${userProfile.id}`);
  console.log(`🎯 User keywords: ${userKeywords.join(', ')}`);
  
  // Score each profile
  const scoredProfiles = profiles.map(profile => {
    const profileKeywords = normalizeKeywords(profile.keyWords);
    let score = 0;
    const reasons = [];
    
    // 1. Keyword similarity (50% weight)
    const keywordScore = calculateKeywordSimilarity(userKeywords, profileKeywords);
    score += keywordScore * 0.5;
    
    if (keywordScore > 0.3) {
      const matchingKeywords = userKeywords.filter(k => 
        profileKeywords.map(pk => pk.toLowerCase()).includes(k.toLowerCase())
      );
      reasons.push(`Shares interests: ${matchingKeywords.slice(0, 3).join(', ')}`);
    }
    
    // 2. Gender compatibility (30% weight)
    const genderMatch = checkGenderCompatibility(
      userProfile.gender,
      userProfile.genderPreference,
      profile.gender,
      profile.genderPreference
    );
    
    if (genderMatch) {
      score += 0.3;
      reasons.push('Compatible preferences');
    } else {
      score *= 0.3; // Heavy penalty for incompatible preferences
    }
    
    // 3. Location proximity (20% weight)
    if (userLat && userLon && profile.latitude && profile.longitude) {
      const distance = calculateDistance(userLat, userLon, profile.latitude, profile.longitude);
      
      if (distance !== null) {
        // Score decreases with distance (0-20km = full score, 100km+ = 0)
        const distanceScore = Math.max(0, 1 - (distance / 100));
        score += distanceScore * 0.2;
        
        if (distance < 10) {
          reasons.push(`Nearby (${Math.round(distance)}km)`);
        } else if (distance < 50) {
          reasons.push(`Within ${Math.round(distance)}km`);
        }
        
        // Filter by max distance if specified
        if (maxDistance && distance > maxDistance) {
          score = 0; // Exclude
          reasons.push(`Too far (${Math.round(distance)}km)`);
        }
      }
    }
    
    // 4. Profile completeness bonus (5% weight)
    const hasGoodBio = profile.bio && profile.bio.length > 50;
    const hasEnoughKeywords = profileKeywords.length >= 3;
    
    if (hasGoodBio && hasEnoughKeywords) {
      score += 0.05;
      reasons.push('Complete profile');
    }
    
    return {
      profile,
      score,
      reasons,
      keywordScore
    };
  });
  
  // Filter by minimum keyword score
  const filtered = scoredProfiles.filter(sp => sp.keywordScore >= minKeywordScore);
  
  // Sort by score descending
  const sorted = filtered.sort((a, b) => b.score - a.score);
  
  // Take top N
  const top = sorted.slice(0, limit);
  
  console.log(`🎯 Ranking complete:`);
  console.log(`   - Total profiles: ${profiles.length}`);
  console.log(`   - After filtering: ${filtered.length}`);
  console.log(`   - Returning top: ${top.length}`);
  
  if (top.length > 0) {
    console.log(`🎯 Top profile: Score ${top[0].score.toFixed(2)} - ${top[0].reasons.join(', ')}`);
  }
  
  return top;
}

/**
 * Rank events by relevance to user
 * @param {Object} userProfile - Current user's profile
 * @param {Array} events - Array of events
 * @param {Object} options - Filtering options
 * @returns {Array} Sorted events with scores
 */
async function rankEvents(userProfile, events, options = {}) {
  const {
    limit = 5,
    maxDistance = 50, // km
    prioritizeQuickSparks = true
  } = options;
  
  const userKeywords = normalizeKeywords(userProfile.keyWords);
  const userLat = userProfile.latitude;
  const userLon = userProfile.longitude;
  const now = new Date();
  
  console.log(`🎉 Ranking ${events.length} events for user ${userProfile.id}`);
  
  // Score each event
  const scoredEvents = events.map(event => {
    let score = 0;
    const reasons = [];
    
    // 1. Keyword/tag relevance (40% weight)
    let eventTags = [];
    if (Array.isArray(event.tags)) {
      eventTags = normalizeKeywords(event.tags);
    } else if (typeof event.tags === 'string') {
      if (event.tags.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(event.tags);
          eventTags = normalizeKeywords(parsed);
        } catch (e) {
          eventTags = normalizeKeywords(event.tags);
        }
      } else {
        eventTags = normalizeKeywords(event.tags);
      }
    }
    
    const keywordScore = calculateKeywordSimilarity(userKeywords, eventTags);
    score += keywordScore * 0.4;
    
    if (keywordScore > 0.2) {
      const matchingTags = userKeywords.filter(k => 
        eventTags.map(t => t.toLowerCase()).includes(k.toLowerCase())
      );
      reasons.push(`Matches interests: ${matchingTags.slice(0, 2).join(', ')}`);
    }
    
    // 2. Time urgency (30% weight)
    const eventDate = new Date(event.eventDate);
    const hoursUntil = (eventDate - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) {
      score = 0; // Event has passed
      return { event, score: 0, reasons: ['Event has passed'] };
    }
    
    // Events happening soon get higher scores
    if (hoursUntil <= 24) {
      score += 0.3;
      reasons.push('Happening today!');
    } else if (hoursUntil <= 72) {
      score += 0.25;
      reasons.push('This week');
    } else if (hoursUntil <= 168) {
      score += 0.15;
      reasons.push('Next 7 days');
    } else {
      score += 0.05;
    }
    
    // 3. Quick Spark bonus (20% weight)
    if (event.duration && event.duration <= 30) {
      if (prioritizeQuickSparks) {
        score += 0.2;
        reasons.push('Quick Spark ⚡');
      }
    }
    
    // 4. Location proximity (15% weight)
    // Note: Events might not have lat/lon, use location string matching instead
    if (event.location && userProfile.location) {
      const locationMatch = event.location.toLowerCase().includes(userProfile.location.toLowerCase()) ||
                           userProfile.location.toLowerCase().includes(event.location.toLowerCase());
      
      if (locationMatch) {
        score += 0.15;
        reasons.push(`Near you (${event.location})`);
      }
    }
    
    // 5. Availability (10% weight)
    if (event.maxParticipants) {
      const participantCount = event.participants?.length || 0;
      const spotsLeft = event.maxParticipants - participantCount;
      
      if (spotsLeft > 5) {
        score += 0.1;
      } else if (spotsLeft > 0) {
        score += 0.05;
        reasons.push(`${spotsLeft} spots left`);
      } else {
        score *= 0.5; // Penalty for full events
        reasons.push('Event full');
      }
    } else {
      score += 0.1; // Unlimited spots
    }
    
    return {
      event,
      score,
      reasons,
      keywordScore,
      tags: eventTags
    };
  });
  
  // Filter out past events and low scores
  const filtered = scoredEvents.filter(se => se.score > 0.1);
  
  // Sort by score descending
  const sorted = filtered.sort((a, b) => b.score - a.score);
  
  // Take top N
  const top = sorted.slice(0, limit);
  
  console.log(`🎉 Ranking complete:`);
  console.log(`   - Total events: ${events.length}`);
  console.log(`   - After filtering: ${filtered.length}`);
  console.log(`   - Returning top: ${top.length}`);
  
  if (top.length > 0) {
    console.log(`🎉 Top event: Score ${top[0].score.toFixed(2)} - ${top[0].reasons.join(', ')}`);
  }
  
  return top;
}

/**
 * Get optimized matches for user
 */
async function getOptimizedMatches(userProfile, excludedUserIds, options = {}) {
  const { limit = 5 } = options;
  
  // First, get candidates with basic filtering
  const candidates = await UserProfile.findAll({
    where: {
      id: { [Op.notIn]: Array.from(excludedUserIds) },
      userId: { [Op.ne]: userProfile.userId },
      isHidden: false,
      // Pre-filter by gender preference
      gender: userProfile.genderPreference === 'B' ? 
        { [Op.in]: ['M', 'F', 'O'] } : 
        userProfile.genderPreference
    },
    attributes: ['id', 'userId', 'bio', 'birthDate', 'gender', 'genderPreference', 
                 'relationshipType', 'keyWords', 'location', 'latitude', 'longitude'],
    include: [{ 
      model: User, 
      as: 'user',
      attributes: ['firstName', 'lastName'] 
    }],
    limit: 50 // Get more candidates to rank from
  });
  
  // Rank and filter
  const ranked = await rankProfiles(userProfile, candidates, options);
  
  return ranked.slice(0, limit);
}

/**
 * Get optimized events for user
 */
async function getOptimizedEvents(userProfile, options = {}) {
  const { limit = 5, prioritizeQuickSparks = true } = options;
  
  const now = new Date();
  
  // Get upcoming events
  const events = await Event.findAll({
    where: {
      status: 'upcoming',
      eventDate: { [Op.gte]: now }
    },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName']
      },
      {
        model: EventParticipant,
        as: 'participants',
        attributes: ['userId', 'status']
      }
    ],
    limit: 30 // Get more candidates to rank from
  });
  
  // Rank and filter
  const ranked = await rankEvents(userProfile, events, { 
    limit, 
    prioritizeQuickSparks 
  });
  
  return ranked.slice(0, limit);
}

module.exports = {
  rankProfiles,
  rankEvents,
  getOptimizedMatches,
  getOptimizedEvents,
  calculateKeywordSimilarity,
  calculateDistance
};

