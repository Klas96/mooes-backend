const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Match = sequelize.define('Match', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user1Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UserProfiles',
        key: 'id'
      }
    },
    user2Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UserProfiles',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'liked', 'disliked', 'matched', 'unmatched'),
      defaultValue: 'pending'
    },
    user1Liked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    user2Liked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    matchedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user1Id', 'user2Id']
      }
    ]
  });

  // Instance method to check if it's a mutual match
  Match.prototype.isMatched = function() {
    return this.status === 'matched';
  };

  // Instance method to check if users are matched
  Match.prototype.isUsersMatched = function() {
    return this.status === 'matched';
  };

  // Static method to find match between two users
  Match.findMatch = function(user1Id, user2Id) {
    return this.findOne({
      where: {
        [sequelize.Op.or]: [
          { user1Id: user1Id, user2Id: user2Id },
          { user1Id: user2Id, user2Id: user1Id }
        ]
      }
    });
  };

  // Static method to create or update match
  Match.createOrUpdateMatch = function(user1Id, user2Id, status) {
    return this.findOne({
      where: {
        [sequelize.Op.or]: [
          { user1Id: user1Id, user2Id: user2Id },
          { user1Id: user2Id, user2Id: user1Id }
        ]
      }
    }).then(existingMatch => {
      if (existingMatch) {
        // Determine which user is which for the update
        const isUser1First = existingMatch.user1Id === user1Id;
        const updateData = {
          user1Id: user1Id,
          user2Id: user2Id,
          status: status,
          ...(status === 'matched' && { matchedAt: new Date() })
        };
        
        // Update like flags based on status
        if (status === 'liked') {
          if (isUser1First) {
            updateData.user1Liked = true;
          } else {
            updateData.user2Liked = true;
          }
        } else if (status === 'disliked') {
          if (isUser1First) {
            updateData.user1Liked = false;
          } else {
            updateData.user2Liked = false;
          }
        }
        
        return existingMatch.update(updateData);
      } else {
        const createData = {
          user1Id: user1Id,
          user2Id: user2Id,
          status: status,
          user1Liked: false,
          user2Liked: false,
          ...(status === 'matched' && { matchedAt: new Date() })
        };
        
        // Set like flags based on status
        if (status === 'liked') {
          createData.user1Liked = true;
        }
        
        return this.create(createData);
      }
    });
  };

  // Define associations
  Match.associate = (models) => {
    Match.belongsTo(models.UserProfile, {
      foreignKey: 'user1Id',
      as: 'user1'
    });
    Match.belongsTo(models.UserProfile, {
      foreignKey: 'user2Id',
      as: 'user2'
    });
    Match.hasMany(models.Message, {
      foreignKey: 'matchId',
      as: 'messages'
    });
  };

  return Match;
}; 