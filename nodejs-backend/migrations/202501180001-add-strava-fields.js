'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add Strava fields to Users table
    await queryInterface.addColumn('Users', 'stravaAccessToken', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth access token for Strava API'
    });

    await queryInterface.addColumn('Users', 'stravaRefreshToken', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth refresh token for Strava API'
    });

    await queryInterface.addColumn('Users', 'stravaTokenExpiry', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Expiry date of Strava access token'
    });

    await queryInterface.addColumn('Users', 'stravaConnected', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether user has connected Strava'
    });

    await queryInterface.addColumn('Users', 'stravaAthleteId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Strava athlete ID'
    });

    await queryInterface.addColumn('Users', 'lastStravaSync', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last time Strava data was synced'
    });

    // Add Strava activity ID to TrainingSessions
    await queryInterface.addColumn('TrainingSessions', 'stravaActivityId', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Strava activity ID if synced from Strava'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'stravaAccessToken');
    await queryInterface.removeColumn('Users', 'stravaRefreshToken');
    await queryInterface.removeColumn('Users', 'stravaTokenExpiry');
    await queryInterface.removeColumn('Users', 'stravaConnected');
    await queryInterface.removeColumn('Users', 'stravaAthleteId');
    await queryInterface.removeColumn('Users', 'lastStravaSync');
    await queryInterface.removeColumn('TrainingSessions', 'stravaActivityId');
  }
};

