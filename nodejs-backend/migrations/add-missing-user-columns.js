'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add all missing columns to Users table
    await queryInterface.addColumn('Users', 'fcmToken', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'isPremium', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('Users', 'premiumExpiry', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'premiumPlan', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await queryInterface.addColumn('Users', 'lastLogin', {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    });

    await queryInterface.addColumn('Users', 'aiMessageCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('Users', 'lastAiMessageDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'lastPurchaseToken', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'lastPurchaseDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'platform', {
      type: Sequelize.ENUM('android', 'ios', 'bitcoin'),
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'pendingBitcoinPayment', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'subscriptionStatus', {
      type: Sequelize.ENUM('active', 'expired', 'canceled', 'pending', 'grace_period'),
      defaultValue: 'active',
      allowNull: false
    });

    await queryInterface.addColumn('Users', 'gracePeriodEnd', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'autoRenewalEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await queryInterface.addColumn('Users', 'cancellationReason', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'refundRequested', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn('Users', 'refundDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'dailyLikesUsed', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('Users', 'lastLikeResetDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all added columns (for rollback)
    const columns = [
      'fcmToken', 'isPremium', 'premiumExpiry', 'premiumPlan', 'isActive',
      'lastLogin', 'aiMessageCount', 'lastAiMessageDate', 'lastPurchaseToken',
      'lastPurchaseDate', 'platform', 'pendingBitcoinPayment', 'subscriptionStatus',
      'gracePeriodEnd', 'autoRenewalEnabled', 'cancellationReason', 'refundRequested',
      'refundDate', 'dailyLikesUsed', 'lastLikeResetDate'
    ];

    for (const column of columns) {
      await queryInterface.removeColumn('Users', column);
    }
  }
}; 