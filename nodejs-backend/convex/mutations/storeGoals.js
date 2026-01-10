// Store Goal Mutations
// Write operations for store goals

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new store goal
 */
export const create = mutation({
  args: {
    storeId: v.id("stores"),
    title: v.string(),
    description: v.optional(v.string()),
    targetDistanceMeters: v.optional(v.number()),
    targetDurationMinutes: v.optional(v.number()),
    startDate: v.string(), // ISO date string
    endDate: v.optional(v.string()), // ISO date string
    isActive: v.optional(v.boolean()),
    maxParticipants: v.optional(v.number()),
    couponCode: v.string(),
    couponDescription: v.optional(v.string()),
    couponDiscount: v.optional(v.number()), // Percentage as decimal
    couponDiscountAmount: v.optional(v.number()), // Fixed amount
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const goalId = await ctx.db.insert("storeGoals", {
      storeId: args.storeId,
      title: args.title,
      description: args.description,
      targetDistanceMeters: args.targetDistanceMeters,
      targetDurationMinutes: args.targetDurationMinutes,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: args.isActive !== undefined ? args.isActive : true,
      maxParticipants: args.maxParticipants,
      couponCode: args.couponCode,
      couponDescription: args.couponDescription,
      couponDiscount: args.couponDiscount,
      couponDiscountAmount: args.couponDiscountAmount,
      createdAt: now,
      updatedAt: now,
    });
    
    return goalId;
  },
});

/**
 * Update store goal
 */
export const update = mutation({
  args: {
    id: v.id("storeGoals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetDistanceMeters: v.optional(v.number()),
    targetDurationMinutes: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    maxParticipants: v.optional(v.number()),
    couponCode: v.optional(v.string()),
    couponDescription: v.optional(v.string()),
    couponDiscount: v.optional(v.number()),
    couponDiscountAmount: v.optional(v.number()),
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
 * Delete store goal
 */
export const remove = mutation({
  args: { id: v.id("storeGoals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

