// User Mutations
// Write operations for users

import { mutation } from "../_generated/server";
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
    emailVerificationToken: v.optional(v.string()),
    emailVerificationExpiry: v.optional(v.number()),
    resetPasswordToken: v.optional(v.string()),
    resetPasswordExpiry: v.optional(v.number()),
    aiMessageCount: v.optional(v.number()),
    lastLogin: v.optional(v.number()),
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
    
    // Build user object - only include defined fields (don't set undefined)
    const userData = {
      email: args.email,
      password: args.password,
      firstName: args.firstName,
      lastName: args.lastName,
      isPremium: args.isPremium || false,
      isActive: true,
      lastLogin: now,
      emailVerified: args.emailVerified || false,
      aiMessageCount: args.aiMessageCount || 0,
      createdAt: now,
      updatedAt: now,
    };
    
    // Add optional fields only if they're defined
    if (args.fcmToken !== undefined) userData.fcmToken = args.fcmToken;
    if (args.premiumExpiry !== undefined) userData.premiumExpiry = args.premiumExpiry;
    if (args.premiumPlan !== undefined) userData.premiumPlan = args.premiumPlan;
    if (args.emailVerificationToken !== undefined) userData.emailVerificationToken = args.emailVerificationToken;
    if (args.emailVerificationExpiry !== undefined) userData.emailVerificationExpiry = args.emailVerificationExpiry;
    if (args.resetPasswordToken !== undefined) userData.resetPasswordToken = args.resetPasswordToken;
    if (args.resetPasswordExpiry !== undefined) userData.resetPasswordExpiry = args.resetPasswordExpiry;
    
    const userId = await ctx.db.insert("users", userData);
    
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

