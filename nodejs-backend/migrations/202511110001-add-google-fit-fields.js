'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add Google Fit fields to Users table
    await queryInterface.addColumn('Users', 'googleFitAccessToken', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth access token for Google Fit API'
    });

    await queryInterface.addColumn('Users', 'googleFitRefreshToken', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth refresh token for Google Fit API'
    });

    await queryInterface.addColumn('Users', 'googleFitTokenExpiry', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expiry date of Google Fit access token'
    });

    await queryInterface.addColumn('Users', 'googleFitConnected', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether user has connected Google Fit'
    });

    await queryInterface.addColumn('Users', 'lastGoogleFitSync', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last time Google Fit data was synced'
    });

    // Add goal fields to UserProfile table
    await queryInterface.addColumn('UserProfiles', 'runningGoalDistanceKm', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Daily/weekly running goal in kilometers'
    });

    await queryInterface.addColumn('UserProfiles', 'runningGoalDurationMinutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Daily/weekly running goal in minutes'
    });

    // Create ENUM type if it doesn't exist
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_UserProfiles_goalPeriod" AS ENUM('daily', 'weekly', 'monthly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.addColumn('UserProfiles', 'goalPeriod', {
      type: Sequelize.DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: true,
      defaultValue: 'daily',
      comment: 'Period for goal tracking (daily, weekly, monthly)'
    });

    // Add Google Fit activity ID to TrainingSessions
    await queryInterface.addColumn('TrainingSessions', 'googleFitActivityId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Google Fit activity ID if synced from Google Fit'
    });

    await queryInterface.addColumn('TrainingSessions', 'distanceKm', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Distance in kilometers (from Google Fit)'
    });

    await queryInterface.addColumn('TrainingSessions', 'averagePace', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Average pace in minutes per kilometer'
    });

    await queryInterface.addColumn('TrainingSessions', 'caloriesBurned', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Calories burned during the session'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'googleFitAccessToken');
    await queryInterface.removeColumn('Users', 'googleFitRefreshToken');
    await queryInterface.removeColumn('Users', 'googleFitTokenExpiry');
    await queryInterface.removeColumn('Users', 'googleFitConnected');
    await queryInterface.removeColumn('Users', 'lastGoogleFitSync');
    await queryInterface.removeColumn('UserProfiles', 'runningGoalDistanceKm');
    await queryInterface.removeColumn('UserProfiles', 'runningGoalDurationMinutes');
    await queryInterface.removeColumn('UserProfiles', 'goalPeriod');
    await queryInterface.removeColumn('TrainingSessions', 'googleFitActivityId');
    await queryInterface.removeColumn('TrainingSessions', 'distanceKm');
    await queryInterface.removeColumn('TrainingSessions', 'averagePace');
    await queryInterface.removeColumn('TrainingSessions', 'caloriesBurned');
  }
};

