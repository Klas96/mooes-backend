// Coupon Queries
// Read operations for coupons

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get coupon by ID
 */
export const getById = query({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.id);
    if (!coupon) return null;
    
    // Optionally include related data
    const store = await ctx.db.get(coupon.storeId);
    const user = coupon.userId ? await ctx.db.get(coupon.userId) : null;
    const goal = coupon.goalId ? await ctx.db.get(coupon.goalId) : null;
    
    return { ...coupon, store, user, goal };
  },
});

/**
 * Get coupon by code
 */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupons")
      .withIndex("code", (q) => q.eq("code", args.code))
      .first();
  },
});

/**
 * Get all coupons for a user
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const coupons = await ctx.db
      .query("coupons")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Include store and goal data
    const couponsWithData = await Promise.all(
      coupons.map(async (c) => {
        const store = await ctx.db.get(c.storeId);
        const goal = c.goalId ? await ctx.db.get(c.goalId) : null;
        return { ...c, store, goal };
      })
    );
    
    return couponsWithData;
  },
});

/**
 * Get unused coupons for a user
 */
export const getUnusedByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allCoupons = await ctx.db
      .query("coupons")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    const unused = allCoupons.filter(c => !c.isUsed);
    
    // Include store and goal data
    const unusedWithData = await Promise.all(
      unused.map(async (c) => {
        const store = await ctx.db.get(c.storeId);
        const goal = c.goalId ? await ctx.db.get(c.goalId) : null;
        return { ...c, store, goal };
      })
    );
    
    return unusedWithData;
  },
});

/**
 * Get all coupons for a store
 */
export const getByStoreId = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupons")
      .withIndex("storeId", (q) => q.eq("storeId", args.storeId))
      .collect();
  },
});

/**
 * Get coupons for a goal
 */
export const getByGoalId = query({
  args: { goalId: v.id("storeGoals") },
  handler: async (ctx, args) => {
    const coupons = await ctx.db
      .query("coupons")
      .withIndex("goalId", (q) => q.eq("goalId", args.goalId))
      .collect();
    
    // Include store and user data
    const couponsWithData = await Promise.all(
      coupons.map(async (c) => {
        const store = await ctx.db.get(c.storeId);
        const user = c.userId ? await ctx.db.get(c.userId) : null;
        return { ...c, store, user };
      })
    );
    
    return couponsWithData;
  },
});

