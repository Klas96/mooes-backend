const { Sequelize } = require('sequelize');

// Initialize Sequelize with PostgreSQL or SQLite for tests
let sequelize = null;

// For tests, we need DATABASE_URL to be available
if (process.env.DATABASE_URL) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const isSQLite = process.env.DATABASE_URL.startsWith('sqlite:');
  
    const config = {
      dialect: isSQLite ? 'sqlite' : 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 2,  // Keep at least 2 connections alive to avoid connection acquisition delays
        acquire: 60000,  // Increased to 60 seconds for connection acquisition
        idle: 60000,  // Increased idle timeout to 60 seconds
        evict: 10000  // Check for idle connections every 10 seconds
      },
      // Enable automatic reconnection
      reconnect: true
    };

  // Add PostgreSQL-specific options only for PostgreSQL
  if (!isSQLite) {
    // Only use SSL for remote connections, not localhost
    const isLocalhost = process.env.DATABASE_URL && (
      process.env.DATABASE_URL.includes('localhost') || 
      process.env.DATABASE_URL.includes('127.0.0.1')
    );
    
    // Only enable SSL for remote connections (production VPS connecting to remote DB)
    if (isProduction && !isTest && !isLocalhost) {
      config.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      };
    } else {
      config.dialectOptions = {};
    }
  }

  // Add SQLite-specific options for SQLite
  if (isSQLite) {
    config.storage = ':memory:';
  }
  
  sequelize = new Sequelize(process.env.DATABASE_URL, config);
} else if (process.env.NODE_ENV !== 'test') {
  // Only warn if not in test environment
  console.warn('DATABASE_URL not found. Database connection will not be available.');
}

// Import models
let User, UserProfile, Image, Match, Message, PopularKeywords, Event, EventParticipant, Group, GroupMember, GroupMessage, GroupJoinRequest, Conversation, TrainingSession, Store, StoreGoal, UserGoalProgress, Coupon;

if (sequelize) {
  User = require('./User')(sequelize);
  UserProfile = require('./UserProfile')(sequelize);
  Image = require('./Image')(sequelize);
  Match = require('./Match')(sequelize);
  Message = require('./Message')(sequelize);
  PopularKeywords = require('./PopularKeywords')(sequelize);
  Event = require('./Event')(sequelize);
  EventParticipant = require('./EventParticipant')(sequelize);
  Group = require('./Group')(sequelize);
  GroupMember = require('./GroupMember')(sequelize);
  GroupMessage = require('./GroupMessage')(sequelize);
  GroupJoinRequest = require('./GroupJoinRequest')(sequelize);
  Conversation = require('./Conversation')(sequelize);
  TrainingSession = require('./TrainingSession')(sequelize);
  Store = require('./Store')(sequelize);
  StoreGoal = require('./StoreGoal')(sequelize);
  UserGoalProgress = require('./UserGoalProgress')(sequelize);
  Coupon = require('./Coupon')(sequelize);

  // Define associations
  const models = { User, UserProfile, Image, Match, Message, PopularKeywords, Event, EventParticipant, Group, GroupMember, GroupMessage, GroupJoinRequest, Conversation, TrainingSession, Store, StoreGoal, UserGoalProgress, Coupon };
  User.associate(models);
  UserProfile.associate(models);
  Image.associate(models);
  Match.associate(models);
  Message.associate(models);
  PopularKeywords.associate(models);
  Event.associate(models);
  EventParticipant.associate(models);
  Group.associate(models);
  GroupMember.associate(models);
  GroupMessage.associate(models);
  GroupJoinRequest.associate(models);
  Conversation.associate(models);
  TrainingSession.associate(models);
  Store.associate(models);
  StoreGoal.associate(models);
  UserGoalProgress.associate(models);
  Coupon.associate(models);
} else {
  // Provide mock models for environments without database
  User = {};
  UserProfile = {};
  Image = {};
  Match = {};
  Message = {};
  PopularKeywords = {};
  Event = {};
  EventParticipant = {};
  Group = {};
  GroupMember = {};
  GroupMessage = {};
  GroupJoinRequest = {};
  Conversation = {};
  TrainingSession = {};
  Store = {};
  StoreGoal = {};
  UserGoalProgress = {};
  Coupon = {};
}

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  UserProfile,
  Image,
  Match,
  Message,
  PopularKeywords,
  Event,
  EventParticipant,
  Group,
  GroupMember,
  GroupMessage,
  GroupJoinRequest,
  Conversation,
  TrainingSession,
  Store,
  StoreGoal,
  UserGoalProgress,
  Coupon
}; 