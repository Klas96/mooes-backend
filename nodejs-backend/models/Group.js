const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Group = sequelize.define('Group', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Group name is required'
        },
        len: {
          args: [1, 100],
          msg: 'Group name must be between 1 and 100 characters'
        }
      }
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UserProfiles',
        key: 'id'
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['createdById']
      }
    ]
  });

  Group.associate = (models) => {
    Group.belongsTo(models.UserProfile, {
      foreignKey: 'createdById',
      as: 'creator'
    });
    Group.hasMany(models.GroupMember, {
      foreignKey: 'groupId',
      as: 'members',
      onDelete: 'CASCADE'
    });
    Group.hasMany(models.GroupMessage, {
      foreignKey: 'groupId',
      as: 'messages',
      onDelete: 'CASCADE'
    });
  };

  return Group;
};

