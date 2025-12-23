'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add profilePicture column to Stores table
    await queryInterface.addColumn('Stores', 'profilePicture', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Store profile picture URL'
    });
    
    console.log('✅ Added profilePicture column to Stores table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove profilePicture column from Stores table
    await queryInterface.removeColumn('Stores', 'profilePicture');
    
    console.log('✅ Removed profilePicture column from Stores table');
  }
};

