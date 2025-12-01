const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventParticipant = sequelize.define('EventParticipant', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    contactName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        len: {
          args: [1, 150],
          msg: 'Contact name must be between 1 and 150 characters'
        }
      }
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address'
        }
      }
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('going', 'not_going', 'maybe'),
      defaultValue: 'going',
      allowNull: false
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'EventParticipants',
    validate: {
      hasIdentity() {
        const hasUser = !!this.userId;
        const hasContact =
          (this.contactName && this.contactName.trim().length > 0) ||
          (this.contactEmail && this.contactEmail.trim().length > 0) ||
          (this.contactPhone && this.contactPhone.trim().length > 0);

        if (!hasUser && !hasContact) {
          throw new Error('Participant must have a linked user or contact information.');
        }
      }
    },
    indexes: [
      {
        fields: ['eventId']
      },
      {
        fields: ['userId']
      },
      {
        unique: true,
        fields: ['eventId', 'userId']
      }
    ]
  });

  EventParticipant.associate = (models) => {
    EventParticipant.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });
    EventParticipant.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return EventParticipant;
};

