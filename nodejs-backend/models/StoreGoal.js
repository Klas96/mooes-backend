const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StoreGoal = sequelize.define('StoreGoal', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Stores',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Goal title (e.g., "Run 100,000m")'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Goal description'
    },
    targetDistanceMeters: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Target distance in meters (e.g., 100000 for 100km)'
    },
    targetDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Target duration in minutes'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'When the goal challenge starts'
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'When the goal challenge ends (null = no end date)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the goal is currently active'
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of participants (null = unlimited)'
    },
    couponCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Coupon code to activate when goal is completed'
    },
    couponDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of the coupon/reward'
    },
    couponDiscount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Discount percentage (e.g., 20.00 for 20%)'
    },
    couponDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Fixed discount amount (e.g., 50.00)'
    }
  }, {
    tableName: 'StoreGoals',
    timestamps: true,
    indexes: [
      {
        fields: ['storeId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['startDate', 'endDate']
      }
    ]
  });

  StoreGoal.associate = (models) => {
    StoreGoal.belongsTo(models.Store, {
      foreignKey: 'storeId',
      as: 'store'
    });
    StoreGoal.hasMany(models.UserGoalProgress, {
      foreignKey: 'goalId',
      as: 'userProgress'
    });
  };

  return StoreGoal;
};

