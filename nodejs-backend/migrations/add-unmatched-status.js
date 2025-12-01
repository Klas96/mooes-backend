'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'unmatched' to the status enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Matches_status" ADD VALUE 'unmatched';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This is a limitation - we can't easily rollback enum value removal
    console.log('Warning: Cannot remove enum value "unmatched" from status enum');
  }
}; 