#!/usr/bin/env node

/**
 * Delete Test Stores Script (Convex)
 * 
 * This script calls the Convex mutation to delete all test stores.
 * Requires CONVEX_URL environment variable to be set.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { ConvexHttpClient } = require("convex/browser");

async function deleteTestStores() {
  try {
    const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

    if (!convexUrl) {
      console.error('❌ CONVEX_URL not set. Please set it in your .env file.');
      console.error('   Format: CONVEX_URL=https://your-deployment.convex.cloud');
      process.exit(1);
    }

    console.log('🗑️  Deleting test stores from Convex database...\n');
    console.log(`📍 Convex URL: ${convexUrl}\n`);

    const client = new ConvexHttpClient(convexUrl);

    // Call the deleteTestStores mutation
    console.log('🔍 Finding and deleting test stores...\n');
    
    const result = await client.mutation('mutations/deleteTestStores:deleteTestStores', {});

    if (result.success) {
      console.log('\n✅ Successfully deleted test stores!');
      console.log(`   - ${result.deletedStores} stores`);
      console.log(`   - ${result.deletedGoals} store goals`);
      console.log(`   - ${result.deletedProgress} user goal progress records`);
      console.log(`   - ${result.deletedCoupons} coupons\n`);
    } else {
      console.error('❌ Failed to delete test stores');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error deleting test stores:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
deleteTestStores();
