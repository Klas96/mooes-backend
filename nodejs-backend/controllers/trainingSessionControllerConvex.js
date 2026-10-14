/**
 * Training Session Controller (Convex Version)
 *
 * This controller uses Convex instead of Sequelize for database operations.
 */

const convexService = require('../services/convexService');
const { validationResult } = require('express-validator');
const { updateProgressForUser } = require('../routes/userGoalProgress');

/**
 * Helper function to handle errors
 */
const handleError = (error, res) => {
  console.error('Training session error:', error);
  return res.status(500).json({
    error: error.message || 'An unexpected error occurred. Please try again.'
  });
};

/**
 * Helper to ensure record belongs to user
 */
const assertOwnership = (session, userId) => {
  if (!session || session.userId !== userId) {
    const error = new Error('Training session not found');
    error.statusCode = 404;
    throw error;
  }
};

/**
 * Format training session for response
 */
const formatSession = (session) => {
  if (!session) return null;
  
  return {
    id: session._id,
    userId: session.userId,
    title: session.title,
    date: session.date,
    durationMinutes: session.durationMinutes ?? null,
    distanceKm: session.distanceKm ?? null,
    goalReached: session.goalReached || false,
    googleFitActivityId: session.googleFitActivityId ?? null,
    stravaActivityId: session.stravaActivityId ?? null,
    createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
    updatedAt: session.updatedAt ? new Date(session.updatedAt).toISOString() : null,
  };
};

/**
 * @desc    List training sessions for current user
 * @route   GET /api/training-sessions
 * @access  Private
 */
const listSessions = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const sessions = await convexService.query('trainingSessions:getByUserId', { userId });

    // Sort by date descending, then by createdAt descending
    sessions.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime;
    });

    res.json({ 
      sessions: sessions.map(formatSession)
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return handleError(error, res);
  }
};

/**
 * @desc    Create training session
 * @route   POST /api/training-sessions
 * @access  Private
 */
const createSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id || req.user._id;
    const { title, date, durationMinutes, distanceKm, goalReached } = req.body;

    const sessionId = await convexService.mutation('trainingSessions:create', {
      userId,
      title,
      date,
      durationMinutes: durationMinutes ?? undefined,
      distanceKm: distanceKm ?? undefined,
      goalReached: goalReached === true,
    });

    const session = await convexService.query('trainingSessions:getById', { id: sessionId });

    // Update progress on all store goals this user has joined
    try {
      console.log(`🔄 Updating progress for all goals after session creation`);
      console.log(`  - Session created: ${sessionId}, Date: ${date}, Distance: ${distanceKm} km, Duration: ${durationMinutes} min`);
      const userProgress = await convexService.query('userGoalProgress:getByUserId', { userId });
      console.log(`  - Found ${userProgress.length} goals to update`);
      for (const progress of userProgress) {
        console.log(`  - Updating progress for goal: ${progress.goalId}`);
        await updateProgressForUser(userId, progress.goalId);
      }
      console.log(`✅ Finished updating progress for all goals`);
    } catch (error) {
      console.error('❌ Error updating store goal progress:', error);
      console.error('Error stack:', error.stack);
      // Don't fail the request if progress update fails
    }

    res.status(201).json(formatSession(session));
  } catch (error) {
    console.error('Error creating session:', error);
    return handleError(error, res);
  }
};

/**
 * @desc    Update training session
 * @route   PATCH /api/training-sessions/:id
 * @access  Private
 */
const updateSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id || req.user._id;
    const sessionId = req.params.id;

    // Get existing session to verify ownership
    const existingSession = await convexService.query('trainingSessions:getById', { id: sessionId });
    assertOwnership(existingSession, userId);

    const { title, date, durationMinutes, distanceKm, goalReached } = req.body;

    // Build update object - only include defined fields
    const updateData = { id: sessionId };
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = date;
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes ?? undefined;
    if (distanceKm !== undefined) updateData.distanceKm = distanceKm ?? undefined;
    if (goalReached !== undefined) updateData.goalReached = goalReached;

    await convexService.mutation('trainingSessions:update', updateData);

    const updatedSession = await convexService.query('trainingSessions:getById', { id: sessionId });

    // Update progress on all store goals this user has joined
    try {
      const userProgress = await convexService.query('userGoalProgress:getByUserId', { userId });
      for (const progress of userProgress) {
        await updateProgressForUser(userId, progress.goalId);
      }
    } catch (error) {
      console.error('Error updating store goal progress:', error);
      // Don't fail the request if progress update fails
    }

    res.json(formatSession(updatedSession));
  } catch (error) {
    console.error('Error updating session:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(error, res);
  }
};

/**
 * @desc    Delete training session
 * @route   DELETE /api/training-sessions/:id
 * @access  Private
 */
const deleteSession = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const sessionId = req.params.id;

    // Get existing session to verify ownership
    const existingSession = await convexService.query('trainingSessions:getById', { id: sessionId });
    assertOwnership(existingSession, userId);

    await convexService.mutation('trainingSessions:remove', { id: sessionId });

    // Update progress on all store goals this user has joined (to recalculate after deletion)
    try {
      const userProgress = await convexService.query('userGoalProgress:getByUserId', { userId });
      for (const progress of userProgress) {
        await updateProgressForUser(userId, progress.goalId);
      }
    } catch (error) {
      console.error('Error updating store goal progress:', error);
      // Don't fail the request if progress update fails
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(error, res);
  }
};

/**
 * @desc    Return QR payload for completed session
 * @route   GET /api/training-sessions/:id/qr
 * @access  Private
 */
const getQrPayload = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const sessionId = req.params.id;

    const session = await convexService.query('trainingSessions:getById', { id: sessionId });
    assertOwnership(session, userId);

    if (!session.goalReached) {
      return res.status(400).json({ error: 'Goal must be reached before generating QR reward.' });
    }

    const payload = {
      sessionId: session._id,
      title: session.title,
      date: session.date,
      durationMinutes: session.durationMinutes ?? null,
      distanceKm: session.distanceKm ?? null,
      goalReached: session.goalReached,
      generatedAt: new Date().toISOString(),
    };

    res.json({
      payload,
      payloadString: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error generating QR payload:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(error, res);
  }
};

module.exports = {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  getQrPayload,
};
