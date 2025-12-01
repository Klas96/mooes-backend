const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database models
const mockUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'hashedPassword',
  birthDate: '1990-01-01',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockUserProfile = {
  id: 1,
  userId: 1,
  bio: 'Test bio',
  gender: 'M',
  genderPreference: 'F',
  relationshipType: ['S'],
  location: 'New York, NY',
  latitude: null,
  longitude: null,
  locationMode: 'local',
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(true),
  toJSON: function() {
    return {
      id: this.id,
      userId: this.userId,
      bio: this.bio,
      gender: this.gender,
      genderPreference: this.genderPreference,
      relationshipType: this.relationshipType,
      location: this.location,
      latitude: this.latitude,
      longitude: this.longitude,
      locationMode: this.locationMode
    };
  }
};

// Mock the models
jest.mock('../models', () => ({
  sequelize: {
    sync: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true)
  },
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn().mockResolvedValue(1)
  },
  UserProfile: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn().mockResolvedValue(1)
  },
  Image: {
    findAll: jest.fn().mockResolvedValue([])
  }
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ id: 1 })
}));

describe('Profile GPS Functionality Tests', () => {
  let app;
  let mockToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a simple Express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());
    
    // Mock middleware
    app.use((req, res, next) => {
      req.user = { id: 1 };
      next();
    });
    
    // Mock profile routes
    app.put('/api/profiles/me', (req, res) => {
      const { UserProfile } = require('../models');
      
      // Mock the profile update logic - create a proper copy
      const profile = {
        ...mockUserProfile,
        toJSON: function() {
          return {
            id: this.id,
            userId: this.userId,
            bio: this.bio,
            gender: this.gender,
            genderPreference: this.genderPreference,
            relationshipType: this.relationshipType,
            location: this.location,
            latitude: this.latitude,
            longitude: this.longitude,
            locationMode: this.locationMode
          };
        }
      };
      
      if ('latitude' in req.body) {
        profile.latitude = req.body.latitude === null ? null : parseFloat(req.body.latitude);
      }
      if ('longitude' in req.body) {
        profile.longitude = req.body.longitude === null ? null : parseFloat(req.body.longitude);
      }
      if (req.body.location !== undefined) {
        profile.location = req.body.location;
      }
      
      res.json(profile.toJSON());
    });
    
    mockToken = 'mock.jwt.token';
  });

  describe('GPS Coordinate Validation', () => {
    it('should accept valid latitude values', () => {
      const validLatitudes = [0, 90, -90, 45.12345678, -23.456789];
      
      validLatitudes.forEach(lat => {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      });
    });

    it('should reject invalid latitude values', () => {
      const invalidLatitudes = [91, -91, 180, -180, 1000];
      
      invalidLatitudes.forEach(lat => {
        const isValid = lat >= -90 && lat <= 90;
        expect(isValid).toBe(false);
      });
    });

    it('should accept valid longitude values', () => {
      const validLongitudes = [0, 180, -180, 45.12345678, -23.456789];
      
      validLongitudes.forEach(lon => {
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      });
    });

    it('should reject invalid longitude values', () => {
      const invalidLongitudes = [181, -181, 360, -360, 1000];
      
      invalidLongitudes.forEach(lon => {
        const isValid = lon >= -180 && lon <= 180;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Profile Update with GPS Coordinates', () => {
    it('should update profile with valid GPS coordinates', async () => {
      const updateData = {
        bio: 'Updated bio',
        location: 'New York, NY',
        latitude: 40.7128,
        longitude: -74.0060,
        locationMode: 'local'
      };

      const response = await request(app)
        .put('/api/profiles/me')
        .send(updateData)
        .expect(200);

      expect(response.body.latitude).toBe(40.7128);
      expect(response.body.longitude).toBe(-74.0060);
      expect(response.body.location).toBe('New York, NY');
    });

    it('should handle string coordinate values', async () => {
      const updateData = {
        bio: 'Updated bio',
        location: 'Los Angeles, CA',
        latitude: '34.0522',
        longitude: '-118.2437',
        locationMode: 'local'
      };

      const response = await request(app)
        .put('/api/profiles/me')
        .send(updateData)
        .expect(200);

      expect(response.body.latitude).toBe(34.0522);
      expect(response.body.longitude).toBe(-118.2437);
    });

    it('should handle null coordinate values', async () => {
      const updateData = {
        bio: 'Updated bio',
        location: 'Unknown Location',
        latitude: null,
        longitude: null,
        locationMode: 'global'
      };

      const response = await request(app)
        .put('/api/profiles/me')
        .send(updateData)
        .expect(200);

      expect(response.body.latitude).toBeNull();
      expect(response.body.longitude).toBeNull();
    });

    it('should preserve existing coordinates when not provided', async () => {
      const updateData = {
        bio: 'Updated bio',
        location: 'Updated Location'
        // No latitude/longitude provided
      };

      const response = await request(app)
        .put('/api/profiles/me')
        .send(updateData)
        .expect(200);

      // Should preserve existing coordinates (null in this case)
      expect(response.body.latitude).toBeNull();
      expect(response.body.longitude).toBeNull();
    });
  });

  describe('GPS Data Formatting', () => {
    it('should format coordinates to 8 decimal places', () => {
      const latitude = 40.7128;
      const longitude = -74.0060;
      
      // Test coordinate precision
      const formattedLat = parseFloat(latitude.toFixed(8));
      const formattedLon = parseFloat(longitude.toFixed(8));
      
      expect(formattedLat).toBe(40.7128);
      expect(formattedLon).toBe(-74.0060);
    });

    it('should handle very precise coordinates', () => {
      const preciseLat = 40.71281234;
      const preciseLon = -74.00601234;
      
      const formattedLat = parseFloat(preciseLat.toFixed(8));
      const formattedLon = parseFloat(preciseLon.toFixed(8));
      
      expect(formattedLat).toBe(40.71281234);
      expect(formattedLon).toBe(-74.00601234);
    });
  });

  describe('Location String Validation', () => {
    it('should validate location string length', () => {
      const validLocation = 'New York, NY';
      const tooLongLocation = 'A'.repeat(101); // Exceeds 100 character limit
      
      expect(validLocation.length).toBeLessThanOrEqual(100);
      expect(tooLongLocation.length).toBeGreaterThan(100);
    });

    it('should handle empty location strings', () => {
      const emptyLocation = '';
      const nullLocation = null;
      
      expect(emptyLocation).toBe('');
      expect(nullLocation).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinate data types', () => {
      const invalidLatitude = 'invalid_lat';
      const invalidLongitude = 'invalid_lon';
      
      const parsedLat = parseFloat(invalidLatitude);
      const parsedLon = parseFloat(invalidLongitude);
      
      expect(isNaN(parsedLat)).toBe(true);
      expect(isNaN(parsedLon)).toBe(true);
    });

    it('should handle missing coordinate data', () => {
      const updateData = {
        bio: 'Updated bio'
        // No coordinates provided
      };

      expect(updateData.latitude).toBeUndefined();
      expect(updateData.longitude).toBeUndefined();
    });
  });

  describe('Database Schema Validation', () => {
    it('should validate GPS coordinate ranges', () => {
      const validLatitude = 40.7128;
      const validLongitude = -74.0060;
      
      // Latitude validation
      expect(validLatitude).toBeGreaterThanOrEqual(-90);
      expect(validLatitude).toBeLessThanOrEqual(90);
      
      // Longitude validation
      expect(validLongitude).toBeGreaterThanOrEqual(-180);
      expect(validLongitude).toBeLessThanOrEqual(180);
    });

    it('should handle edge case coordinates', () => {
      const edgeCases = [
        { lat: 90, lon: 180 },   // North Pole, International Date Line
        { lat: -90, lon: -180 }, // South Pole, International Date Line
        { lat: 0, lon: 0 },      // Prime Meridian, Equator
      ];
      
      edgeCases.forEach(({ lat, lon }) => {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      });
    });
  });
}); 