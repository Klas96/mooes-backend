// Coupon Mutations
// Write operations for coupons

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new coupon
 */
export const create = mutation({
  args: {
    userId: v.optional(v.id("users")),
    goalId: v.optional(v.id("storeGoals")),
    storeId: v.id("stores"),
    code: v.string(),
    description: v.optional(v.string()),
    discount: v.optional(v.number()), // Percentage as decimal
    discountAmount: v.optional(v.number()), // Fixed amount
    isUsed: v.optional(v.boolean()),
    usedAt: v.optional(v.number()), // Timestamp in milliseconds
    expiresAt: v.optional(v.number()), // Timestamp in milliseconds
    qrCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if code already exists
    const existing = await ctx.db
      .query("coupons")
      .withIndex("code", (q) => q.eq("code", args.code))
      .first();
    
    if (existing) {
      throw new Error("Coupon code already exists");
    }
    
    const couponId = await ctx.db.insert("coupons", {
      userId: args.userId,
      goalId: args.goalId,
      storeId: args.storeId,
      code: args.code,
      description: args.description,
      discount: args.discount,
      discountAmount: args.discountAmount,
      isUsed: args.isUsed || false,
      usedAt: args.usedAt,
      expiresAt: args.expiresAt,
      qrCode: args.qrCode,
      createdAt: now,
      updatedAt: now,
    });
    
    return couponId;
  },
});

/**
 * Update coupon
 */
export const update = mutation({
  args: {
    id: v.id("coupons"),
    userId: v.optional(v.id("users")),
    goalId: v.optional(v.id("storeGoals")),
    storeId: v.optional(v.id("stores")),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    discount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    isUsed: v.optional(v.boolean()),
    usedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    qrCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // If code is being updated, check for duplicates
    if (updates.code) {
      const existing = await ctx.db
        .query("coupons")
        .withIndex("code", (q) => q.eq("code", updates.code))
        .first();
      
      if (existing && existing._id !== id) {
        throw new Error("Coupon code already exists");
      }
    }
    
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
 * Delete coupon
 */
export const remove = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

