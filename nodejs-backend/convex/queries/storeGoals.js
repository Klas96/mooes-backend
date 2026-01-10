// Store Goal Queries
// Read operations for store goals

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get store goal by ID
 */
export const getById = query({
  args: { id: v.id("storeGoals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal) return null;
    
    // Optionally include store data
    const store = await ctx.db.get(goal.storeId);
    return { ...goal, store };
  },
});

/**
 * Get all goals for a store
 */
export const getByStoreId = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("storeGoals")
      .withIndex("storeId", (q) => q.eq("storeId", args.storeId))
      .collect();
  },
});

/**
 * Get active goals for a store
 */
export const getActiveByStoreId = query({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args) => {
    const goals = await ctx.db
      .query("storeGoals")
      .withIndex("storeId", (q) => q.eq("storeId", args.storeId))
      .collect();
    
    return goals.filter(g => g.isActive);
  },
});

/**
 * List all active goals
 */
export const listActive = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    const goals = await ctx.db
      .query("storeGoals")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .take(limit + offset);
    
    return goals.slice(offset);
  },
});

