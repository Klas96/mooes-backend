require('dotenv').config();
process.env.NODE_ENV = 'test';

// Safety check: Prevent running tests on production database
if (process.env.DATABASE_URL &&
    /google|gcloud|prod|production|mooves|fresh-oath/i.test(process.env.DATABASE_URL)) {
  throw new Error('❌ Refusing to run tests on a production or cloud database! Please use a local test database.');
}

const request = require('supertest');
const { app } = require('./setup'); // Use shared setup
const { User } = require('../models');
const { google } = require('googleapis');

// Debug: Check environment variables
console.log('🔍 Environment variables in test:');
console.log('GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL);
console.log('GOOGLE_PLAY_PRIVATE_KEY:', process.env.GOOGLE_PLAY_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('GOOGLE_PLAY_PACKAGE_NAME:', process.env.GOOGLE_PLAY_PACKAGE_NAME);

describe.skip('Billing API (Skipped - Google Play tests disabled for now)', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create a fresh test user with verified email
    testUser = await User.create({
      email: `billing-test-${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Billing',
      lastName: 'Test',
      isPremium: false,
      emailVerified: true,
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'testpassword123',
      });
    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up test user
    if (testUser) {
      await testUser.destroy();
    }
  });

  describe('POST /api/billing/verify', () => {
    it('should verify Google Play purchase successfully', async () => {
      // Mock successful Google Play verification
      const mockGooglePlayResponse = {
        data: {
          purchaseState: 0, // PURCHASED
          expiryTimeMillis: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      };

      google.androidpublisher().purchases.subscriptions.get.mockResolvedValue(mockGooglePlayResponse);

      const response = await request(app)
        .post('/api/billing/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          product_id: 'mooves_monthly_premium',
          purchase_token: 'test-purchase-token-123',
          platform: 'android',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.product_id).toBe('mooves_monthly_premium');
      expect(response.body.platform).toBe('android');

      // Verify user premium status was updated
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.isPremium).toBe(true);
      expect(updatedUser.premiumPlan).toBe('mooves_monthly_premium');
      expect(updatedUser.platform).toBe('android');
    });

    it('should reject invalid Google Play purchase', async () => {
      // Mock failed Google Play verification
      const mockGooglePlayResponse = {
        data: {
          purchaseState: 1, // CANCELED
        },
      };

      google.androidpublisher().purchases.subscriptions.get.mockResolvedValue(mockGooglePlayResponse);

      const response = await request(app)
        .post('/api/billing/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          product_id: 'mooves_monthly_premium',
          purchase_token: 'invalid-token',
          platform: 'android',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid purchase');
    });

    it('should handle Google Play API errors', async () => {
      // Mock Google Play API error
      google.androidpublisher().purchases.subscriptions.get.mockRejectedValue(
        new Error('Google Play API error')
      );

      const response = await request(app)
        .post('/api/billing/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          product_id: 'mooves_monthly_premium',
          purchase_token: 'test-token',
          platform: 'android',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid purchase');
    });

    it('should reject unsupported platform', async () => {
      const response = await request(app)
        .post('/api/billing/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          product_id: 'mooves_monthly_premium',
          purchase_token: 'test-token',
          platform: 'web', // Unsupported platform
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Unsupported platform');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/billing/verify')
        .send({
          product_id: 'mooves_monthly_premium',
          purchase_token: 'test-token',
          platform: 'android',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/billing/cancel', () => {
    beforeEach(async () => {
      // Set user as premium for testing
      await testUser.update({
        isPremium: true,
        premiumExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
        premiumPlan: 'mooves_monthly_premium',
      });
    });

    it('should cancel subscription successfully', async () => {
      const response = await request(app)
        .post('/api/billing/cancel')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription cancelled successfully');

      // Verify user premium status was updated
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.isPremium).toBe(false);
      expect(updatedUser.premiumExpiry).toBeNull();
      expect(updatedUser.premiumPlan).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/billing/cancel');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/billing/status', () => {
    beforeEach(async () => {
      // Set user as premium for testing
      await testUser.update({
        isPremium: true,
        premiumExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
        premiumPlan: 'mooves_monthly_premium',
        platform: 'android',
      });
    });

    it('should return active subscription status', async () => {
      // Ensure user is properly set up for this test
      await testUser.reload();
      console.log('🔍 User state before test:', {
        isPremium: testUser.isPremium,
        premiumExpiry: testUser.premiumExpiry,
        premiumPlan: testUser.premiumPlan,
        platform: testUser.platform
      });
      
      const response = await request(app)
        .get('/api/billing/status')
        .set('Authorization', `Bearer ${authToken}`);

      console.log('🔍 Subscription status response:', response.body);
      
      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(true);
      expect(response.body.premiumPlan).toBe('mooves_monthly_premium');
      expect(response.body.platform).toBe('android');
      expect(response.body.premiumExpiry).toBeDefined();
    });

    it('should return inactive status for expired subscription', async () => {
      // Set expired subscription
      await testUser.update({
        premiumExpiry: new Date(Date.now() - (24 * 60 * 60 * 1000)), // 1 day ago
      });

      const response = await request(app)
        .get('/api/billing/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/billing/status');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/billing/products', () => {
    it('should return Android products', async () => {
      const response = await request(app)
        .get('/api/billing/products?platform=android');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.platform).toBe('android');
      expect(response.body.products).toHaveLength(2);
      
      const productIds = response.body.products.map(p => p.id);
      expect(productIds).toContain('mooves_monthly_premium');
      expect(productIds).toContain('mooves_yearly_premium');
    });

    it('should return iOS products', async () => {
      const response = await request(app)
        .get('/api/billing/products?platform=ios');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.platform).toBe('ios');
      expect(response.body.products).toHaveLength(2);
      
      const productIds = response.body.products.map(p => p.id);
      expect(productIds).toContain('mooves_monthly_premium_ios');
      expect(productIds).toContain('mooves_yearly_premium_ios');
    });

    it('should default to Android platform', async () => {
      const response = await request(app)
        .get('/api/billing/products');

      expect(response.status).toBe(200);
      expect(response.body.platform).toBe('android');
    });
  });

  describe('Subscription Duration Helper', () => {
    it('should return correct duration for monthly subscription', () => {
      const { getSubscriptionDuration } = require('../routes/billing');
      const duration = getSubscriptionDuration('mooves_monthly_premium');
      expect(duration).toBe(30);
    });

    it('should return correct duration for yearly subscription', () => {
      const { getSubscriptionDuration } = require('../routes/billing');
      const duration = getSubscriptionDuration('mooves_yearly_premium');
      expect(duration).toBe(365);
    });

    it('should return default duration for unknown product', () => {
      const { getSubscriptionDuration } = require('../routes/billing');
      const duration = getSubscriptionDuration('unknown_product');
      expect(duration).toBe(30);
    });
  });
}); 