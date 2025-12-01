#!/usr/bin/env node

// Load environment variables and set up database connection
require('dotenv').config();
const { connectionString } = require('./update-db-password');

const { Sequelize, DataTypes, Op } = require('sequelize');

// Set up database connection
const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// User model
const UserModel = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Users',
  timestamps: true
});

// Profile model
const UserProfileModel = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'UserProfiles',
  timestamps: true
});

// Match model
const MatchModel = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  user2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'Matches',
  timestamps: true
});

// Image model
const ImageModel = sequelize.define('Image', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'Images',
  timestamps: true
});

// Message model
const MessageModel = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'Messages',
  timestamps: true
});

const klasEmail = 'mooves@klasholmgren.se';

(async () => {
  try {
    console.log('🔍 Verifying user removal for:', klasEmail);
    
    // Check if user exists
    const user = await UserModel.findOne({ where: { email: klasEmail } });
    if (user) {
      console.log(`❌ User still exists: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    } else {
      console.log('✅ User successfully removed');
    }
    
    // Check for any remaining data with user ID 1 (klas was ID 1)
    const profile = await UserProfileModel.findOne({ where: { userId: 1 } });
    if (profile) {
      console.log('❌ Profile still exists for user ID 1');
    } else {
      console.log('✅ Profile removed');
    }
    
    const matches = await MatchModel.findAll({ 
      where: { [Op.or]: [{ user1Id: 1 }, { user2Id: 1 }] } 
    });
    if (matches.length > 0) {
      console.log(`❌ ${matches.length} matches still exist for user ID 1`);
    } else {
      console.log('✅ All matches removed');
    }
    
    const images = await ImageModel.findAll({ where: { userId: 1 } });
    if (images.length > 0) {
      console.log(`❌ ${images.length} images still exist for user ID 1`);
    } else {
      console.log('✅ All images removed');
    }
    
    const messages = await MessageModel.findAll({ where: { senderId: 1 } });
    if (messages.length > 0) {
      console.log(`❌ ${messages.length} messages still exist for user ID 1`);
    } else {
      console.log('✅ All messages removed');
    }
    
    // Show remaining users
    const allUsers = await UserModel.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName'],
      order: [['id', 'ASC']]
    });
    
    console.log('\n📋 Remaining users in database:');
    if (allUsers.length === 0) {
      console.log('No users found');
    } else {
      allUsers.forEach(user => {
        console.log(`- ID ${user.id}: ${user.firstName} ${user.lastName} (${user.email})`);
      });
    }
    
    await sequelize.close();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err);
    await sequelize.close();
    process.exit(1);
  }
})(); 