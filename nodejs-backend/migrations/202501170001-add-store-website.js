'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add website column to Stores table
    await queryInterface.addColumn('Stores', 'website', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Store website URL'
    });
    
    console.log('✅ Added website column to Stores table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove website column from Stores table
    await queryInterface.removeColumn('Stores', 'website');
    
    console.log('✅ Removed website column from Stores table');
  }
};

