const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    eventDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    eventTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null, // Duration in minutes
      comment: 'Event duration in minutes'
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null // null means unlimited
    },
    currentParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'upcoming',
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    tags: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const rawValue = this.getDataValue('tags');
        try {
          return JSON.parse(rawValue || '[]');
        } catch (e) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('tags', JSON.stringify(value || []));
      }
    }
  }, {
    timestamps: true,
    tableName: 'Events',
    indexes: [
      {
        fields: ['creatorId']
      },
      {
        fields: ['eventDate']
      },
      {
        fields: ['status']
      },
      {
        fields: ['latitude', 'longitude']
      }
    ]
  });

  Event.associate = (models) => {
    Event.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });
    Event.hasMany(models.EventParticipant, {
      foreignKey: 'eventId',
      as: 'participants'
    });
  };

  return Event;
};

