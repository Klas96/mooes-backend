const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Coupon = sequelize.define('Coupon', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'User who owns the coupon (null if not yet assigned)'
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'StoreGoals',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Optional reference to StoreGoal if coupon was earned from a challenge'
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Store',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Coupon code'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Coupon description'
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Discount percentage'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Fixed discount amount'
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the coupon has been used'
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the coupon was used'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the coupon expires'
    },
    qrCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'QR code data for the coupon'
    }
  }, {
    tableName: 'Coupons',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['goalId']
      },
      {
        fields: ['storeId']
      },
      {
        fields: ['code']
      },
      {
        fields: ['isUsed']
      }
    ]
  });

  Coupon.associate = (models) => {
    Coupon.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Coupon.belongsTo(models.StoreGoal, {
      foreignKey: 'goalId',
      as: 'goal',
      required: false
    });
    Coupon.belongsTo(models.Store, {
      foreignKey: 'storeId',
      as: 'store'
    });
  };

  return Coupon;
};

