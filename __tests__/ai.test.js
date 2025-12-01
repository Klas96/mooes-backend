process.env.JWT_SECRET = 'test_secret_key_for_testing_only'; // Set JWT secret before any imports
const request = require('supertest');
const app = require('../server'); // Import only the app
const { User, UserProfile, sequelize } = require('../models');
const jwt = require('jsonwebtoken'); // Used to sign tokens for testing 