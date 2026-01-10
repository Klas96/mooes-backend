// User Goal Progress Mutations
// Write operations for user goal progress

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create or update user goal progress
 */
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    goalId: v.id("storeGoals"),
    currentDistanceMeters: v.optional(v.number()),
    currentDurationMinutes: v.optional(v.number()),
    isCompleted: v.optional(v.boolean()),
    completedAt: v.optional(v.number()),
    couponActivated: v.optional(v.boolean()),
    couponActivatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if progress already exists
    const existing = await ctx.db
      .query("userGoalProgress")
      .withIndex("userId_goalId", (q) => 
        q.eq("userId", args.userId).eq("goalId", args.goalId)
      )
      .first();
    
    if (existing) {
      // Update existing progress
      const updates = {
        updatedAt: now,
      };
      
      if (args.currentDistanceMeters !== undefined) {
        updates.currentDistanceMeters = args.currentDistanceMeters;
      }
      if (args.currentDurationMinutes !== undefined) {
        updates.currentDurationMinutes = args.currentDurationMinutes;
      }
      if (args.isCompleted !== undefined) {
        updates.isCompleted = args.isCompleted;
      }
      if (args.completedAt !== undefined) {
        updates.completedAt = args.completedAt;
      }
      if (args.couponActivated !== undefined) {
        updates.couponActivated = args.couponActivated;
      }
      if (args.couponActivatedAt !== undefined) {
        updates.couponActivatedAt = args.couponActivatedAt;
      }
      
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new progress
      const progressId = await ctx.db.insert("userGoalProgress", {
        userId: args.userId,
        goalId: args.goalId,
        currentDistanceMeters: args.currentDistanceMeters || 0,
        currentDurationMinutes: args.currentDurationMinutes || 0,
        isCompleted: args.isCompleted || false,
        completedAt: args.completedAt,
        couponActivated: args.couponActivated || false,
        couponActivatedAt: args.couponActivatedAt,
        createdAt: now,
        updatedAt: now,
      });
      
      return progressId;
    }
  },
});

/**
 * Update user goal progress
 */
export const update = mutation({
  args: {
    id: v.id("userGoalProgress"),
    currentDistanceMeters: v.optional(v.number()),
    currentDurationMinutes: v.optional(v.number()),
    isCompleted: v.optional(v.boolean()),
    completedAt: v.optional(v.number()),
    couponActivated: v.optional(v.boolean()),
    couponActivatedAt: v.optional(v.number()),
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
 * Delete user goal progress
 */
export const remove = mutation({
  args: { id: v.id("userGoalProgress") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

