const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
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
        model: 'UserProfiles',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Message content is required'
        },
        len: {
          args: [1, 1000],
          msg: 'Message cannot exceed 1000 characters'
        }
      }
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['matchId', 'createdAt']
      },
      {
        fields: ['senderId']
      },
      {
        fields: ['isRead']
      }
    ]
  });

  // Instance method to mark message as read
  Message.prototype.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  };

  // Static method to get unread message count for a user
  Message.getUnreadCount = function(userId) {
    return this.count({
      where: {
        senderId: { [sequelize.Op.ne]: userId },
        isRead: false
      },
      include: [{
        model: sequelize.models.Match,
        where: {
          [sequelize.Op.or]: [
            { user1Id: userId },
            { user2Id: userId }
          ],
          status: 'matched'
        }
      }]
    });
  };

  // Static method to mark messages as read
  Message.markMessagesAsRead = function(matchId, userId) {
    return this.update(
      {
        isRead: true,
        readAt: new Date()
      },
      {
        where: {
          matchId: matchId,
          senderId: { [sequelize.Op.ne]: userId },
          isRead: false
        }
      }
    );
  };

  // Define associations
  Message.associate = (models) => {
    Message.belongsTo(models.Match, {
      foreignKey: 'matchId',
      as: 'match'
    });
    Message.belongsTo(models.UserProfile, {
      foreignKey: 'senderId',
      as: 'sender'
    });
  };

  return Message;
}; 