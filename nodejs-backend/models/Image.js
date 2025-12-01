const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    googleStorageDestination: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Google Cloud Storage destination path for image management'
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['isPrimary']
      },
      {
        fields: ['googleStorageDestination']
      }
    ]
  });

  // Define associations
  Image.associate = (models) => {
    Image.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Image;
}; 