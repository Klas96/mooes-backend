const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrainingSession = sequelize.define('TrainingSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(140),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 2000,
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    goalReached: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  }, {
    tableName: 'TrainingSessions',
    timestamps: true,
  });

  TrainingSession.associate = (models) => {
    TrainingSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return TrainingSession;
};

