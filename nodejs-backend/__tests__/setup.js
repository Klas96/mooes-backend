require('dotenv').config();
process.env.NODE_ENV = 'test';

// Safety check: Prevent running tests on production database
if (process.env.DATABASE_URL &&
    /google|gcloud|prod|production|mooves|fresh-oath/i.test(process.env.DATABASE_URL)) {
  throw new Error('❌ Refusing to run tests on a production or cloud database! Please use a local test database.');
}

// Mock external services before importing the app
jest.mock('../services/openaiService', () => ({
  getOpenAIResponse: jest.fn().mockResolvedValue('This is a mock AI response for testing purposes.'),
  getOpenAIClient: jest.fn().mockReturnValue({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }]
        })
      }
    }
  })
}));

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  generateVerificationToken: jest.fn().mockReturnValue('mockVerificationToken'),
  generateVerificationCode: jest.fn().mockReturnValue('123456'),
}));

// Mock nodemailer to prevent real email connections
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
    verify: jest.fn().mockResolvedValue(true)
  })
}));

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    androidpublisher: jest.fn(() => ({
      purchases: {
        subscriptions: {
          get: jest.fn().mockResolvedValue({
            data: {
              purchaseState: 0,
              expiryTimeMillis: Date.now() + (30 * 24 * 60 * 60 * 1000)
            }
          })
        },
      },
    })),
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({}),
        authorize: jest.fn().mockResolvedValue({})
      }))
    },
  },
}));

const app = require('../server');
const { sequelize } = require('../models');
const setupWebSocket = require('../websocket/socket');

let server;

// Global test setup
beforeAll(async () => {
  if (!sequelize) throw new Error('Sequelize instance is undefined! Check DATABASE_URL and test env setup.');
  await sequelize.sync({ force: true });

  if (!app || typeof app.listen !== 'function') throw new Error('App is not a valid Express app!');
  server = app.listen(0, () => {
    console.log('Test server started on random port');
  });

  const io = setupWebSocket(server);
  app.use((req, res, next) => {
    req.io = io;
    next();
  });
});

// Global test teardown
afterAll(async () => {
  if (server && typeof server.close === 'function') {
    await new Promise((resolve) => server.close(resolve));
  }
  if (sequelize && typeof sequelize.close === 'function') {
    await sequelize.close();
  }
});

module.exports = { app }; 