// Training Session Queries
// Read operations for training sessions

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get training session by ID
 */
export const getById = query({
  args: { id: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;
    
    // Optionally include user data
    const user = await ctx.db.get(session.userId);
    return { ...session, user };
  },
});

/**
 * Get all training sessions for a user
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainingSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get training sessions for a user by date range
 */
export const getByUserIdAndDateRange = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(), // ISO date string
    endDate: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    const allSessions = await ctx.db
      .query("trainingSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Filter by date range
    return allSessions.filter(session => {
      return session.date >= args.startDate && session.date <= args.endDate;
    });
  },
});

/**
 * List all training sessions (with pagination)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    const sessions = await ctx.db
      .query("trainingSessions")
      .order("desc")
      .take(limit + offset);
    
    return sessions.slice(offset);
  },
});

