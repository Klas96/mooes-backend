#!/usr/bin/env node
/**
 * Script to create Stores, StoreGoals, and related tables
 * This creates the tables needed for the company portal
 */

const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

// Load .env-config.yaml
try {
  let configPath = path.resolve(__dirname, '.env-config.yaml');
  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(__dirname, '../.env-config.yaml');
  }
  if (!fs.existsSync(configPath)) {
    configPath = path.resolve(__dirname, '../../.env-config.yaml');
  }
  if (fs.existsSync(configPath)) {
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    if (config.database && config.database.url) {
      process.env.DATABASE_URL = config.database.url;
    }
  }
} catch (error) {
  console.log('⚠️ Could not load .env-config.yaml:', error.message);
}

require('dotenv').config();

const { sequelize } = require('../models');
const { DataTypes, QueryTypes } = require('sequelize');

async function createTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const queryInterface = sequelize.getQueryInterface();

    // Check if Stores table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Stores'",
      { type: QueryTypes.SELECT }
    );

    if (tables.length > 0) {
      console.log('⚠️  Stores table already exists');
    } else {
      console.log('📦 Creating Stores table...');
      
      await queryInterface.createTable('Stores', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        storeName: {
          type: DataTypes.STRING(200),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        logo: {
          type: DataTypes.STRING,
          allowNull: true
        },
        location: {
          type: DataTypes.STRING(200),
          allowNull: true
        },
        latitude: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: true
        },
        longitude: {
          type: DataTypes.DECIMAL(11, 8),
          allowNull: true
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      await queryInterface.addIndex('Stores', ['userId'], { unique: true });
      await queryInterface.addIndex('Stores', ['isActive']);
      
      console.log('✅ Stores table created');
    }

    // Check if StoreGoals table exists
    const storeGoalsTables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StoreGoals'",
      { type: QueryTypes.SELECT }
    );

    if (storeGoalsTables.length > 0) {
      console.log('⚠️  StoreGoals table already exists');
    } else {
      console.log('📦 Creating StoreGoals table...');
      
      await queryInterface.createTable('StoreGoals', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        storeId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'Stores',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        targetDistanceMeters: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        targetDurationMinutes: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        startDate: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        endDate: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        maxParticipants: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        couponCode: {
          type: DataTypes.STRING(50),
          allowNull: false
        },
        couponDescription: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        couponDiscount: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true
        },
        couponDiscountAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      await queryInterface.addIndex('StoreGoals', ['storeId']);
      await queryInterface.addIndex('StoreGoals', ['isActive']);
      
      console.log('✅ StoreGoals table created');
    }

    console.log('');
    console.log('✅ All tables created successfully!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Some tables already exist - this is fine');
    } else {
      console.error('❌ Error creating tables:', error.message);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

createTables();

