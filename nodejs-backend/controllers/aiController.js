const OpenAI = require('openai');
const { UserProfile, User, Match, Event, EventParticipant, Conversation } = require('../models');
const { getOpenAIResponse } = require('../services/openaiService');
const { getOptimizedMatches, getOptimizedEvents } = require('../services/matchingService');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Lazy initialization of OpenAI client
let openai = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

const normalizeKeywords = (keywords) => {
  if (!keywords) return [];

  if (Array.isArray(keywords)) {
    return keywords.filter(Boolean).map(keyword => String(keyword));
  }

  if (typeof keywords === 'string') {
    const trimmed = keywords.trim();
    if (trimmed.length === 0) return [];

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map(keyword => String(keyword));
        }
      } catch (_) {
        // fall through to comma-separated parsing
      }
    }

    return trimmed
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .map(keyword => String(keyword));
  }

  return [];
};

// Intent detection - determines what the user is trying to do
const detectIntent = (message) => {
  const messageLower = message.toLowerCase();
  
  // Event creation intents - highest priority so "create event" isn't treated as browsing
  const createEventPhrases = [
    'create an event',
    'create a new event',
    'create event',
    'set up an event',
    'plan an event',
    'host an event',
    'organize an event',
    'schedule an event',
    'put together an event',
    'start an event',
    'make an event',
    'create a dance event',
    'plan a dance event',
    'host a dance event',
    'organize a dance event'
  ];
  const createEventRegex = /\b(create|plan|organize|host|schedule|set up|arrange|make)\b[^.]*\b(event|meetup|party|gathering|hangout|session|class)\b/;
  if (createEventRegex.test(messageLower) || createEventPhrases.some(phrase => messageLower.includes(phrase))) {
    return 'creating_event';
  }
  
  // Event-related intents first (so "find events" isn't treated as match intent)
  const eventKeywordRegex = /\b(event|events|activity|activities|happening|attend|join|meetup|spark|plan|plans|weekend|tonight|today|tomorrow|recommend|suggest|date|dates|coffee|drinks?|hangout|outing|party|concert|festival|gathering|social)\b/;
  const eventPhrases = [
    'meet up',
    'meeting up',
    'go out',
    'going out',
    'what to do',
    'something to do',
    'find an event',
    'find events',
    'looking for an event',
    'looking for events',
    'looking for a coffee',
    'coffee date',
    'grab a coffee',
    'grab some drinks'
  ];
  if (eventKeywordRegex.test(messageLower) || eventPhrases.some(phrase => messageLower.includes(phrase))) {
    return 'exploring_events';
  }
  
  // Profile-related intents
  if (messageLower.match(/\b(profile|keyword|bio|improve|help me|update|change)\b/)) {
    return 'profile_building';
  }
  
  // Match-finding intents
  if (messageLower.match(/\b(show|find|see|meet|match|someone|person|people|who|introduce)\b/)) {
    return 'finding_matches';
  }
  
  // Greeting/casual
  if (messageLower.match(/\b(hello|hi|hey|thanks|thank you|bye)\b/)) {
    return 'casual_chat';
  }
  
  // Default to casual if unclear
  return 'casual_chat';
};

// Build optimized system prompt based on intent
const buildOptimizedPrompt = (intent, userProfile, matchesForPrompt, eventsForPrompt) => {
  const { keyWords, bio, gender, genderPreference, relationshipType, location } = userProfile;
  
  // BASE PROMPT - Always included (compact version)
  const basePrompt = `You are Mooves AI. Help users find connections and events. Keep responses concise (2-3 sentences max).

User Profile: ${keyWords?.length > 0 ? keyWords.join(', ') : 'No keywords yet'} | ${gender} seeking ${genderPreference} | ${relationshipType} | ${location}`;

  // INTENT-SPECIFIC SECTIONS - Only include what's needed
  
  if (intent === 'profile_building') {
    return `${basePrompt}

TASK: Help user improve their profile
- Ask about interests/hobbies
- Suggest keywords in format: <keywords>keyword1, keyword2, keyword3</keywords>
- Keep suggestions relevant to dating/friendship

Example:
User: "I love hiking"
You: "Great! Try these: <keywords>hiking, outdoor, nature, adventure</keywords>"`;
  }
  
  if (intent === 'finding_matches') {
    const hasMatches = matchesForPrompt && matchesForPrompt.length > 0;
    
    if (!hasMatches) {
      return `${basePrompt}

TASK: User wants to find matches but none available
- Explain no matches right now
- Suggest updating keywords or checking back later
- Be encouraging`;
    }
    
    // Only include top 5 matches to save tokens
    const topMatches = matchesForPrompt.slice(0, 5);
    
    return `${basePrompt}

TASK: Recommend matches from this list (IDs: ${topMatches.map(m => m.id).join(', ')})

Available matches (${topMatches.length}):
${JSON.stringify(topMatches)}

RESPONSE FORMAT: {"type": "profile_list", "profiles": [{"id": 123}], "explanation": "Why these profiles match (mention shared interests, proximity or profile completeness)"}

RULES:
- ONLY use IDs from the list above
- Return ONLY the JSON object
- Use the matchReason and keywords provided to justify recommendations
- If user asks for specific interest, check if anyone has it
- If not found, recommend best alternative`;
  }
  
  if (intent === 'exploring_events') {
    const hasEvents = eventsForPrompt && eventsForPrompt.length > 0;
    
    if (!hasEvents) {
      return `${basePrompt}

TASK: User wants events but none available
- Explain no events right now
- Suggest creating one
- Be encouraging`;
    }
    
    // Only include top 5 events to save tokens
    const topEvents = eventsForPrompt.slice(0, 5);
    
    return `${basePrompt}

TASK: Recommend events from this list (IDs: ${topEvents.map(e => e.id).join(', ')})

Available events (${topEvents.length}):
${JSON.stringify(topEvents)}

RESPONSE FORMAT: {"type": "event_list", "events": [{"id": 456}], "explanation": "Why these events fit (mention date/time, location, tags or Quick Sparks)"}

RULES:
- ONLY use IDs from the list above
- Return ONLY the JSON object
- Prioritize Quick Sparks (≤30 min) for "now"/"quick" requests
- Use provided tags, matchReason and timing details to justify each event
- Consider location and user interests
- Highlight urgency if the event is happening soon
- If the list above contains events, you MUST include at least one event in the response (do not return an empty array)`;
  }
  
  if (intent === 'creating_event') {
    const nowIso = new Date().toISOString();
    const defaultLocation = userProfile.location || 'the user’s local area';
    const keywordSummary = userProfile.keyWords?.length > 0 ? userProfile.keyWords.join(', ') : 'No keywords yet';
    
    return `${basePrompt}

TASK: Design a new event and return structured details so the system can create it automatically.
- Focus on the user’s request and interests
- Prefer fun, specific titles (max 60 characters)
- Craft a short inviting description (2 sentences max)
- Recommend a location relevant to ${defaultLocation}
- Choose an event date at least 48 hours after CURRENT_DATETIME unless user specifies otherwise
- Pick a start time in 24-hour HH:MM format
- Default duration to 90 minutes if not specified
- Keep isPublic true unless user explicitly asks for private
- Include up to 5 relevant tags (lowercase single words)
- Use the user’s interests for inspiration: ${keywordSummary}
- CURRENT_DATETIME: ${nowIso}

RESPONSE FORMAT (JSON ONLY):
{"type":"event_create","event":{"name":"string","description":"string","location":"string","eventDate":"YYYY-MM-DD","eventTime":"HH:MM","duration":90,"isPublic":true,"tags":["string"]}}

RULES:
- Return ONLY the JSON object, no extra text
- Always include name, description, location, eventDate, eventTime, duration, isPublic, tags
- If user provides any detail, respect it exactly
- If user asks for a dance event, ensure name and description highlight dancing
- Do NOT invent impossible details (keep realistic)`;
  }
  
  // Casual chat - minimal prompt
  return `${basePrompt}

TASK: Casual conversation
- Be friendly and helpful
- Keep responses brief
- If user needs help, ask what they're looking for`;
};

// Analyze profile completeness for better prompts
const analyzeProfileCompleteness = (profile) => {
  const issues = [];
  
  if (!profile.keyWords || profile.keyWords.length < 3) {
    issues.push('needs more keywords');
  }
  if (!profile.bio || profile.bio.length < 20) {
    issues.push('needs better bio');
  }
  
  return issues.length > 0 ? issues.join(', ') : 'complete';
};

// @desc    Send message to AI and get response
// @route   POST /api/ai/chat
// @access  Private
const sendMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Please check your input and try again.',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId, { include: ['profile'] });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.profile) {
      return res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });
    }

    // Message limiting for all users - IMPROVED LIMITS
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    if (user.lastAiMessageDate && user.lastAiMessageDate >= today) {
      // User has sent messages today
      const dailyLimit = user.isPremium ? 200 : 20; // Premium: 200, Free: 20 (upgraded from 100/5)
      
      if (user.aiMessageCount >= dailyLimit) {
        const errorMessage = user.isPremium 
          ? 'Premium message limit reached for today (200 messages).'
          : 'Message limit reached for today. Upgrade to premium for 200 messages per day.';
        
        return res.status(429).json({
          error: errorMessage,
          limitReached: true,
          currentCount: user.aiMessageCount,
          dailyLimit: dailyLimit
        });
      }
    } else {
      // First message of the day or new day, reset count
      user.aiMessageCount = 0;
    }

    console.log(`AI Chat: Processing message for user ${userId}`);
    console.log(`AI Chat: User profile ID: ${user.profile.id}`);

    // Get user's current profile information
    const userProfile = user.profile;
    const userKeywords = userProfile.keyWords || [];
    const userBio = userProfile.bio || '';
    const userGender = userProfile.gender;
    const userGenderPreference = userProfile.genderPreference;
    const userRelationshipType = userProfile.relationshipType;
    const userLocation = userProfile.location;

    // 1. Get potential matches (exclude already matched/liked/disliked users)
    const likedOrDislikedUserIds = await Match.findAll({
      where: {
        [Op.or]: [
          { user1Id: userProfile.id },
          { user2Id: userProfile.id }
        ]
      }
    }).then(matches => {
      console.log(`AI Chat: Raw matches:`, matches.map(m => ({ user1Id: m.user1Id, user2Id: m.user2Id, status: m.status, user1Liked: m.user1Liked, user2Liked: m.user2Liked })));
      return matches.reduce((ids, match) => {
        // Only exclude profiles where the CURRENT USER has explicitly made a decision
        let shouldExclude = false;
        
        if (match.user1Id === user.profile.id) {
          // Current user is user1 - exclude if they have liked, disliked, or matched
          shouldExclude = match.user1Liked === true || match.status === 'disliked' || match.status === 'matched';
        } else if (match.user2Id === user.profile.id) {
          // Current user is user2 - exclude if they have liked, disliked, or matched
          shouldExclude = match.user2Liked === true || match.status === 'disliked' || match.status === 'matched';
        }
        
        if (shouldExclude) {
          // Add the other user's ID (not the current user's)
          const otherUserId = match.user1Id === user.profile.id ? match.user2Id : match.user1Id;
          ids.add(otherUserId);
          console.log(`AI Chat: Excluding user ${otherUserId} (current user decision)`);
        }
        
        return ids;
      }, new Set());
    });

    console.log(`AI Chat: Found ${likedOrDislikedUserIds.size} liked/disliked users to exclude`);

    // Combine all excluded user IDs
    const excludedUserIds = new Set([...likedOrDislikedUserIds]);
    
    console.log(`AI Chat: Excluded user IDs:`, Array.from(excludedUserIds));

    // 2. Get OPTIMIZED matches using smart ranking
    console.log(`🎯 Using optimized matching service...`);
    const rankedMatches = await getOptimizedMatches(userProfile, excludedUserIds, {
      limit: 5, // Only top 5
      maxDistance: userProfile.locationMode === 'local' ? 50 : null, // 50km for local mode
      minKeywordScore: 0.1
    });

    console.log(`🎯 Optimized matches: ${rankedMatches.length} high-quality profiles selected`);
    
    const hasPotentialMatches = rankedMatches.length > 0;
    
    // Prepare matches for prompt with scoring reasons
    const matchesForPrompt = rankedMatches.map(ranked => {
      const profileKeywords = normalizeKeywords(ranked.profile.keyWords);
      return {
        id: ranked.profile.id,
        name: `${ranked.profile.user.firstName} ${ranked.profile.user.lastName}`,
        age: ranked.profile.getAge(),
        gender: ranked.profile.gender,
        bio: ranked.profile.bio || 'No bio available',
        keyWords: profileKeywords,
        location: ranked.profile.location,
        matchReason: ranked.reasons.join(', '),
        score: Math.round(ranked.score * 100)
      };
    });
    
    if (matchesForPrompt.length > 0) {
      console.log(`🎯 Top match: ${matchesForPrompt[0].name} (score: ${matchesForPrompt[0].score}) - ${matchesForPrompt[0].matchReason}`);
    }

    // 2.5 Get OPTIMIZED events using smart ranking
    console.log(`🎉 Using optimized event ranking...`);
    const rankedEvents = await getOptimizedEvents(userProfile, {
      limit: 5, // Only top 5
      prioritizeQuickSparks: true
    });

    console.log(`🎉 Optimized events: ${rankedEvents.length} relevant events selected`);

    const eventsForPrompt = rankedEvents.map(ranked => {
      const eventTags = normalizeKeywords(ranked.tags || ranked.event.tags);
      return {
        id: ranked.event.id,
        name: ranked.event.name,
        description: ranked.event.description || 'No description provided',
        location: ranked.event.location,
        eventDate: ranked.event.eventDate,
        eventTime: ranked.event.eventTime,
        duration: ranked.event.duration,
        isSpark: ranked.event.duration && ranked.event.duration <= 30,
        tags: eventTags,
        creator: `${ranked.event.creator.firstName} ${ranked.event.creator.lastName}`,
        participantCount: ranked.event.participants?.length || 0,
        maxParticipants: ranked.event.maxParticipants,
        matchReason: ranked.reasons.join(', '),
        score: Math.round(ranked.score * 100)
      };
    });
    
    if (eventsForPrompt.length > 0) {
      console.log(`🎉 Top event: ${eventsForPrompt[0].name} (score: ${eventsForPrompt[0].score}) - ${eventsForPrompt[0].matchReason}`);
    }

    // 3. Detect user intent to optimize prompt
    const userMessage = req.body.message;
    const intent = detectIntent(userMessage);
    
    console.log(`AI Chat: Detected intent: ${intent} for message: "${userMessage.substring(0, 50)}..."`);
    
    // 4. Build optimized system prompt based on intent (saves 50-70% tokens)
    const systemPrompt = buildOptimizedPrompt(
      intent,
      {
        keyWords: userKeywords,
        bio: userBio,
        gender: userGender,
        genderPreference: userGenderPreference,
        relationshipType: userRelationshipType,
        location: userLocation
      },
      matchesForPrompt,
      eventsForPrompt
    );
    
    // Log token savings
    const promptLength = systemPrompt.length;
    const oldPromptEstimate = 2500; // Old prompt was ~2500 chars
    const tokenSavings = Math.round(((oldPromptEstimate - promptLength) / oldPromptEstimate) * 100);
    console.log(`AI Chat: Optimized prompt (${promptLength} chars, ~${tokenSavings}% smaller than old prompt)`);

    // 5. Load conversation history from database (last 20 messages)
    
    const conversationHistoryRecords = await Conversation.findAll({
      where: { userId: userId },
      order: [['timestamp', 'DESC']],
      limit: 20,
      attributes: ['role', 'content', 'timestamp']
    });
    
    // Reverse to get chronological order (oldest first)
    const userHistory = conversationHistoryRecords.reverse().map(record => ({
      role: record.role,
      content: record.content
    }));
    
    console.log(`AI Chat: Loaded ${userHistory.length} previous messages from database`);
    
    // Save user message to database with intent metadata for analytics
    await Conversation.create({
      userId: userId,
      role: 'user',
      content: userMessage,
      metadata: {
        intent: intent,
        profileCompleteness: analyzeProfileCompleteness(userProfile),
        hasMatches: hasPotentialMatches,
        hasEvents: eventsForPrompt.length > 0
      },
      timestamp: new Date()
    });

    // 6. Build messages array with optimized system prompt + history + current message
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...userHistory,
      { role: 'user', content: userMessage }
    ];

    console.log(`AI Chat: Sending ${openaiMessages.length} messages to OpenAI (GPT-4 Turbo) with intent: ${intent}`);
    
    // Increment message count BEFORE OpenAI call to prevent race conditions
    // Use atomic increment to handle concurrent requests properly
    await user.increment('aiMessageCount', { by: 1 });
    await user.update({ lastAiMessageDate: new Date() });
    
    // Reload user to get updated count for logging
    await user.reload();
    console.log(`AI Chat: User ${userId} message count incremented to ${user.aiMessageCount} / ${user.isPremium ? 200 : 20}`);
    
    const aiResponse = await getOpenAIResponse(openaiMessages);
    
    // Extract response metadata
    let responseMetadata = { intent };
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        responseMetadata.responseType = parsed.type;
        responseMetadata.recommendationCount = parsed.profiles?.length || parsed.events?.length || 0;
      }
    } catch (e) {
      // Not JSON, just text response
      responseMetadata.responseType = 'text';
    }
    
    // Save AI response to database with metadata
    await Conversation.create({
      userId: userId,
      role: 'assistant',
      content: aiResponse,
      metadata: responseMetadata,
      timestamp: new Date()
    });

    console.log(`AI Chat: Received response from OpenAI`);
    console.log(`AI Chat: Response content: ${aiResponse}`);
    
    // Check if response contains JSON and validate IDs
    let validatedResponse = aiResponse;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`AI Chat: Found JSON in response:`, parsed);
        
        if (parsed.type === 'profile_list') {
          console.log(`AI Chat: Profile list contains ${parsed.profiles?.length || 0} profiles`);
          
          // Validate that all profile IDs exist in available matches
          const validProfileIds = new Set(matchesForPrompt.map(m => m.id));
          const invalidIds = [];
          
          if (parsed.profiles && Array.isArray(parsed.profiles)) {
            parsed.profiles = parsed.profiles.filter(profile => {
              const isValid = validProfileIds.has(profile.id);
              if (!isValid) {
                invalidIds.push(profile.id);
                console.log(`⚠️  AI recommended invalid profile ID: ${profile.id} (not in available matches)`);
                console.log(`⚠️  Valid profile IDs were: ${Array.from(validProfileIds).join(', ')}`);
                console.log(`⚠️  This suggests AI is making up IDs instead of using the provided list`);
              }
              return isValid;
            });
            
            if (invalidIds.length > 0) {
              console.log(`⚠️  Filtered out ${invalidIds.length} invalid profile ID(s): ${invalidIds.join(', ')}`);
              console.log(`⚠️  Available matches count was: ${matchesForPrompt.length}`);
            }
            
            // If all profiles were filtered out, return a helpful message instead
            if (parsed.profiles.length === 0) {
              if (matchesForPrompt.length === 0) {
                validatedResponse = "I couldn't find any matches right now. Try updating your keywords or check back later for new profiles!";
              } else {
                validatedResponse = `I don't have anyone with that specific interest right now, but I have ${matchesForPrompt.length} other interesting ${matchesForPrompt.length === 1 ? 'person' : 'people'} you might like. Want to see them?`;
              }
              console.log(`AI Chat: All recommended profiles were invalid, returning fallback message`);
            } else {
              validatedResponse = JSON.stringify(parsed);
              console.log(`AI Chat: Validated ${parsed.profiles.length} valid profile(s)`);
            }
          }
        } else if (parsed.type === 'event_list') {
          console.log(`AI Chat: Event list contains ${parsed.events?.length || 0} events`);
          
          // Validate that all event IDs exist in available events
          const validEventIds = new Set(eventsForPrompt.map(e => e.id));
          const invalidIds = [];
          
          if (parsed.events && Array.isArray(parsed.events)) {
            parsed.events = parsed.events.filter(event => {
              const isValid = validEventIds.has(event.id);
              if (!isValid) {
                invalidIds.push(event.id);
                console.log(`⚠️  AI recommended invalid event ID: ${event.id} (not in available events)`);
              }
              return isValid;
            });
            
            if (invalidIds.length > 0) {
              console.log(`⚠️  Filtered out ${invalidIds.length} invalid event ID(s): ${invalidIds.join(', ')}`);
            }
            
            // If all events were filtered out, return a helpful message instead
            if (parsed.events.length === 0) {
              validatedResponse = "I couldn't find any valid events right now. Try creating one or check back later!";
              console.log(`AI Chat: All recommended events were invalid, returning fallback message`);
            } else {
              validatedResponse = JSON.stringify(parsed);
              console.log(`AI Chat: Validated ${parsed.events.length} valid event(s)`);
            }
          }
        } else if (parsed.type === 'event_create') {
          console.log('AI Chat: Received event creation draft from AI');
          
          const eventPayload = parsed.event || {};
          const rawName = eventPayload.name;
          const eventName = typeof rawName === 'string' ? rawName.trim().slice(0, 100) : '';
          
          if (!eventName) {
            validatedResponse = "I drafted the idea, but I still need a name for the event. What should we call it?";
            console.log('AI Chat: Event draft missing name');
          } else {
            const sanitizeString = (value, maxLength = 300) => {
              if (typeof value !== 'string') return null;
              const trimmed = value.trim();
              if (!trimmed) return null;
              return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
            };
            
            const parseDate = (value) => {
              if (!value) return null;
              if (value instanceof Date && !isNaN(value.getTime())) return value;
              if (typeof value === 'string') {
                try {
                  const dateObj = new Date(value);
                  if (!isNaN(dateObj.getTime())) {
                    return dateObj;
                  }
                } catch (_) {
                  return null;
                }
              }
              return null;
            };
            
            const parseTime = (value) => {
              if (typeof value !== 'string') return null;
              const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
              if (!timeMatch) return null;
              let hour = parseInt(timeMatch[1], 10);
              let minute = parseInt(timeMatch[2], 10);
              if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
              hour = Math.min(Math.max(hour, 0), 23);
              minute = Math.min(Math.max(minute, 0), 59);
              return { hour, minute };
            };
            
            const fallbackDate = () => {
              const date = new Date();
              date.setDate(date.getDate() + 2);
              date.setHours(19, 0, 0, 0);
              return date;
            };
            
            const eventDateRaw = eventPayload.eventDate || eventPayload.date;
            let eventDate = parseDate(eventDateRaw) || fallbackDate();
            
            // Ensure eventDate is at least 48 hours in future
            const minDate = new Date();
            minDate.setHours(minDate.getHours() + 48);
            if (eventDate < minDate) {
              eventDate = fallbackDate();
            }
            
            const eventTimeRaw = eventPayload.eventTime || eventPayload.time;
            let parsedTime = parseTime(eventTimeRaw);
            if (!parsedTime) {
              parsedTime = { hour: eventDate.getHours(), minute: eventDate.getMinutes() };
            }
            const eventTimeDisplay = `${parsedTime.hour.toString().padStart(2, '0')}:${parsedTime.minute.toString().padStart(2, '0')}`;
            
            const description = sanitizeString(eventPayload.description, 400) || `Join us for ${eventName}!`;
            let location = sanitizeString(eventPayload.location, 200);
            if (!location) {
              location = sanitizeString(userProfile.location, 200) || 'To Be Announced';
            }
            
            const durationRaw = eventPayload.duration;
            let duration = null;
            if (typeof durationRaw === 'number' && Number.isFinite(durationRaw)) {
              duration = Math.max(30, Math.min(240, Math.round(durationRaw)));
            } else if (typeof durationRaw === 'string') {
              const parsedDuration = parseInt(durationRaw, 10);
              if (!Number.isNaN(parsedDuration)) {
                duration = Math.max(30, Math.min(240, parsedDuration));
              }
            }
            if (!duration) {
              duration = 90;
            }
            
            const isPublic = eventPayload.isPublic !== undefined ? Boolean(eventPayload.isPublic) : true;
            
            let tags = [];
            if (Array.isArray(eventPayload.tags)) {
              tags = eventPayload.tags
                .map(tag => sanitizeString(String(tag), 30))
                .filter(Boolean)
                .map(tag => tag.toLowerCase());
            } else if (typeof eventPayload.tags === 'string') {
              tags = eventPayload.tags
                .split(',')
                .map(tag => sanitizeString(tag, 30))
                .filter(Boolean)
                .map(tag => tag.toLowerCase());
            }
            if (tags.length === 0 && eventName) {
              tags = eventName
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3)
                .slice(0, 3);
            }
            
            let maxParticipants = null;
            if (eventPayload.maxParticipants !== undefined && eventPayload.maxParticipants !== null) {
              const parsedMax = parseInt(eventPayload.maxParticipants, 10);
              if (!Number.isNaN(parsedMax) && parsedMax > 0) {
                maxParticipants = parsedMax;
              }
            }
            
            const sanitizedEvent = {
              name: eventName,
              description,
              location,
              eventDate: eventDate.toISOString().split('T')[0],
              eventTime: eventTimeDisplay,
              duration,
              isPublic,
              maxParticipants,
              tags
            };
            
            const explanation = parsed.explanation || `Here's a ${isPublic ? 'public' : 'private'} event plan you can review before publishing.`;
            
            const responsePayload = {
              type: 'event_create',
              event: sanitizedEvent,
              explanation
            };
            
            validatedResponse = JSON.stringify(responsePayload);
            responseMetadata.responseType = 'event_create';
            responseMetadata.eventDraft = sanitizedEvent;
            
            console.log('AI Chat: Prepared event draft for user confirmation:', sanitizedEvent);
          }
        }
      }
    } catch (e) {
      console.log(`AI Chat: No valid JSON found in response or validation error:`, e.message);
    }

    res.json({ response: validatedResponse });
  } catch (error) {
    console.error('AI sendMessage error:', error);
    
    // If we incremented the counter but failed to get a response, decrement it back
    // This ensures users don't lose message credits for failed requests
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);
      if (user && user.aiMessageCount > 0) {
        await user.decrement('aiMessageCount', { by: 1 });
        console.log(`AI Chat: Decremented message count for user ${userId} due to error`);
      }
    } catch (decrementError) {
      console.error('Failed to decrement message count after error:', decrementError);
    }
    
    res.status(500).json({ error: 'Failed to get AI response: ' + error.message });
  }
};

// @desc    Get conversation history
// @route   GET /api/ai/conversation-history
// @access  Private
const getConversationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Load conversation history from database (last 50 messages for frontend display)
    const conversationRecords = await Conversation.findAll({
      where: { userId: userId },
      order: [['timestamp', 'ASC']], // Chronological order for display
      limit: 50,
      attributes: ['id', 'role', 'content', 'timestamp', 'metadata']
    });

    // Convert to the format expected by the frontend
    const formattedHistory = conversationRecords.map((record) => ({
      id: `msg_${userId}_${record.id}`,
      content: record.content,
      isUser: record.role === 'user',
      timestamp: record.timestamp.toISOString(),
      metadata: record.metadata
    }));

    console.log(`AI Chat: Retrieved ${formattedHistory.length} messages from database for user ${userId}`);
    res.json(formattedHistory);
  } catch (error) {
    console.error('Get conversation history error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
};

// @desc    Update user keywords based on AI suggestions
// @route   POST /api/ai/update-keywords
// @access  Private
const updateUserKeywords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { keywords } = req.body;

    // Validate input
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ 
        error: 'Keywords must be provided as an array',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate keywords (max 20 keywords, each max 50 chars for consistency)
    if (keywords.length > 20) {
      return res.status(400).json({ 
        error: 'Maximum 20 keywords allowed',
        code: 'VALIDATION_ERROR'
      });
    }

    for (const keyword of keywords) {
      if (typeof keyword !== 'string' || keyword.length > 50) {
        return res.status(400).json({ 
          error: 'Each keyword must be a string with maximum 50 characters',
          code: 'VALIDATION_ERROR'
        });
      }
      
      // Check for valid characters
      const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
      if (!validPattern.test(keyword)) {
        return res.status(400).json({ 
          error: 'Keywords can only contain letters, numbers, spaces, hyphens, and underscores',
          code: 'VALIDATION_ERROR'
        });
      }
    }

    const user = await User.findByPk(userId, { include: ['profile'] });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.profile) {
      return res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });
    }

    // Update user keywords
    user.profile.keyWords = keywords;
    await user.profile.save();

    console.log(`AI Keywords Update: User ${userId} updated keywords to:`, keywords);

    res.json({ 
      message: 'Keywords updated successfully',
      keywords: keywords
    });
  } catch (error) {
    console.error('Update user keywords error:', error);
    res.status(500).json({ error: 'Failed to update keywords: ' + error.message });
  }
};

// @desc    Get AI message usage for current user
// @route   GET /api/ai/usage
// @access  Private
const getMessageUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isNewDay = !user.lastAiMessageDate || user.lastAiMessageDate < today;
    const dailyLimit = user.isPremium ? 200 : 20; // Updated limits: 200 premium, 20 free
    const currentCount = isNewDay ? 0 : user.aiMessageCount;

    res.json({
      currentCount,
      dailyLimit,
      isPremium: user.isPremium,
      remainingMessages: Math.max(0, dailyLimit - currentCount),
      lastMessageDate: user.lastAiMessageDate
    });
  } catch (error) {
    console.error('Get message usage error:', error);
    res.status(500).json({ error: 'Failed to get message usage' });
  }
};

// @desc    Clear conversation history
// @route   DELETE /api/ai/conversation-history
// @access  Private
const clearConversationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete all conversation records for this user from database
    const deletedCount = await Conversation.destroy({
      where: { userId: userId }
    });
    
    console.log(`AI Chat: Deleted ${deletedCount} conversation messages for user ${userId}`);
    res.json({ 
      message: 'Conversation history cleared successfully',
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Clear conversation history error:', error);
    res.status(500).json({ error: 'Failed to clear conversation history' });
  }
};

// @desc    Send message to AI and get streaming response
// @route   POST /api/ai/chat/stream
// @access  Private
const sendMessageStream = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Please check your input and try again.',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId, { include: ['profile'] });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.profile) {
      return res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });
    }

    // Message limiting
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.lastAiMessageDate && user.lastAiMessageDate >= today) {
      const dailyLimit = user.isPremium ? 200 : 20;
      
      if (user.aiMessageCount >= dailyLimit) {
        const errorMessage = user.isPremium 
          ? 'Premium message limit reached for today (200 messages).'
          : 'Message limit reached for today. Upgrade to premium for 200 messages per day.';
        
        return res.status(429).json({
          error: errorMessage,
          limitReached: true,
          currentCount: user.aiMessageCount,
          dailyLimit: dailyLimit
        });
      }
    } else {
      user.aiMessageCount = 0;
    }

    console.log(`AI Chat Stream: Processing message for user ${userId}`);

    // Get user profile and context (same as non-streaming)
    const userProfile = user.profile;
    const userKeywords = userProfile.keyWords || [];
    const userBio = userProfile.bio || '';
    
    // Detect intent
    const userMessage = req.body.message;
    const intent = detectIntent(userMessage);
    
    console.log(`AI Chat Stream: Detected intent: ${intent}`);
    
    // Get matches and events (simplified - only if needed by intent)
    let matchesForPrompt = [];
    let eventsForPrompt = [];
    
    if (intent === 'finding_matches') {
      // Only load matches if user wants to find people
      const potentialMatches = await UserProfile.findAll({
        where: {
          userId: { [Op.ne]: userId },
          isHidden: false
        },
        limit: 5, // Only top 5 for streaming
        include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
      });
      matchesForPrompt = potentialMatches.map(p => ({
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        keyWords: p.keyWords || []
      }));
    } else if (intent === 'exploring_events') {
      // Only load events if user wants to explore
      const events = await Event.findAll({
        where: { status: 'upcoming' },
        order: [['eventDate', 'ASC']],
        limit: 5,
        include: [{ model: User, as: 'creator', attributes: ['firstName', 'lastName'] }]
      });
      eventsForPrompt = events.map(e => ({
        id: e.id,
        name: e.name,
        eventDate: e.eventDate,
        duration: e.duration
      }));
    }
    
    // Build optimized system prompt
    const systemPrompt = buildOptimizedPrompt(
      intent,
      {
        keyWords: userKeywords,
        bio: userBio,
        gender: userProfile.gender,
        genderPreference: userProfile.genderPreference,
        relationshipType: userProfile.relationshipType,
        location: userProfile.location
      },
      matchesForPrompt,
      eventsForPrompt
    );
    
    console.log(`AI Chat Stream: Using optimized prompt (${systemPrompt.length} chars)`);
    
    // Load conversation history
    const conversationHistoryRecords = await Conversation.findAll({
      where: { userId: userId },
      order: [['timestamp', 'DESC']],
      limit: 20,
      attributes: ['role', 'content', 'timestamp']
    });
    
    const userHistory = conversationHistoryRecords.reverse().map(record => ({
      role: record.role,
      content: record.content
    }));
    
    // Save user message to database with intent
    await Conversation.create({
      userId: userId,
      role: 'user',
      content: userMessage,
      metadata: { intent, streaming: true },
      timestamp: new Date()
    });

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...userHistory,
      { role: 'user', content: userMessage }
    ];

    // Increment message count
    await user.increment('aiMessageCount', { by: 1 });
    await user.update({ lastAiMessageDate: new Date() });

    console.log(`AI Chat Stream: Starting streaming response`);

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get streaming response from OpenAI
    const stream = await getOpenAIResponse(openaiMessages, true);

    let fullResponse = '';

    // Stream chunks to client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        // Send chunk as SSE format
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    
    // Extract metadata from response
    let responseMetadata = { intent, streaming: true };
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        responseMetadata.responseType = parsed.type;
        responseMetadata.recommendationCount = parsed.profiles?.length || parsed.events?.length || 0;
      }
    } catch (e) {
      responseMetadata.responseType = 'text';
    }
    
    // Save complete AI response to database with metadata
    await Conversation.create({
      userId: userId,
      role: 'assistant',
      content: fullResponse,
      metadata: responseMetadata,
      timestamp: new Date()
    });

    console.log(`AI Chat Stream: Completed streaming response (${fullResponse.length} chars, intent: ${intent})`);
    res.end();

  } catch (error) {
    console.error('AI sendMessageStream error:', error);
    
    // If we incremented the counter but failed, decrement it back
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);
      if (user && user.aiMessageCount > 0) {
        await user.decrement('aiMessageCount', { by: 1 });
      }
    } catch (decrementError) {
      console.error('Failed to decrement message count after error:', decrementError);
    }
    
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

module.exports = {
  sendMessage,
  sendMessageStream,
  getConversationHistory,
  clearConversationHistory,
  getMessageUsage,
  updateUserKeywords
}; // Force deployment
