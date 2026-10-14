// Delete Test Stores Mutation
// Deletes all test stores and their related data

import { mutation } from "../_generated/server";

/**
 * Delete all test stores
 * Finds stores belonging to test users (emails with @example.com, @test.com, or containing "test")
 * or stores with "test" in their name, and deletes them along with related data.
 */
export const deleteTestStores = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Starting test stores deletion...");

    // Get all users to check for test users
    const allUsers = await ctx.db.query("users").collect();
    
    // Find test users by email patterns
    const testEmailPatterns = [
      /@example\.com$/i,
      /@test\.com$/i,
      /@test\.local$/i,
      /^test/i,
      /test/i,
    ];
    
    const testUsers = allUsers.filter((user) => {
      return testEmailPatterns.some((pattern) => pattern.test(user.email));
    });

    console.log(`📝 Found ${testUsers.length} test users`);

    // Get all stores
    const allStores = await ctx.db.query("stores").collect();
    
    // Find stores belonging to test users
    const testUserIds = new Set(testUsers.map((u) => u._id));
    const storesFromTestUsers = allStores.filter((store) =>
      testUserIds.has(store.userId)
    );

    // Find stores with "test" in their name (not already found)
    const foundStoreIds = new Set(storesFromTestUsers.map((s) => s._id));
    const storesWithTestName = allStores.filter(
      (store) =>
        !foundStoreIds.has(store._id) &&
        store.storeName.toLowerCase().includes("test")
    );

    // Combine all test stores
    const testStores = [...storesFromTestUsers, ...storesWithTestName];

    if (testStores.length === 0) {
      console.log("✅ No test stores found to delete");
      return {
        success: true,
        deletedStores: 0,
        deletedGoals: 0,
        deletedProgress: 0,
        deletedCoupons: 0,
      };
    }

    console.log(`📦 Found ${testStores.length} test stores to delete`);

    let deletedGoals = 0;
    let deletedProgress = 0;
    let deletedCoupons = 0;

    // Delete each test store and its related data
    for (const store of testStores) {
      const user = await ctx.db.get(store.userId);
      console.log(
        `  - Store: "${store.storeName}" (ID: ${store._id}) User: ${
          user ? user.email : "Unknown"
        }`
      );

      // Get all goals for this store
      const goals = await ctx.db
        .query("storeGoals")
        .withIndex("storeId", (q) => q.eq("storeId", store._id))
        .collect();

      console.log(`    Found ${goals.length} goals`);

      // Delete all user goal progress for these goals
      for (const goal of goals) {
        const progressRecords = await ctx.db
          .query("userGoalProgress")
          .withIndex("goalId", (q) => q.eq("goalId", goal._id))
          .collect();

        for (const progress of progressRecords) {
          await ctx.db.delete(progress._id);
          deletedProgress++;
        }

        // Delete the goal
        await ctx.db.delete(goal._id);
        deletedGoals++;
      }

      // Get all coupons for this store
      const coupons = await ctx.db
        .query("coupons")
        .withIndex("storeId", (q) => q.eq("storeId", store._id))
        .collect();

      console.log(`    Found ${coupons.length} coupons`);

      // Delete all coupons
      for (const coupon of coupons) {
        await ctx.db.delete(coupon._id);
        deletedCoupons++;
      }

      // Delete the store itself
      await ctx.db.delete(store._id);
    }

    console.log(`\n✅ Successfully deleted:`);
    console.log(`   - ${testStores.length} test stores`);
    console.log(`   - ${deletedGoals} store goals`);
    console.log(`   - ${deletedProgress} user goal progress records`);
    console.log(`   - ${deletedCoupons} coupons`);

    return {
      success: true,
      deletedStores: testStores.length,
      deletedGoals,
      deletedProgress,
      deletedCoupons,
    };
  },
});
