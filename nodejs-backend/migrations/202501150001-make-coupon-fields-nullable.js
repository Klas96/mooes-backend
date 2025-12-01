'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make userId nullable in Coupons table
    await queryInterface.changeColumn('Coupons', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Make goalId nullable in Coupons table
    await queryInterface.changeColumn('Coupons', 'goalId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'StoreGoals',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert userId to not nullable (but this might fail if there are null values)
    // In production, you'd want to handle existing null values first
    await queryInterface.changeColumn('Coupons', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Revert goalId to not nullable (but this might fail if there are null values)
    await queryInterface.changeColumn('Coupons', 'goalId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'StoreGoals',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });
  }
};

