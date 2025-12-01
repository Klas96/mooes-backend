const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserGoalProgress = sequelize.define('UserGoalProgress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'StoreGoals',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    currentDistanceMeters: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Current distance progress in meters'
    },
    currentDurationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Current duration progress in minutes'
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the user has completed this goal'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the user completed the goal'
    },
    couponActivated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the coupon has been activated'
    },
    couponActivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the coupon was activated'
    }
  }, {
    tableName: 'UserGoalProgress',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['goalId']
      },
      {
        fields: ['userId', 'goalId'],
        unique: true,
        name: 'unique_user_goal'
      },
      {
        fields: ['isCompleted']
      }
    ]
  });

  UserGoalProgress.associate = (models) => {
    UserGoalProgress.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserGoalProgress.belongsTo(models.StoreGoal, {
      foreignKey: 'goalId',
      as: 'goal'
    });
  };

  return UserGoalProgress;
};

