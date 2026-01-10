// User Goal Progress Queries
// Read operations for user goal progress

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get user goal progress by ID
 */
export const getById = query({
  args: { id: v.id("userGoalProgress") },
  handler: async (ctx, args) => {
    const progress = await ctx.db.get(args.id);
    if (!progress) return null;
    
    // Optionally include goal and user data
    const goal = await ctx.db.get(progress.goalId);
    const user = await ctx.db.get(progress.userId);
    return { ...progress, goal, user };
  },
});

/**
 * Get all progress for a user
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("userGoalProgress")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Include goal data for each progress
    const progressWithGoals = await Promise.all(
      progress.map(async (p) => {
        const goal = await ctx.db.get(p.goalId);
        return { ...p, goal };
      })
    );
    
    return progressWithGoals;
  },
});

/**
 * Get progress for a specific goal
 */
export const getByGoalId = query({
  args: { goalId: v.id("storeGoals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userGoalProgress")
      .withIndex("goalId", (q) => q.eq("goalId", args.goalId))
      .collect();
  },
});

/**
 * Get progress for user and goal
 */
export const getByUserIdAndGoalId = query({
  args: { 
    userId: v.id("users"),
    goalId: v.id("storeGoals")
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("userGoalProgress")
      .withIndex("userId_goalId", (q) => 
        q.eq("userId", args.userId).eq("goalId", args.goalId)
      )
      .first();
    
    if (!progress) return null;
    
    // Include goal data
    const goal = await ctx.db.get(args.goalId);
    return { ...progress, goal };
  },
});

/**
 * Get completed progress for a user
 */
export const getCompletedByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allProgress = await ctx.db
      .query("userGoalProgress")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    const completed = allProgress.filter(p => p.isCompleted);
    
    // Include goal data
    const completedWithGoals = await Promise.all(
      completed.map(async (p) => {
        const goal = await ctx.db.get(p.goalId);
        return { ...p, goal };
      })
    );
    
    return completedWithGoals;
  },
});

