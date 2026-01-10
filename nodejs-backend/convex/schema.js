// Convex Schema
// This file defines the database schema for all tables

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()), // Optional for OAuth users
    firstName: v.string(),
    lastName: v.string(),
    fcmToken: v.optional(v.string()),
    isPremium: v.boolean(),
    premiumExpiry: v.optional(v.number()), // Timestamp in milliseconds
    premiumPlan: v.optional(v.string()),
    isActive: v.boolean(),
    lastLogin: v.optional(v.number()), // Timestamp in milliseconds
    emailVerified: v.boolean(),
    emailVerificationToken: v.optional(v.string()),
    emailVerificationExpiry: v.optional(v.number()), // Timestamp in milliseconds
    resetPasswordToken: v.optional(v.string()),
    resetPasswordExpiry: v.optional(v.number()), // Timestamp in milliseconds
    aiMessageCount: v.optional(v.number()),
    createdAt: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("email", ["email"]),

  // User Profiles table
  userProfiles: defineTable({
    userId: v.id("users"),
    profilePicture: v.optional(v.string()),
    bio: v.optional(v.string()),
    birthDate: v.optional(v.string()), // ISO date string
    gender: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("O"))),
    genderPreference: v.optional(v.union(v.literal("M"), v.literal("W"), v.literal("B"))),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    keyWords: v.optional(v.array(v.string())), // Array of keywords
    locationMode: v.optional(v.union(v.literal("local"), v.literal("global"))),
    isHidden: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"]),

  // Stores table
  stores: defineTable({
    userId: v.id("users"),
    storeName: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("isActive", ["isActive"]),

  // Store Goals table
  storeGoals: defineTable({
    storeId: v.id("stores"),
    title: v.string(),
    description: v.optional(v.string()),
    targetDistanceMeters: v.optional(v.number()),
    targetDurationMinutes: v.optional(v.number()),
    startDate: v.string(), // ISO date string
    endDate: v.optional(v.string()), // ISO date string
    isActive: v.boolean(),
    maxParticipants: v.optional(v.number()),
    couponCode: v.string(),
    couponDescription: v.optional(v.string()),
    couponDiscount: v.optional(v.number()), // Percentage as decimal
    couponDiscountAmount: v.optional(v.number()), // Fixed amount
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("storeId", ["storeId"])
    .index("isActive", ["isActive"])
    .index("dates", ["startDate", "endDate"]),

  // User Goal Progress table
  userGoalProgress: defineTable({
    userId: v.id("users"),
    goalId: v.id("storeGoals"),
    currentDistanceMeters: v.number(),
    currentDurationMinutes: v.number(),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()), // Timestamp in milliseconds
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("goalId", ["goalId"])
    .index("userId_goalId", ["userId", "goalId"]),

  // Coupons table
  coupons: defineTable({
    userId: v.optional(v.id("users")), // Optional if not yet assigned
    goalId: v.optional(v.id("storeGoals")), // Optional reference to goal
    storeId: v.id("stores"),
    code: v.string(),
    description: v.optional(v.string()),
    discount: v.optional(v.number()), // Percentage as decimal
    discountAmount: v.optional(v.number()), // Fixed amount
    isUsed: v.boolean(),
    usedAt: v.optional(v.number()), // Timestamp in milliseconds
    expiresAt: v.optional(v.number()), // Timestamp in milliseconds
    qrCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("goalId", ["goalId"])
    .index("storeId", ["storeId"])
    .index("code", ["code"])
    .index("isUsed", ["isUsed"]),

  // Training Sessions table
  trainingSessions: defineTable({
    userId: v.id("users"),
    title: v.string(),
    date: v.string(), // ISO date string
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    goalReached: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("userId", ["userId"])
    .index("date", ["date"]),

  // Note: Other tables (Images, Matches, Messages, Events, Groups, etc.)
  // can be added following the same pattern
});

