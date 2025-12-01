const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserProfile = sequelize.define('UserProfile', {
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
      }
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Bio cannot exceed 500 characters'
        }
      }
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('M', 'F', 'O'),
      allowNull: true
    },
    genderPreference: {
      type: DataTypes.ENUM('M', 'W', 'B'),
      defaultValue: 'B'
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Location cannot exceed 100 characters'
        }
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    keyWords: {
      type: DataTypes.TEXT,
      defaultValue: '[]',
      get() {
        const rawValue = this.getDataValue('keyWords');
        try {
          return JSON.parse(rawValue || '[]');
        } catch (e) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('keyWords', JSON.stringify(value || []));
      }
    },
    locationMode: {
      type: DataTypes.ENUM('local', 'global'),
      defaultValue: 'global',
      allowNull: false
    },
    isHidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['gender']
      },
      {
        fields: ['genderPreference']
      },
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['isHidden']
      }
    ]
  });

  // Instance method to calculate age
  UserProfile.prototype.getAge = function() {
    if (!this.birthDate) return null;
    const today = new Date();
    const birthDate = new Date(this.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Instance method to get public profile
  UserProfile.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values.age = this.getAge();
    return values;
  };

  // Define associations
  UserProfile.associate = (models) => {
    UserProfile.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    UserProfile.hasMany(models.Image, {
      foreignKey: 'userId',
      as: 'images'
    });
  };

  return UserProfile;
}; 