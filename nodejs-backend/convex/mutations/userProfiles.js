// User Profile Mutations
// Write operations for user profiles

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create a new user profile
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    profilePicture: v.optional(v.string()),
    bio: v.optional(v.string()),
    birthDate: v.optional(v.string()), // ISO date string
    gender: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("O"))),
    genderPreference: v.optional(v.union(v.literal("M"), v.literal("W"), v.literal("B"))),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    keyWords: v.optional(v.array(v.string())),
    locationMode: v.optional(v.union(v.literal("local"), v.literal("global"))),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if profile already exists
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existing) {
      throw new Error("User profile already exists");
    }
    
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      profilePicture: args.profilePicture,
      bio: args.bio,
      birthDate: args.birthDate,
      gender: args.gender,
      genderPreference: args.genderPreference || "B",
      location: args.location,
      latitude: args.latitude,
      longitude: args.longitude,
      keyWords: args.keyWords || [],
      locationMode: args.locationMode || "global",
      isHidden: args.isHidden || false,
      createdAt: now,
      updatedAt: now,
    });
    
    return profileId;
  },
});

/**
 * Update user profile
 */
export const update = mutation({
  args: {
    id: v.id("userProfiles"),
    profilePicture: v.optional(v.string()),
    bio: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("O"))),
    genderPreference: v.optional(v.union(v.literal("M"), v.literal("W"), v.literal("B"))),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    keyWords: v.optional(v.array(v.string())),
    locationMode: v.optional(v.union(v.literal("local"), v.literal("global"))),
    isHidden: v.optional(v.boolean()),
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
 * Update user profile by user ID
 */
export const updateByUserId = mutation({
  args: {
    userId: v.id("users"),
    profilePicture: v.optional(v.string()),
    bio: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("O"))),
    genderPreference: v.optional(v.union(v.literal("M"), v.literal("W"), v.literal("B"))),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    keyWords: v.optional(v.array(v.string())),
    locationMode: v.optional(v.union(v.literal("local"), v.literal("global"))),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();
    
    if (!profile) {
      throw new Error("User profile not found");
    }
    
    const cleanUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    cleanUpdates.updatedAt = Date.now();
    
    await ctx.db.patch(profile._id, cleanUpdates);
    return profile._id;
  },
});

/**
 * Delete user profile
 */
export const remove = mutation({
  args: { id: v.id("userProfiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

