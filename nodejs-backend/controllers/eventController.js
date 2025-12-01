const { Event, EventParticipant, User, UserProfile, Image, Match, Message } = require('../models');
const { Op } = require('sequelize');
const { sendEventInvitationNotification, sendNotification } = require('../services/notificationService');

const PARTICIPATION_STATUSES = new Set(['going', 'maybe', 'not_going']);

// Helper function to calculate distance between two GPS coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

const adjustParticipantCount = async (event, previousStatus, nextStatus) => {
  if (!event) return;

  const prev = previousStatus || null;
  const next = nextStatus || null;

  if (prev !== 'going' && next === 'going') {
    await event.increment('currentParticipants');
    if (typeof event.currentParticipants === 'number') {
      event.currentParticipants += 1;
    }
  } else if (prev === 'going' && next !== 'going') {
    await event.decrement('currentParticipants');
    if (typeof event.currentParticipants === 'number') {
      event.currentParticipants -= 1;
    }
  }
};

const getEventDetailIncludes = () => ([
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'firstName', 'lastName', 'email'],
    include: [
      {
        model: UserProfile,
        as: 'profile',
        attributes: ['id', 'profilePicture'],
        include: [
          {
            model: Image,
            as: 'images',
            attributes: ['id', 'imageUrl', 'isPrimary'],
            limit: 1,
            order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']]
          }
        ]
      }
    ]
  },
  {
    model: EventParticipant,
    as: 'participants',
    attributes: ['id', 'userId', 'status', 'contactName', 'contactEmail', 'contactPhone', 'joinedAt'],
    include: getParticipantUserIncludes()
  }
]);

const getParticipantUserIncludes = () => ([
  {
    model: User,
    as: 'user',
    required: false,
    attributes: ['id', 'firstName', 'lastName', 'email'],
    include: [
      {
        model: UserProfile,
        as: 'profile',
        attributes: ['id', 'profilePicture'],
        include: [
          {
            model: Image,
            as: 'images',
            attributes: ['id', 'imageUrl', 'isPrimary'],
            limit: 1,
            order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']]
          }
        ]
      }
    ]
  }
]);

// @desc    Create a new event
// @route   POST /api/events
// @access  Private
const createEvent = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      latitude,
      longitude,
      eventDate,
      eventTime,
      duration,
      maxParticipants,
      tags,
      isPublic,
      invitedUserIds,
      externalParticipants
    } = req.body;

    console.log('=== CREATE EVENT ===');
    console.log('User ID:', req.user.id);
    console.log('Event data:', { name, description, eventDate, eventTime, duration, isPublic });
    console.log('Invited users:', invitedUserIds);
    console.log('External participants:', externalParticipants);

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Event name is required',
        code: 'MISSING_NAME'
      });
    }

    const numericMaxParticipants =
      maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== ''
        ? Number(maxParticipants)
        : null;

    if (numericMaxParticipants !== null && (Number.isNaN(numericMaxParticipants) || numericMaxParticipants < 1)) {
      return res.status(400).json({
        error: 'Max participants must be a positive number',
        code: 'INVALID_MAX_PARTICIPANTS'
      });
    }

    const sanitizedExternalParticipants = Array.isArray(externalParticipants)
      ? externalParticipants
          .map((participant) => {
            if (!participant || typeof participant !== 'object') return null;

            const nameValue = typeof participant.name === 'string' ? participant.name.trim() : '';
            const emailValue =
              typeof participant.email === 'string' ? participant.email.trim().toLowerCase() : '';
            const phoneValue = typeof participant.phone === 'string' ? participant.phone.trim() : '';
            const statusValue =
              typeof participant.status === 'string' ? participant.status.trim().toLowerCase() : 'going';
            const normalizedStatus = PARTICIPATION_STATUSES.has(statusValue) ? statusValue : 'going';

            if (!nameValue && !emailValue && !phoneValue) {
              return null;
            }

            return {
              name: nameValue || null,
              email: emailValue || null,
              phone: phoneValue || null,
              status: normalizedStatus
            };
          })
          .filter(Boolean)
      : [];

    if (
      numericMaxParticipants !== null &&
      1 + sanitizedExternalParticipants.filter((participant) => participant.status === 'going').length >
        numericMaxParticipants
    ) {
      return res.status(400).json({
        error: 'Adding these guests would exceed the event\'s participant limit',
        code: 'EVENT_FULL'
      });
    }

    // Create event
    const event = await Event.create({
      creatorId: req.user.id,
      name: name.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      latitude: latitude || null,
      longitude: longitude || null,
      eventDate: eventDate || null,
      eventTime: eventTime || null,
      duration: duration || null,
      maxParticipants: numericMaxParticipants,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      currentParticipants: 1, // Creator is first participant
      status: 'upcoming'
    });

    // Automatically add creator as participant with "going" status
    await EventParticipant.create({
      eventId: event.id,
      userId: req.user.id,
      status: 'going'
    });

    // Add external participants (if provided)
    if (sanitizedExternalParticipants.length > 0) {
      console.log(`Adding ${sanitizedExternalParticipants.length} external participants`);
      for (const participant of sanitizedExternalParticipants) {
        try {
          const createdParticipant = await EventParticipant.create({
            eventId: event.id,
            status: participant.status,
            contactName: participant.name,
            contactEmail: participant.email,
            contactPhone: participant.phone
          });

          if (participant.status === 'going') {
            await event.increment('currentParticipants');
            event.currentParticipants += 1;
          }

          console.log(`✅ Added external participant ${createdParticipant.id} to event ${event.id}`);
        } catch (extErr) {
          console.log('❌ Failed to add external participant:', extErr.message);
        }
      }
    }

    // Add invited users as participants with "invited" status (if private event)
    if (!event.isPublic && invitedUserIds && Array.isArray(invitedUserIds)) {
      console.log(`Inviting ${invitedUserIds.length} users to private event`);
      for (const userId of invitedUserIds) {
        try {
          await EventParticipant.create({
            eventId: event.id,
            userId: userId,
            status: 'maybe' // Use 'maybe' as invited status
          });
          
          // Send notification to invited user
          try {
            const invitedUser = await User.findByPk(userId);
            const creator = await User.findByPk(req.user.id);
            if (invitedUser && creator) {
              await sendEventInvitationNotification(
                invitedUser,
                creator,
                event
              );
              console.log(`Sent invitation notification to user ${userId}`);
            }
          } catch (notifErr) {
            console.log(`Failed to send notification to user ${userId}:`, notifErr.message);
          }
        } catch (err) {
          console.log(`Failed to invite user ${userId}:`, err.message);
        }
      }
    }

    console.log(`Event created with ID: ${event.id}`);

    // Fetch complete event with creator info
    const completeEvent = await Event.findByPk(event.id, {
      include: getEventDetailIncludes()
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: completeEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      error: 'Failed to create event',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Get all events (with filtering and sorting)
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'upcoming', sortBy = 'date' } = req.query;
    const offset = (page - 1) * limit;

    console.log('=== GET EVENTS ===');
    console.log('User ID:', req.user.id);
    console.log('Filters:', { status, sortBy });

    // Get user's profile for location-based sorting
    const userProfile = await UserProfile.findOne({
      where: { userId: req.user.id }
    });

    // Build where clause - show public events OR private events where user is invited/creator
    const whereClause = {
      status: status === 'all' ? { [Op.in]: ['upcoming', 'ongoing', 'completed'] } : status,
      [Op.or]: [
        { isPublic: true }, // Public events
        { creatorId: req.user.id }, // Events created by user
      ]
    };

    // Get all events first, then filter based on permissions
    const allEvents = await Event.findAll({
      where: {
        status: status === 'all' ? { [Op.in]: ['upcoming', 'ongoing', 'completed'] } : status,
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
              attributes: ['id', 'profilePicture'],
              include: [
                {
                  model: Image,
                  as: 'images',
                  attributes: ['id', 'imageUrl', 'isPrimary'],
                  limit: 1,
                  order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']]
                }
              ]
            }
          ]
        },
        {
          model: EventParticipant,
          as: 'participants',
          attributes: ['id', 'userId', 'status', 'contactName', 'contactEmail', 'contactPhone']
        }
      ],
      order: sortBy === 'date' 
        ? [['eventDate', 'ASC'], ['createdAt', 'DESC']]
        : [['createdAt', 'DESC']]
    });

    // Filter events based on visibility
    const visibleEvents = allEvents.filter(event => {
      // Show public events
      if (event.isPublic) return true;
      // Show private events created by user
      if (event.creatorId === req.user.id) return true;
      // Show private events where user is invited (in participants)
      const isInvited = event.participants.some(p => p.userId === req.user.id);
      return isInvited;
    });

    // Apply pagination
    const total = visibleEvents.length;
    const events = {
      count: total,
      rows: visibleEvents.slice(offset, offset + parseInt(limit))
    };

    // Calculate distances and add user participation status
    const eventsWithDetails = events.rows.map(event => {
      const eventData = event.toJSON();

      // Calculate distance if both have GPS coordinates
      if (userProfile?.latitude && userProfile?.longitude &&
          event.latitude && event.longitude) {
        const distance = calculateDistance(
          parseFloat(userProfile.latitude),
          parseFloat(userProfile.longitude),
          parseFloat(event.latitude),
          parseFloat(event.longitude)
        );
        eventData.distance = Math.round(distance * 10) / 10;
      } else {
        eventData.distance = null;
      }

      // Check if current user is participating
      const userParticipation = event.participants.find(p => p.userId === req.user.id);
      eventData.userStatus = userParticipation?.status || null;
      eventData.isParticipating = !!userParticipation;

      return eventData;
    });

    // Sort by distance if user has location and events have distances
    if (sortBy === 'distance' && userProfile?.latitude && userProfile?.longitude) {
      eventsWithDetails.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });
    }

    res.json({
      events: eventsWithDetails,
      totalCount: events.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(events.count / limit)
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ 
      error: 'Failed to get events',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Private
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
              attributes: ['id', 'profilePicture'],
              include: [
                {
                  model: Image,
                  as: 'images',
                  attributes: ['id', 'imageUrl', 'isPrimary'],
                  limit: 1,
                  order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Get participants separately to avoid association issues
    const participants = await EventParticipant.findAll({
      where: { eventId: id },
      attributes: ['id', 'eventId', 'userId', 'status', 'contactName', 'contactEmail', 'contactPhone', 'joinedAt'],
      include: getParticipantUserIncludes(),
      order: [['createdAt', 'ASC']]
    });

    // Check if current user is participating
    const eventData = event.toJSON();
    eventData.participants = participants;
    const userParticipation = participants.find(p => p.userId === req.user.id);
    eventData.userStatus = userParticipation?.status || null;
    eventData.isParticipating = !!userParticipation;

    res.json({ event: eventData });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ 
      error: 'Failed to get event',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (only creator)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, latitude, longitude, eventDate, eventTime, duration, maxParticipants, status, tags } = req.body;

    console.log('=== UPDATE EVENT ===');
    console.log('Event ID:', id);
    console.log('Request body:', { name, description, location, eventDate, eventTime, duration });
    console.log('Location value:', location, 'Type:', typeof location);

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (event.creatorId !== req.user.id) {
      return res.status(403).json({ 
        error: 'You can only update your own events',
        code: 'UNAUTHORIZED'
      });
    }

    // Update event
    await event.update({
      name: name?.trim() || event.name,
      description: description !== undefined ? (description?.trim() || null) : event.description,
      location: location !== undefined ? (location?.trim() || null) : event.location,
      latitude: latitude !== undefined ? latitude : event.latitude,
      longitude: longitude !== undefined ? longitude : event.longitude,
      eventDate: eventDate !== undefined ? eventDate : event.eventDate,
      eventTime: eventTime !== undefined ? eventTime : event.eventTime,
      duration: duration !== undefined ? duration : event.duration,
      maxParticipants: maxParticipants !== undefined ? maxParticipants : event.maxParticipants,
      status: status || event.status,
      tags: tags || event.tags
    });

    const updatedEvent = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    console.log('✅ Event updated successfully');
    console.log('Updated location:', updatedEvent.location);

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      error: 'Failed to update event',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (only creator)
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (event.creatorId !== req.user.id) {
      return res.status(403).json({ 
        error: 'You can only delete your own events',
        code: 'UNAUTHORIZED'
      });
    }

    // Delete all participants first
    await EventParticipant.destroy({
      where: { eventId: id }
    });

    // Delete event
    await event.destroy();

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      error: 'Failed to delete event',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Join/update participation in event
// @route   POST /api/events/:id/participate
// @access  Private
const participateInEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'going', 'not_going', 'maybe'

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check if event is full
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants && status === 'going') {
      return res.status(400).json({ 
        error: 'Event is full',
        code: 'EVENT_FULL'
      });
    }

    // Check if already participating
    let participation = await EventParticipant.findOne({
      where: { eventId: id, userId: req.user.id }
    });

    if (participation) {
      // Update existing participation
      const oldStatus = participation.status;
      await participation.update({ status });

      // Update participant count
      if (oldStatus !== 'going' && status === 'going') {
        await event.increment('currentParticipants');
        
        // Send notification to event creator when someone confirms attendance (if not the creator)
        if (event.creatorId !== req.user.id) {
          try {
            const creator = await User.findByPk(event.creatorId);
            if (creator && creator.fcmToken) {
              await sendNotification(creator.fcmToken, {
                title: `✅ ${req.user.firstName} confirmed attendance!`,
                body: `${req.user.firstName} ${req.user.lastName} is now going to ${event.name}.`,
                data: {
                  type: 'event_confirmed',
                  eventId: String(event.id),
                  eventName: event.name,
                  userId: String(req.user.id),
                  userName: `${req.user.firstName} ${req.user.lastName}`
                }
              });
              console.log(`✅ Sent event confirmation notification to creator ${creator.id}`);
            }
          } catch (notifErr) {
            console.log(`⚠️  Failed to send event confirmation notification:`, notifErr.message);
          }
        }
      } else if (oldStatus === 'going' && status !== 'going') {
        await event.decrement('currentParticipants');
      }

      res.json({
        message: 'Participation updated',
        participation,
        event: await Event.findByPk(id)
      });
    } else {
      // Create new participation
      participation = await EventParticipant.create({
        eventId: id,
        userId: req.user.id,
        status: status || 'going'
      });

      // Update participant count if going
      if (status === 'going') {
        await event.increment('currentParticipants');
        
        // Send notification to event creator (if not the creator joining their own event)
        if (event.creatorId !== req.user.id) {
          try {
            const creator = await User.findByPk(event.creatorId);
            if (creator && creator.fcmToken) {
              await sendNotification(creator.fcmToken, {
                title: `🎉 New attendee for ${event.name}!`,
                body: `${req.user.firstName} ${req.user.lastName} is going to your event.`,
                data: {
                  type: 'event_join',
                  eventId: String(event.id),
                  eventName: event.name,
                  userId: String(req.user.id),
                  userName: `${req.user.firstName} ${req.user.lastName}`
                }
              });
              console.log(`✅ Sent event join notification to creator ${creator.id}`);
            }
          } catch (notifErr) {
            console.log(`⚠️  Failed to send event join notification:`, notifErr.message);
          }
        }
      }

      res.status(201).json({
        message: 'Successfully joined event',
        participation,
        event: await Event.findByPk(id)
      });
    }
  } catch (error) {
    console.error('Error participating in event:', error);
    res.status(500).json({ 
      error: 'Failed to participate in event',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Leave event
// @route   DELETE /api/events/:id/participate
// @access  Private
const leaveEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (event.creatorId === req.user.id) {
      return res.status(400).json({ 
        error: 'Event creator cannot leave their own event',
        code: 'CREATOR_CANNOT_LEAVE'
      });
    }

    const participation = await EventParticipant.findOne({
      where: { eventId: id, userId: req.user.id }
    });

    if (!participation) {
      return res.status(404).json({ 
        error: 'You are not participating in this event',
        code: 'NOT_PARTICIPATING'
      });
    }

    // Update participant count if was going
    if (participation.status === 'going') {
      await event.decrement('currentParticipants');
    }

    await participation.destroy();

    res.json({
      message: 'Successfully left event',
      event: await Event.findByPk(id)
    });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ 
      error: 'Failed to leave event',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Add an external (non-Mooves) participant
// @route   POST /api/events/:id/external-participants
// @access  Private (only creator)
const addExternalParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status } = req.body;

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    if (event.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Only the event creator can add guests',
        code: 'UNAUTHORIZED'
      });
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
    const normalizedStatus = PARTICIPATION_STATUSES.has((status || '').toLowerCase())
      ? (status || '').toLowerCase()
      : 'going';

    if (!trimmedName && !trimmedEmail && !trimmedPhone) {
      return res.status(400).json({
        error: 'Please provide at least a name, email, or phone number for the guest',
        code: 'INVALID_GUEST'
      });
    }

    if (event.maxParticipants && normalizedStatus === 'going' && event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({
        error: 'Event is already at capacity',
        code: 'EVENT_FULL'
      });
    }

    const participant = await EventParticipant.create({
      eventId: event.id,
      status: normalizedStatus,
      contactName: trimmedName || null,
      contactEmail: trimmedEmail || null,
      contactPhone: trimmedPhone || null
    });

    await adjustParticipantCount(event, null, normalizedStatus);

    const participantWithUser = await EventParticipant.findByPk(participant.id, {
      attributes: ['id', 'eventId', 'userId', 'status', 'contactName', 'contactEmail', 'contactPhone', 'joinedAt'],
      include: getParticipantUserIncludes()
    });

    const updatedEvent = await Event.findByPk(id, {
      include: getEventDetailIncludes()
    });

    return res.status(201).json({
      message: 'Guest added successfully',
      participant: participantWithUser,
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error adding external participant:', error);
    res.status(500).json({
      error: 'Failed to add guest',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Update an external participant's details or status
// @route   PUT /api/events/:eventId/external-participants/:participantId
// @access  Private (only creator)
const updateExternalParticipant = async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    const { name, email, phone, status } = req.body;

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    if (event.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Only the event creator can update guests',
        code: 'UNAUTHORIZED'
      });
    }

    const participant = await EventParticipant.findOne({
      where: { id: participantId, eventId },
      include: getParticipantUserIncludes()
    });

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found',
        code: 'PARTICIPANT_NOT_FOUND'
      });
    }

    if (participant.userId) {
      return res.status(400).json({
        error: 'Use the regular participant APIs for Mooves users',
        code: 'INVALID_OPERATION'
      });
    }

    const trimmedName = name !== undefined && name !== null ? String(name).trim() : participant.contactName;
    const trimmedEmail =
      email !== undefined && email !== null ? String(email).trim().toLowerCase() : participant.contactEmail;
    const trimmedPhone = phone !== undefined && phone !== null ? String(phone).trim() : participant.contactPhone;
    const normalizedStatus = status
      ? (PARTICIPATION_STATUSES.has(String(status).trim().toLowerCase())
          ? String(status).trim().toLowerCase()
          : participant.status)
      : participant.status;

    if (
      (!trimmedName || trimmedName.length === 0) &&
      (!trimmedEmail || trimmedEmail.length === 0) &&
      (!trimmedPhone || trimmedPhone.length === 0)
    ) {
      return res.status(400).json({
        error: 'Guest must have at least one contact detail',
        code: 'INVALID_GUEST'
      });
    }

    if (
      event.maxParticipants &&
      normalizedStatus === 'going' &&
      participant.status !== 'going' &&
      event.currentParticipants >= event.maxParticipants
    ) {
      return res.status(400).json({
        error: 'Event is already at capacity',
        code: 'EVENT_FULL'
      });
    }

    const previousStatus = participant.status;

    await participant.update({
      contactName: trimmedName,
      contactEmail: trimmedEmail || null,
      contactPhone: trimmedPhone || null,
      status: normalizedStatus
    });

    await adjustParticipantCount(event, previousStatus, normalizedStatus);

    const updatedParticipant = await EventParticipant.findByPk(participantId, {
      attributes: ['id', 'eventId', 'userId', 'status', 'contactName', 'contactEmail', 'contactPhone', 'joinedAt'],
      include: getParticipantUserIncludes()
    });

    const updatedEvent = await Event.findByPk(eventId, {
      include: getEventDetailIncludes()
    });

    return res.json({
      message: 'Guest updated successfully',
      participant: updatedParticipant,
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating external participant:', error);
    res.status(500).json({
      error: 'Failed to update guest',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Remove an external participant from the event
// @route   DELETE /api/events/:eventId/external-participants/:participantId
// @access  Private (only creator)
const removeExternalParticipant = async (req, res) => {
  try {
    const { eventId, participantId } = req.params;

    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    if (event.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Only the event creator can remove guests',
        code: 'UNAUTHORIZED'
      });
    }

    const participant = await EventParticipant.findOne({
      where: { id: participantId, eventId },
      include: getParticipantUserIncludes()
    });

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found',
        code: 'PARTICIPANT_NOT_FOUND'
      });
    }

    if (participant.userId) {
      return res.status(400).json({
        error: 'Use the regular participant APIs for Mooves users',
        code: 'INVALID_OPERATION'
      });
    }

    const previousStatus = participant.status;

    await participant.destroy();
    await adjustParticipantCount(event, previousStatus, null);

    const updatedEvent = await Event.findByPk(eventId, {
      include: getEventDetailIncludes()
    });

    return res.json({
      message: 'Guest removed successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error removing external participant:', error);
    res.status(500).json({
      error: 'Failed to remove guest',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Get user's created events
// @route   GET /api/events/my-events
// @access  Private
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { creatorId: req.user.id },
      include: [
        {
          model: EventParticipant,
          as: 'participants',
          attributes: ['id', 'userId', 'status', 'contactName', 'contactEmail', 'contactPhone', 'joinedAt'],
          include: [
            {
              model: User,
              as: 'user',
              required: false,
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ events });
  } catch (error) {
    console.error('Error getting my events:', error);
    res.status(500).json({ 
      error: 'Failed to get your events',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Get user's participating events
// @route   GET /api/events/my-participations
// @access  Private
const getMyParticipations = async (req, res) => {
  try {
    const participations = await EventParticipant.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Event,
          as: 'event',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ],
      order: [['joinedAt', 'DESC']]
    });

    res.json({ participations });
  } catch (error) {
    console.error('Error getting participations:', error);
    res.status(500).json({ 
      error: 'Failed to get your participations',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Message event creator
// @route   POST /api/events/:id/message-creator
// @access  Private
const messageEventCreator = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { message } = req.body;

    console.log('=== CREATE MATCH WITH EVENT CREATOR ===');
    console.log('User ID:', req.user.id);
    console.log('Event ID:', eventId);
    console.log('Message:', message || 'No message');

    // Validate message if provided
    if (message && message.length > 1000) {
      return res.status(400).json({ error: 'Message content cannot exceed 1000 characters' });
    }

    // Get event
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          include: [
            {
              model: UserProfile,
              as: 'profile',
              attributes: ['id']
            }
          ]
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if trying to message yourself
    if (event.creatorId === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Get current user's profile
    const currentProfile = await UserProfile.findOne({ where: { userId: req.user.id } });
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'Your profile not found' });
    }

    // Get creator's profile
    const creatorProfile = event.creator.profile;
    
    if (!creatorProfile) {
      return res.status(404).json({ error: 'Event creator profile not found' });
    }

    console.log('Current profile ID:', currentProfile.id);
    console.log('Creator profile ID:', creatorProfile.id);

    // Ensure consistent ordering: smaller ID is always user1Id
    const user1Id = Math.min(currentProfile.id, creatorProfile.id);
    const user2Id = Math.max(currentProfile.id, creatorProfile.id);
    const isCurrentUserUser1 = currentProfile.id === user1Id;

    // Check if there's already a match record between these users
    let existingMatch = await Match.findOne({
      where: {
        user1Id: user1Id,
        user2Id: user2Id
      }
    });

    console.log('Existing match found:', existingMatch ? existingMatch.id : 'Not found');

    if (existingMatch) {
      // Update existing match to matched status
      console.log('Updating existing match. Current status:', existingMatch.status);
      existingMatch.user1Liked = true;
      existingMatch.user2Liked = true;
      existingMatch.status = 'matched';
      existingMatch.matchedAt = existingMatch.matchedAt || new Date();
      
      await existingMatch.save();
      console.log('Match updated successfully. New status:', existingMatch.status);
    } else {
      // Create new match record
      console.log('Creating new match record');
      const matchData = {
        user1Id: user1Id,
        user2Id: user2Id,
        status: 'matched',
        user1Liked: true,
        user2Liked: true,
        matchedAt: new Date()
      };
      
      existingMatch = await Match.create(matchData);
      console.log('New match created successfully. ID:', existingMatch.id);
    }

    // Create the message only if provided
    let newMessage = null;
    if (message && message.trim().length > 0) {
      newMessage = await Message.create({
        matchId: existingMatch.id,
        senderId: currentProfile.id,
        content: message.trim()
      });
      console.log('Message created successfully. ID:', newMessage.id);
    }

    // Emit match notification via WebSocket if available
    if (req.io) {
      const matchData = {
        matchId: existingMatch.id,
        matchedAt: existingMatch.matchedAt,
        matchedUserId: creatorProfile.id,
        matchedUserName: `${event.creator.firstName} ${event.creator.lastName}`,
        currentUserId: req.user.id,
        currentUserName: `${req.user.firstName} ${req.user.lastName}`
      };

      // Emit to current user
      req.io.to(`user_${req.user.id}`).emit('new_match', {
        ...matchData,
        isCurrentUser: true
      });

      // Emit to creator
      req.io.to(`user_${event.creatorId}`).emit('new_match', {
        ...matchData,
        isCurrentUser: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Match created successfully',
      match: existingMatch,
      messageId: newMessage ? newMessage.id : null
    });
  } catch (error) {
    console.error('Error messaging event creator:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to message event creator',
      message: 'Failed to message event creator',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Invite users to an existing event
// @route   POST /api/events/:id/invite
// @access  Private (only creator)
const inviteUsersToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of user IDs to invite

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'User IDs array is required',
        code: 'INVALID_INPUT'
      });
    }

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND'
      });
    }

    // Check if user is the creator
    if (event.creatorId !== req.user.id) {
      return res.status(403).json({
        error: 'Only event creator can invite users',
        code: 'UNAUTHORIZED'
      });
    }

    const creator = await User.findByPk(req.user.id);
    const results = {
      invited: [],
      alreadyParticipating: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        // Check if user is already a participant
        const existingParticipant = await EventParticipant.findOne({
          where: { eventId: id, userId: userId }
        });

        if (existingParticipant) {
          results.alreadyParticipating.push(userId);
          continue;
        }

        // Add user as participant with "maybe" status (invited)
        await EventParticipant.create({
          eventId: id,
          userId: userId,
          status: 'maybe'
        });

        // Send notification to invited user
        try {
          const invitedUser = await User.findByPk(userId);
          if (invitedUser && creator) {
            await sendEventInvitationNotification(
              invitedUser,
              creator,
              event
            );
            console.log(`✅ Sent invitation notification to user ${userId} for event ${id}`);
          }
        } catch (notifErr) {
          console.log(`⚠️  Failed to send notification to user ${userId}:`, notifErr.message);
        }

        results.invited.push(userId);
      } catch (err) {
        console.log(`❌ Failed to invite user ${userId}:`, err.message);
        results.failed.push(userId);
      }
    }

    res.json({
      message: 'Invitation process completed',
      results
    });
  } catch (error) {
    console.error('Error inviting users to event:', error);
    res.status(500).json({
      error: 'Failed to invite users',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  participateInEvent,
  leaveEvent,
  addExternalParticipant,
  updateExternalParticipant,
  removeExternalParticipant,
  getMyEvents,
  getMyParticipations,
  messageEventCreator,
  inviteUsersToEvent
};

