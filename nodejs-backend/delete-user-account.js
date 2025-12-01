const { Sequelize, DataTypes } = require('sequelize');

// Database configuration - requires DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file or environment.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
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
const User = sequelize.define('User', {
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
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING
  },
  emailVerificationExpiry: {
    type: DataTypes.DATE
  },
  resetPasswordToken: {
    type: DataTypes.STRING
  },
  resetPasswordExpiry: {
    type: DataTypes.DATE
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Users',
  timestamps: true
});

// Profile model
const Profile = sequelize.define('Profile', {
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
  },
  bio: {
    type: DataTypes.TEXT
  },
  birthDate: {
    type: DataTypes.DATE
  },
  gender: {
    type: DataTypes.STRING
  },
  genderPreference: {
    type: DataTypes.STRING
  },
  location: {
    type: DataTypes.STRING
  },
  locationMode: {
    type: DataTypes.STRING,
    defaultValue: 'local'
  },
  relationshipType: {
    type: DataTypes.STRING
  },
  keyWords: {
    type: DataTypes.JSON
  },
  profilePicture: {
    type: DataTypes.STRING
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Profiles',
  timestamps: true
});

// Image model
const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  profileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Profiles',
      key: 'id'
    }
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Images',
  timestamps: true
});

// Match model
const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  profile1Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Profiles',
      key: 'id'
    }
  },
  profile2Id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Profiles',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Matches',
  timestamps: true
});

// Message model
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Matches',
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Profiles',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Messages',
  timestamps: true
});

// Conversation model for AI chat
const Conversation = sequelize.define('Conversation', {
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
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isUser: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Conversations',
  timestamps: false
});

// Set up associations
User.hasOne(Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'userId' });

Profile.hasMany(Image, { foreignKey: 'profileId', onDelete: 'CASCADE' });
Image.belongsTo(Profile, { foreignKey: 'profileId' });

Profile.hasMany(Match, { as: 'Profile1Matches', foreignKey: 'profile1Id', onDelete: 'CASCADE' });
Profile.hasMany(Match, { as: 'Profile2Matches', foreignKey: 'profile2Id', onDelete: 'CASCADE' });
Match.belongsTo(Profile, { as: 'Profile1', foreignKey: 'profile1Id' });
Match.belongsTo(Profile, { as: 'Profile2', foreignKey: 'profile2Id' });

Match.hasMany(Message, { foreignKey: 'matchId', onDelete: 'CASCADE' });
Message.belongsTo(Match, { foreignKey: 'matchId' });

Profile.hasMany(Message, { as: 'SentMessages', foreignKey: 'senderId', onDelete: 'CASCADE' });
Message.belongsTo(Profile, { as: 'Sender', foreignKey: 'senderId' });

User.hasMany(Conversation, { foreignKey: 'userId', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

async function deleteUserAccount(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find the user
    const user = await User.findOne({
      where: { email: email },
      include: [
        {
          model: Profile,
          include: [
            { model: Image },
            { model: Match, as: 'Profile1Matches' },
            { model: Match, as: 'Profile2Matches' }
          ]
        },
        { model: Conversation }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`📊 User data to be deleted:`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Profile ID: ${user.Profile?.id || 'None'}`);
    console.log(`   - Images: ${user.Profile?.Images?.length || 0}`);
    console.log(`   - Matches as Profile1: ${user.Profile?.Profile1Matches?.length || 0}`);
    console.log(`   - Matches as Profile2: ${user.Profile?.Profile2Matches?.length || 0}`);
    console.log(`   - Conversations: ${user.Conversations?.length || 0}`);

    // Delete the user (this will cascade delete all related data)
    await user.destroy();
    
    console.log('✅ User account and all related data deleted successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error deleting user account:', error);
    return false;
  }
}

// Main execution
async function main() {
  const email = 'mooves@klasholmgren.se';
  
  try {
    console.log('🚀 Starting user account deletion...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Delete the user account
    const success = await deleteUserAccount(email);
    
    if (success) {
      console.log('🎉 User account deletion completed successfully!');
    } else {
      console.log('❌ User account deletion failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
main(); 