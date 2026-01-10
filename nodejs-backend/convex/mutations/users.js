// User Mutations
// Write operations for users

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new user
 */
export const create = mutation({
  args: {
    email: v.string(),
    password: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    fcmToken: v.optional(v.string()),
    isPremium: v.optional(v.boolean()),
    premiumExpiry: v.optional(v.number()),
    premiumPlan: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      throw new Error("Email already exists");
    }
    
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: args.password,
      firstName: args.firstName,
      lastName: args.lastName,
      fcmToken: args.fcmToken,
      isPremium: args.isPremium || false,
      premiumExpiry: args.premiumExpiry,
      premiumPlan: args.premiumPlan,
      isActive: true,
      lastLogin: now,
      emailVerified: args.emailVerified || false,
      emailVerificationToken: undefined,
      emailVerificationExpiry: undefined,
      resetPasswordToken: undefined,
      resetPasswordExpiry: undefined,
      aiMessageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    
    return userId;
  },
});

/**
 * Update user
 */
export const update = mutation({
  args: {
    id: v.id("users"),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fcmToken: v.optional(v.string()),
    isPremium: v.optional(v.boolean()),
    premiumExpiry: v.optional(v.number()),
    premiumPlan: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lastLogin: v.optional(v.number()),
    emailVerified: v.optional(v.boolean()),
    emailVerificationToken: v.optional(v.string()),
    emailVerificationExpiry: v.optional(v.number()),
    resetPasswordToken: v.optional(v.string()),
    resetPasswordExpiry: v.optional(v.number()),
    aiMessageCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Don't update undefined values
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
 * Delete user
 */
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

