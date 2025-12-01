const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupMessage = sequelize.define('GroupMessage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Groups',
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
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['groupId', 'createdAt']
      },
      {
        fields: ['senderId']
      }
    ]
  });

  GroupMessage.associate = (models) => {
    GroupMessage.belongsTo(models.Group, {
      foreignKey: 'groupId',
      as: 'group'
    });
    GroupMessage.belongsTo(models.UserProfile, {
      foreignKey: 'senderId',
      as: 'sender'
    });
  };

  return GroupMessage;
};

