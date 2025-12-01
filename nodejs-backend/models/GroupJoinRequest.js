const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupJoinRequest = sequelize.define('GroupJoinRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'groupId'
    },
    userProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'userProfileId'
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined'),
      defaultValue: 'pending',
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt'
    }
  }, {
    tableName: 'GroupJoinRequests',
    timestamps: true,
    indexes: [
      {
        fields: ['groupId', 'status']
      },
      {
        fields: ['userProfileId', 'status']
      },
      {
        unique: true,
        fields: ['groupId', 'userProfileId', 'status'],
        name: 'unique_group_user_pending'
      }
    ]
  });

  GroupJoinRequest.associate = (models) => {
    GroupJoinRequest.belongsTo(models.Group, {
      foreignKey: 'groupId',
      as: 'group'
    });
    
    GroupJoinRequest.belongsTo(models.UserProfile, {
      foreignKey: 'userProfileId',
      as: 'requester'
    });
  };

  return GroupJoinRequest;
};

