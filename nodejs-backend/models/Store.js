const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Store = sequelize.define('Store', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Reference to User account for this store'
    },
    storeName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Name of the store'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Store description'
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Store logo URL'
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Store location/address'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the store account is active'
    }
  }, {
    tableName: 'Stores',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  Store.associate = (models) => {
    Store.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Store.hasMany(models.StoreGoal, {
      foreignKey: 'storeId',
      as: 'goals'
    });
  };

  return Store;
};

