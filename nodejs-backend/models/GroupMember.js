const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupMember = sequelize.define('GroupMember', {
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
    userProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UserProfiles',
        key: 'id'
      }
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['groupId', 'userProfileId'],
        unique: true
      },
      {
        fields: ['userProfileId']
      }
    ]
  });

  GroupMember.associate = (models) => {
    GroupMember.belongsTo(models.Group, {
      foreignKey: 'groupId',
      as: 'group'
    });
    GroupMember.belongsTo(models.UserProfile, {
      foreignKey: 'userProfileId',
      as: 'userProfile'
    });
  };

  return GroupMember;
};

