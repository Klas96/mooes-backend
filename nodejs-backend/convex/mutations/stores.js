// Store Mutations
// Write operations for stores

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new store
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    storeName: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if user already has a store
    const existing = await ctx.db
      .query("stores")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existing) {
      throw new Error("User already has a store");
    }
    
    const storeId = await ctx.db.insert("stores", {
      userId: args.userId,
      storeName: args.storeName,
      description: args.description,
      logo: args.logo,
      profilePicture: args.profilePicture,
      location: args.location,
      website: args.website,
      latitude: args.latitude,
      longitude: args.longitude,
      isActive: args.isActive !== undefined ? args.isActive : true,
      createdAt: now,
      updatedAt: now,
    });
    
    return storeId;
  },
});

/**
 * Update store
 */
export const update = mutation({
  args: {
    id: v.id("stores"),
    storeName: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
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
 * Delete store
 */
export const remove = mutation({
  args: { id: v.id("stores") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

