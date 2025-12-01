const request = require('supertest');
const { app } = require('./setup'); // Use shared setup
const { User, UserProfile, sequelize } = require('../models');
const jwt = require('jsonwebtoken'); // Used to sign tokens for testing

// Helper function to generate a token
const generateToken = (id, isPremium = false) => {
  return jwt.sign({ id, isPremium }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
};

const AI_MESSAGE_LIMIT = 5; // As defined in aiController.js

describe('AI Chat API - Message Limiting', () => {
  let testUser;
  let testUserProfile;
  let authToken;

  beforeEach(async () => {
    // Create a fresh test user for each test
    testUser = await User.create({
      email: `ai-test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'AI',
      lastName: 'Tester',
      isPremium: false,
      aiMessageCount: 0,
      lastAiMessageDate: null,
      emailVerified: true, // Add this to allow login
    });

    testUserProfile = await UserProfile.create({
      userId: testUser.id,
      bio: 'Test bio for AI chat.',
      gender: 'F',
      genderPreference: 'M',
      relationshipType: 'S',
    });

    // Create additional users for potential matches
    const additionalUsers = await Promise.all([
      User.create({
        email: `match1-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Match',
        lastName: 'One',
        isPremium: false,
        emailVerified: true,
      }),
      User.create({
        email: `match2-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Match',
        lastName: 'Two',
        isPremium: false,
        emailVerified: true,
      }),
      User.create({
        email: `match3-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Match',
        lastName: 'Three',
        isPremium: false,
        emailVerified: true,
      })
    ]);

    // Create profiles for additional users
    await Promise.all([
      UserProfile.create({
        userId: additionalUsers[0].id,
        bio: 'I love hiking and photography',
        gender: 'F',
        genderPreference: 'M',
        relationshipType: 'S',
      }),
      UserProfile.create({
        userId: additionalUsers[1].id,
        bio: 'Looking for someone to share adventures with',
        gender: 'F',
        genderPreference: 'M',
        relationshipType: 'C',
      }),
      UserProfile.create({
        userId: additionalUsers[2].id,
        bio: 'Passionate about music and travel',
        gender: 'F',
        genderPreference: 'M',
        relationshipType: 'S',
      })
    ]);

    // Generate token for the test user
    authToken = generateToken(testUser.id, false);
  });

  afterEach(async () => {
    // Clean up test user
    if (testUser) {
      await testUser.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Non-Premium User', () => {
    it('should allow sending one message', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: `Test message 1` });
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('response');

      // Reload user to get updated message count
      await testUser.reload();
      expect(testUser.aiMessageCount).toBe(1);
      expect(testUser.lastAiMessageDate).not.toBeNull();
    });

    it('should allow sending messages within the limit', async () => {
      for (let i = 0; i < AI_MESSAGE_LIMIT; i++) {
        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message: `Test message ${i + 1}` });
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('response');

        // Reload user to get updated message count
        await testUser.reload();
        expect(testUser.aiMessageCount).toBe(i + 1);
        expect(testUser.lastAiMessageDate).not.toBeNull();
      }
    });

    it('should return 429 error when message limit is exceeded', async () => {
      // Send messages up to the limit
      await testUser.update({ aiMessageCount: AI_MESSAGE_LIMIT, lastAiMessageDate: new Date() });
      authToken = generateToken(testUser.id, false); // Re-generate token with current state

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'This message should be blocked' });

      expect(response.statusCode).toBe(429);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Message limit reached');
      expect(response.body.limitReached).toBe(true);

      // Reload user to verify count didn't increase
      await testUser.reload();
      expect(testUser.aiMessageCount).toBe(AI_MESSAGE_LIMIT); // Count should not increase
    });

    it('should reset message count on a new day', async () => {
      // Set last message date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await testUser.update({ aiMessageCount: AI_MESSAGE_LIMIT, lastAiMessageDate: yesterday });
      authToken = generateToken(testUser.id, false);

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'First message of new day' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('response');

      // Reload user to get updated message count
      await testUser.reload();
      expect(testUser.aiMessageCount).toBe(1); // Count should reset to 1
      expect(testUser.lastAiMessageDate).not.toBeNull();
      const lastMessageDate = new Date(testUser.lastAiMessageDate);
      const today = new Date();
      expect(lastMessageDate.getFullYear()).toBe(today.getFullYear());
      expect(lastMessageDate.getMonth()).toBe(today.getMonth());
      expect(lastMessageDate.getDate()).toBe(today.getDate());
    });
  });

  describe('Premium User', () => {
    beforeEach(async () => {
      // Set user to premium
      await testUser.update({ isPremium: true, aiMessageCount: 0, lastAiMessageDate: null });
      authToken = generateToken(testUser.id, true);
    });

    it('should allow unlimited messages', async () => {
      // Send more messages than the non-premium limit
      for (let i = 0; i < AI_MESSAGE_LIMIT + 5; i++) {
        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message: `Premium message ${i + 1}` });
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('response');
      }

      // Reload user to get final message count
      await testUser.reload();
      // Premium users don't have their message count incremented since they have unlimited messages
      expect(testUser.aiMessageCount).toBe(0); // Should remain at initial value
    });

    it('should not be blocked by message limits', async () => {
      // Set message count to the limit (should not matter for premium users)
      await testUser.update({ aiMessageCount: AI_MESSAGE_LIMIT, lastAiMessageDate: new Date() });
      authToken = generateToken(testUser.id, true);

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Premium message should not be blocked' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('response');
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Test message without auth' });

      expect(response.statusCode).toBe(401);
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer invalid_token')
        .send({ message: 'Test message with invalid token' });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should require a message', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject empty messages', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject very long messages', async () => {
      const longMessage = 'A'.repeat(10001); // Over 10,000 characters
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: longMessage });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
