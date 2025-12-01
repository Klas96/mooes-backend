const { validationResult } = require('express-validator');
const { TrainingSession, UserGoalProgress, StoreGoal } = require('../models');
const { updateProgressForUser } = require('../routes/userGoalProgress');

// Helper to ensure record belongs to user
const assertOwnership = (session, userId) => {
  if (!session || session.userId !== userId) {
    const error = new Error('Training session not found');
    error.statusCode = 404;
    throw error;
  }
};

// @desc    List training sessions for current user
// @route   GET /api/training-sessions
// @access  Private
const listSessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.findAll({
      where: { userId: req.user.id },
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Create training session
// @route   POST /api/training-sessions
// @access  Private
const createSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, date, durationMinutes, notes, goalReached } = req.body;

    const session = await TrainingSession.create({
      userId: req.user.id,
      title,
      date,
      durationMinutes: durationMinutes ?? null,
      notes: notes ?? null,
      goalReached: goalReached === true,
    });

    // Update progress on all store goals this user has joined
    try {
      const userGoals = await UserGoalProgress.findAll({
        where: { userId: req.user.id },
        attributes: ['goalId']
      });
      for (const userGoal of userGoals) {
        await updateProgressForUser(req.user.id, userGoal.goalId);
      }
    } catch (error) {
      console.error('Error updating store goal progress:', error);
      // Don't fail the request if progress update fails
    }

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update training session
// @route   PATCH /api/training-sessions/:id
// @access  Private
const updateSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await TrainingSession.findByPk(req.params.id);
    assertOwnership(session, req.user.id);

    const { title, date, durationMinutes, notes, goalReached } = req.body;

    if (title !== undefined) session.title = title;
    if (date !== undefined) session.date = date;
    if (durationMinutes !== undefined) session.durationMinutes = durationMinutes;
    if (notes !== undefined) session.notes = notes;
    if (goalReached !== undefined) session.goalReached = goalReached;

    await session.save();

    // Update progress on all store goals this user has joined
    try {
      const userGoals = await UserGoalProgress.findAll({
        where: { userId: req.user.id },
        attributes: ['goalId']
      });
      for (const userGoal of userGoals) {
        await updateProgressForUser(req.user.id, userGoal.goalId);
      }
    } catch (error) {
      console.error('Error updating store goal progress:', error);
      // Don't fail the request if progress update fails
    }

    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete training session
// @route   DELETE /api/training-sessions/:id
// @access  Private
const deleteSession = async (req, res) => {
  try {
    const session = await TrainingSession.findByPk(req.params.id);
    assertOwnership(session, req.user.id);

    await session.destroy();

    // Update progress on all store goals this user has joined
    try {
      const userGoals = await UserGoalProgress.findAll({
        where: { userId: req.user.id },
        attributes: ['goalId']
      });
      for (const userGoal of userGoals) {
        await updateProgressForUser(req.user.id, userGoal.goalId);
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
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Return QR payload for completed session
// @route   GET /api/training-sessions/:id/qr
// @access  Private
const getQrPayload = async (req, res) => {
  try {
    const session = await TrainingSession.findByPk(req.params.id);
    assertOwnership(session, req.user.id);

    if (!session.goalReached) {
      return res.status(400).json({ error: 'Goal must be reached before generating QR reward.' });
    }

    const payload = {
      sessionId: session.id,
      title: session.title,
      date: session.date,
      durationMinutes: session.durationMinutes,
      notes: session.notes,
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
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  getQrPayload,
};

