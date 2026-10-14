// Training Session Mutations
// Write operations for training sessions

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new training session
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    date: v.string(), // ISO date string
    durationMinutes: v.optional(v.number()),
    distanceKm: v.optional(v.number()), // Distance in kilometers
    goalReached: v.optional(v.boolean()),
    googleFitActivityId: v.optional(v.string()),
    stravaActivityId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const sessionId = await ctx.db.insert("trainingSessions", {
      userId: args.userId,
      title: args.title,
      date: args.date,
      durationMinutes: args.durationMinutes,
      distanceKm: args.distanceKm,
      goalReached: args.goalReached || false,
      googleFitActivityId: args.googleFitActivityId,
      stravaActivityId: args.stravaActivityId,
      createdAt: now,
      updatedAt: now,
    });
    
    return sessionId;
  },
});

/**
 * Update training session
 */
export const update = mutation({
  args: {
    id: v.id("trainingSessions"),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    distanceKm: v.optional(v.number()), // Distance in kilometers
    goalReached: v.optional(v.boolean()),
    googleFitActivityId: v.optional(v.string()),
    stravaActivityId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    const cleanUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    cleanUpdates.updatedAt = Date.now();
    
    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

/**
 * Delete training session
 */
export const remove = mutation({
  args: { id: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});


