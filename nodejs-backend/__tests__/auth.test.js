jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  hashSync: jest.fn().mockReturnValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
  compareSync: jest.fn().mockReturnValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ id: 1 })
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createAuthController } = require('../controllers/authController');
const request = require('supertest');
const { app } = require('./setup');

describe('Authentication Logic Tests', () => {
  let mockUser;
  let mockRes;
  let mockUserModel;
  let mockUserProfileModel;
  let mockEmailService;
  let authController;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock models and services
    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn(),
    };
    
    mockUserProfileModel = {
      create: jest.fn(),
    };
    
    mockEmailService = {
      sendVerificationEmail: jest.fn(),
      generateVerificationCode: jest.fn(),
    };
    
    // Create controller with mocked dependencies
    authController = createAuthController({
      User: mockUserModel,
      UserProfile: mockUserProfileModel,
      emailService: mockEmailService,
    });
    
    mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      firstName: 'Test',
      lastName: 'User',
      emailVerified: false,
      emailVerificationToken: '123456',
      emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
      save: jest.fn().mockResolvedValue(true),
      getFullName: jest.fn().mockReturnValue('Test User'),
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      expect(hashedPassword).toBe('hashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should verify password correctly', async () => {
      const password = 'password123';
      const hashedPassword = 'hashedPassword';
      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate JWT token', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const secret = 'test_secret';
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });
      expect(token).toBe('mock.jwt.token');
      expect(jwt.sign).toHaveBeenCalledWith(payload, secret, { expiresIn: '7d' });
    });

    it('should verify JWT token', () => {
      const token = 'mock.jwt.token';
      const secret = 'test_secret';
      const decoded = jwt.verify(token, secret);
      expect(decoded).toEqual({ id: 1 });
      expect(jwt.verify).toHaveBeenCalledWith(token, secret);
    });
  });

  describe('User Data Validation', () => {
    it('should validate user data structure', () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        birthDate: '1990-01-01'
      };

      expect(userData).toHaveProperty('firstName');
      expect(userData).toHaveProperty('lastName');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('password');
      expect(userData).toHaveProperty('birthDate');
      expect(typeof userData.firstName).toBe('string');
      expect(typeof userData.lastName).toBe('string');
      expect(typeof userData.email).toBe('string');
      expect(typeof userData.password).toBe('string');
    });

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com'
      ];

      validEmails.forEach(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate password strength', () => {
      const strongPassword = 'Password123!';
      const weakPassword = '123';

      // Basic password strength validation
      const isStrong = strongPassword.length >= 8 && 
                      /[A-Z]/.test(strongPassword) && 
                      /[a-z]/.test(strongPassword) && 
                      /[0-9]/.test(strongPassword);
      
      const isWeak = weakPassword.length < 8;

      expect(isStrong).toBe(true);
      expect(isWeak).toBe(true);
    });
  });

  describe('Profile Data Validation', () => {
    it('should validate profile data structure', () => {
      const profileData = {
        bio: 'This is a test bio',
        gender: 'M',
        genderPreference: 'F',
        relationshipType: 'S'
      };

      expect(profileData).toHaveProperty('bio');
      expect(profileData).toHaveProperty('gender');
      expect(profileData).toHaveProperty('genderPreference');
      expect(profileData).toHaveProperty('relationshipType');
    });

    it('should validate gender values', () => {
      const validGenders = ['M', 'F', 'O'];
      const invalidGender = 'X';

      expect(validGenders).toContain('M');
      expect(validGenders).toContain('F');
      expect(validGenders).toContain('O');
      expect(validGenders).not.toContain(invalidGender);
    });

    it('should validate gender preference values', () => {
      const validPreferences = ['M', 'W', 'B'];
      const invalidPreference = 'X';

      expect(validPreferences).toContain('M');
      expect(validPreferences).toContain('W');
      expect(validPreferences).toContain('B');
      expect(validPreferences).not.toContain(invalidPreference);
    });

    it('should validate relationship type values', () => {
      const validTypes = ['C', 'S', 'F'];
      const invalidType = 'X';

      expect(validTypes).toContain('C');
      expect(validTypes).toContain('S');
      expect(validTypes).toContain('F');
      expect(validTypes).not.toContain(invalidType);
    });
  });

  describe('authController.register', () => {
    it('should register a new user and send verification email', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);
      mockUserProfileModel.create.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);
      mockEmailService.generateVerificationCode.mockReturnValue('123456');

      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        },
      };
      
      await authController.register(req, mockRes);
      
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockUserProfileModel.create).toHaveBeenCalledWith({
        userId: 1,
        genderPreference: 'B',
        relationshipType: 'C,S,F,B',
      });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', 'Test', '123456');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        user: expect.objectContaining({ email: 'test@example.com' }),
        emailSent: true,
      }));
    });

    it('should return 400 if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      
      const req = { body: { email: 'test@example.com' } };
      await authController.register(req, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        code: 'EMAIL_ALREADY_EXISTS',
      }));
    });
  });

  describe('authController.resendVerification', () => {
    it('should resend verification email if user exists and is not verified', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);
      mockEmailService.generateVerificationCode.mockReturnValue('123456');
      
      const req = { body: { email: 'test@example.com' } };
      await authController.resendVerification(req, mockRes);
      
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', 'Test', '123456');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        emailSent: true,
      }));
    });

    it('should return 404 if user does not exist', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      
      const req = { body: { email: 'notfound@example.com' } };
      await authController.resendVerification(req, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        code: 'USER_NOT_FOUND',
      }));
    });

    it('should return 400 if email is already verified', async () => {
      mockUserModel.findOne.mockResolvedValue({ ...mockUser, emailVerified: true });
      
      const req = { body: { email: 'verified@example.com' } };
      await authController.resendVerification(req, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        code: 'EMAIL_ALREADY_VERIFIED',
      }));
    });
  });

  describe('authController.verifyEmail', () => {
    it('should verify email with valid code', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      
      const req = { body: { code: '123456' } };
      await authController.verifyEmail(req, mockRes);
      
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: {
          emailVerificationToken: '123456',
          emailVerified: false,
        },
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.any(String),
        token: expect.any(String),
        user: expect.objectContaining({ email: 'test@example.com', emailVerified: true }),
      }));
    });

    it('should return 400 if code is missing', async () => {
      const req = { body: {} };
      await authController.verifyEmail(req, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        code: 'MISSING_CODE',
      }));
    });

    it('should return 400 if code is invalid', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      
      const req = { body: { code: 'badcode' } };
      await authController.verifyEmail(req, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        code: 'INVALID_CODE',
      }));
    });

    it('should return 400 if code is expired', async () => {
      mockUserModel.findOne.mockResolvedValue({ ...mockUser, emailVerificationExpiry: new Date(Date.now() - 1000) });
      
      const req = { body: { code: 'expired' } };
      await authController.verifyEmail(req, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        code: 'EXPIRED_CODE',
      }));
    });
  });

  describe('DELETE /api/auth/delete-account', () => {
    it('should delete user account and all related data', async () => {
      // First, create a user and get their token
      const userData = {
        email: 'delete-test@example.com',
        password: 'password123',
        firstName: 'Delete',
        lastName: 'Test'
      };

      // Register the user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);

      // Verify the email first
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({ code: '123456' }); // Mock verification code

      expect(verifyResponse.status).toBe(200);

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      // Delete the account
      const deleteResponse = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', `Bearer ${token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Account deleted successfully');
      expect(deleteResponse.body.code).toBe('ACCOUNT_DELETED');

      // Verify the user is actually deleted by trying to login again
      const loginAfterDeleteResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(loginAfterDeleteResponse.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/auth/delete-account');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent user', async () => {
      // Create a token for a non-existent user ID
      const token = jwt.sign({ id: 99999 }, process.env.JWT_SECRET || 'your_jwt_secret');
      
      const response = await request(app)
        .delete('/api/auth/delete-account')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});