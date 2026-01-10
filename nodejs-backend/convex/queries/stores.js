// Store Queries
// Read operations for stores

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get store by ID
 */
export const getById = query({
  args: { id: v.id("stores") },
  handler: async (ctx, args) => {
    const store = await ctx.db.get(args.id);
    if (!store) return null;
    
    // Optionally include user data
    const user = await ctx.db.get(store.userId);
    return { ...store, user };
  },
});

/**
 * Get store by user ID
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stores")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * List all active stores
 */
export const listActive = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    const stores = await ctx.db
      .query("stores")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .take(limit + offset);
    
    return stores.slice(offset);
  },
});

/**
 * List all stores (with pagination)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    const stores = await ctx.db
      .query("stores")
      .order("desc")
      .take(limit + offset);
    
    return stores.slice(offset);
  },
});

