// User Profile Queries
// Read operations for user profiles

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get user profile by ID
 */
export const getById = query({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) return null;
    
    // Include user data
    const user = await ctx.db.get(profile.userId);
    return { ...profile, user };
  },
});

/**
 * Get user profile by user ID
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * List all user profiles (with pagination and filters)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("O"))),
    genderPreference: v.optional(v.union(v.literal("M"), v.literal("W"), v.literal("B"))),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    let query = ctx.db.query("userProfiles");
    
    // Apply filters
    if (args.isHidden !== undefined) {
      // Note: Convex doesn't have compound indexes like Sequelize,
      // so we'll filter in memory for complex queries
      const all = await query.collect();
      let filtered = all.filter(p => p.isHidden === args.isHidden);
      
      if (args.gender) {
        filtered = filtered.filter(p => p.gender === args.gender);
      }
      if (args.genderPreference) {
        filtered = filtered.filter(p => p.genderPreference === args.genderPreference);
      }
      
      return filtered.slice(offset, offset + limit);
    }
    
    // Simple query without filters
    const profiles = await query
      .order("desc")
      .take(limit + offset);
    
    // Apply additional filters if needed
    let filtered = profiles;
    if (args.gender) {
      filtered = filtered.filter(p => p.gender === args.gender);
    }
    if (args.genderPreference) {
      filtered = filtered.filter(p => p.genderPreference === args.genderPreference);
    }
    
    return filtered.slice(offset);
  },
});

