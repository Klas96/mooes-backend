'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('EventParticipants', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('EventParticipants', 'contactName', {
      type: Sequelize.STRING(150),
      allowNull: true
    });

    await queryInterface.addColumn('EventParticipants', 'contactEmail', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('EventParticipants', 'contactPhone', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('EventParticipants', 'contactName');
    await queryInterface.removeColumn('EventParticipants', 'contactEmail');
    await queryInterface.removeColumn('EventParticipants', 'contactPhone');

    await queryInterface.changeColumn('EventParticipants', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};



