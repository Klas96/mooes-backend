const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PopularKeywords = sequelize.define('PopularKeywords', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    keyword: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [1, 100],
          msg: 'Keyword must be between 1 and 100 characters'
        }
      }
    },
    category: {
      type: DataTypes.ENUM('hobby', 'interest', 'lifestyle', 'personality', 'activity', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Usage count cannot be negative'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['keyword']
      },
      {
        fields: ['category']
      },
      {
        fields: ['usageCount']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  // Instance method to increment usage count
  PopularKeywords.prototype.incrementUsage = function() {
    this.usageCount += 1;
    return this.save();
  };

  // Static method to find or create keyword
  PopularKeywords.findOrCreateKeyword = async function(keyword, category = 'other') {
    const [instance, created] = await this.findOrCreate({
      where: { keyword: keyword.toLowerCase().trim() },
      defaults: {
        keyword: keyword.toLowerCase().trim(),
        category: category,
        usageCount: 1
      }
    });

    if (!created) {
      await instance.incrementUsage();
    }

    return instance;
  };

  // Static method to get suggestions
  PopularKeywords.getSuggestions = async function(query, category = null, limit = 10) {
    const { Op } = require('sequelize');
    
    let whereClause = {
      isActive: true
    };

    if (query) {
      whereClause.keyword = { [Op.iLike]: `%${query}%` };
    }

    if (category) {
      whereClause.category = category;
    }

    return await this.findAll({
      where: whereClause,
      order: [['usageCount', 'DESC'], ['keyword', 'ASC']],
      limit: limit
    });
  };

  // Static method to get popular keywords by category
  PopularKeywords.getPopularByCategory = async function(category = null, limit = 20) {
    const { Op } = require('sequelize');
    
    let whereClause = {
      isActive: true,
      usageCount: { [Op.gt]: 0 }
    };

    if (category) {
      whereClause.category = category;
    }

    return await this.findAll({
      where: whereClause,
      order: [['usageCount', 'DESC'], ['keyword', 'ASC']],
      limit: limit
    });
  };

  // Define associations
  PopularKeywords.associate = function(models) {
    // PopularKeywords doesn't have direct associations with other models
    // It's a standalone table for keyword suggestions
  };

  return PopularKeywords;
}; 