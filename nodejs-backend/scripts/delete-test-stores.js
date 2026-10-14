#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { Op } = require('sequelize');

// Load .env-config.yaml from the root
const configPath = path.resolve(__dirname, '../../.env-config.yaml');
if (fs.existsSync(configPath)) {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

  // Set environment variables from YAML config
  if (config.database && config.database.url) {
    process.env.DATABASE_URL = config.database.url;
  }
  if (config.jwt && config.jwt.secret) {
    process.env.JWT_SECRET = config.jwt.secret;
  }
}

// Load .env file if it exists
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log('🗑️  Deleting test stores from database...\n');

// Import models after loading .env
const { User, Store, StoreGoal, UserGoalProgress, Coupon } = require('../models');

async function deleteTestStores() {
  try {
    // Test user email patterns
    const testEmailPatterns = [
      '%@example.com',
      '%@test.com',
      '%@test.local',
      'test%@%',
      '%test%@%'
    ];

    // Find all test users
    console.log('🔍 Finding test users...');
    const testUsers = await User.findAll({
      where: {
        email: {
          [Op.or]: testEmailPatterns.map(pattern => ({
            [Op.like]: pattern
          }))
        }
      },
      attributes: ['id', 'email']
    });

    if (testUsers.length === 0) {
      console.log('ℹ️  No test users found');
    } else {
      console.log(`📝 Found ${testUsers.length} test users`);
    }

    // Find stores belonging to test users
    const testUserIds = testUsers.map(user => user.id);
    let testStores = [];

    if (testUserIds.length > 0) {
      testStores = await Store.findAll({
        where: {
          userId: {
            [Op.in]: testUserIds
          }
        },
        include: [
          {
            model: StoreGoal,
            as: 'goals'
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email']
          }
        ]
      });
    }

    // Also find stores with "test" in their name
    console.log('🔍 Finding stores with "test" in name...');
    const storesWithTestName = await Store.findAll({
      where: {
        storeName: {
          [Op.iLike]: '%test%'
        },
        // Exclude stores we already found
        ...(testUserIds.length > 0 ? {
          userId: {
            [Op.notIn]: testUserIds
          }
        } : {})
      },
      include: [
        {
          model: StoreGoal,
          as: 'goals'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email']
        }
      ]
    });

    // Combine all test stores
    const allTestStores = [...testStores];
    const storeIds = new Set(testStores.map(s => s.id));
    
    for (const store of storesWithTestName) {
      if (!storeIds.has(store.id)) {
        allTestStores.push(store);
        storeIds.add(store.id);
      }
    }

    if (allTestStores.length === 0) {
      console.log('✅ No test stores found to delete');
      return;
    }

    console.log(`\n📦 Found ${allTestStores.length} test stores to delete:\n`);
    
    for (const store of allTestStores) {
      console.log(`  - Store: "${store.storeName}" (ID: ${store.id})`);
      console.log(`    User: ${store.user ? store.user.email : 'Unknown'} (ID: ${store.userId})`);
      console.log(`    Goals: ${store.goals ? store.goals.length : 0}`);
      console.log('');
    }

    // Count related data that will be deleted
    const storeIdsToDelete = allTestStores.map(s => s.id);
    
    const goalsCount = await StoreGoal.count({
      where: {
        storeId: {
          [Op.in]: storeIdsToDelete
        }
      }
    });

    // Get goal IDs for these stores to count progress
    const goalIds = await StoreGoal.findAll({
      where: {
        storeId: {
          [Op.in]: storeIdsToDelete
        }
      },
      attributes: ['id']
    }).then(goals => goals.map(g => g.id));

    const progressCount = goalIds.length > 0 ? await UserGoalProgress.count({
      where: {
        goalId: {
          [Op.in]: goalIds
        }
      }
    }) : 0;

    const couponsCount = await Coupon.count({
      where: {
        storeId: {
          [Op.in]: storeIdsToDelete
        }
      }
    });

    console.log('📊 Related data that will be deleted:');
    console.log(`  - Store Goals: ${goalsCount}`);
    console.log(`  - User Goal Progress: ${progressCount}`);
    console.log(`  - Coupons: ${couponsCount}\n`);

    // Delete the stores (CASCADE will handle related data)
    console.log('🗑️  Deleting test stores...');
    
    const deletedCount = await Store.destroy({
      where: {
        id: {
          [Op.in]: storeIdsToDelete
        }
      }
    });

    console.log(`\n✅ Successfully deleted ${deletedCount} test stores and their related data`);
    console.log(`   - ${goalsCount} store goals`);
    console.log(`   - ${progressCount} user goal progress records`);
    console.log(`   - ${couponsCount} coupons`);
    
  } catch (error) {
    console.error('❌ Error deleting test stores:', error);
    throw error;
  }
}

// Run the script
deleteTestStores()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
