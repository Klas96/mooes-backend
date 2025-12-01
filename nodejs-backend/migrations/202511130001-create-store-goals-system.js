'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Stores table
    await queryInterface.createTable('Stores', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      storeName: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create StoreGoals table
    await queryInterface.createTable('StoreGoals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      storeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Stores',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      targetDistanceMeters: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      targetDurationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      maxParticipants: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      couponCode: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      couponDescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      couponDiscount: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      couponDiscountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create UserGoalProgress table
    await queryInterface.createTable('UserGoalProgress', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      goalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'StoreGoals',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      currentDistanceMeters: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      currentDurationMinutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      isCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      couponActivated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      couponActivatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Coupons table
    await queryInterface.createTable('Coupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      goalId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'StoreGoals',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      storeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Stores',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      discount: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      usedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      qrCode: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes
    await queryInterface.addIndex('Stores', ['userId'], { unique: true });
    await queryInterface.addIndex('Stores', ['isActive']);
    
    await queryInterface.addIndex('StoreGoals', ['storeId']);
    await queryInterface.addIndex('StoreGoals', ['isActive']);
    await queryInterface.addIndex('StoreGoals', ['startDate', 'endDate']);
    
    await queryInterface.addIndex('UserGoalProgress', ['userId']);
    await queryInterface.addIndex('UserGoalProgress', ['goalId']);
    await queryInterface.addIndex('UserGoalProgress', ['userId', 'goalId'], { unique: true, name: 'unique_user_goal' });
    await queryInterface.addIndex('UserGoalProgress', ['isCompleted']);
    
    await queryInterface.addIndex('Coupons', ['userId']);
    await queryInterface.addIndex('Coupons', ['goalId']);
    await queryInterface.addIndex('Coupons', ['storeId']);
    await queryInterface.addIndex('Coupons', ['code']);
    await queryInterface.addIndex('Coupons', ['isUsed']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Coupons');
    await queryInterface.dropTable('UserGoalProgress');
    await queryInterface.dropTable('StoreGoals');
    await queryInterface.dropTable('Stores');
  }
};

