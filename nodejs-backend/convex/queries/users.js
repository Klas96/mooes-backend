// User Queries
// Read operations for users

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get user by ID
 */
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get user by email
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * List all users (with pagination)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(limit + offset);
    
    return users.slice(offset);
  },
});

/**
 * Check if email exists
 */
export const emailExists = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    
    return user !== null;
  },
});

/**
 * Get user by reset password token
 */
export const getByResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Don't search for empty tokens
    if (!args.token || args.token.trim() === '') {
      return null;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("resetPasswordToken", (q) => q.eq("resetPasswordToken", args.token))
      .first();
    
    // Check if token is expired (expiry of 0 means cleared)
    if (user && user.resetPasswordExpiry && user.resetPasswordExpiry > 0 && Date.now() <= user.resetPasswordExpiry) {
      return user;
    }
    
    return null;
  },
});

