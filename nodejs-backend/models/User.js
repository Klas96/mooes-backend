const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please enter a valid email'
        },
        notEmpty: {
          msg: 'Email is required'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [6],
          msg: 'Password must be at least 6 characters long'
        }
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'First name is required'
        }
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Last name is required'
        }
      }
    },
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isPremium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    premiumExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    premiumPlan: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    // Email verification fields
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerificationExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Password reset fields
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    aiMessageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lastAiMessageDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Billing and subscription fields
    lastPurchaseToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Google Play purchase token or App Store receipt data'
    },
    lastPurchaseDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last successful purchase'
    },
    platform: {
      type: DataTypes.ENUM('android', 'ios', 'bitcoin'),
      allowNull: true,
      comment: 'Platform where subscription was purchased'
    },
    pendingBitcoinPayment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string containing pending Bitcoin payment information'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'expired', 'canceled', 'pending', 'grace_period'),
      defaultValue: 'active',
      allowNull: false
    },
    gracePeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End date of grace period after subscription expires'
    },
    autoRenewalEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether auto-renewal is enabled for the subscription'
    },
    cancellationReason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reason for subscription cancellation'
    },
    refundRequested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether user has requested a refund'
    },
    refundDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when refund was processed'
    },
    // Daily likes tracking fields
    dailyLikesUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Number of likes used today'
    },
    lastLikeResetDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when likes were last reset (for daily reset logic)'
    },
    // Notification preferences
    notificationPreferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        weeklyMatches: true,
        newMatches: true,
        newMessages: true,
        profileViews: false,
        promotions: false
      },
      comment: 'User notification preferences'
    }
  }, {
    timestamps: true,
    hooks: {
      beforeSave: async (user) => {
        // Only hash password if it's provided and changed
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Instance method to compare password
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Instance method to get full name
  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  // Instance method to get public profile (without password)
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    values.fullName = this.getFullName();
    return values;
  };

  // Define associations
  User.associate = (models) => {
    User.hasOne(models.UserProfile, {
      foreignKey: 'userId',
      as: 'profile'
    });
    User.hasMany(models.Image, {
      foreignKey: 'userId',
      as: 'images'
    });
  };

  return User;
}; 