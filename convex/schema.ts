import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  usage: defineTable({
    userId: v.id("users"),
    date: v.string(),       // "YYYY-MM-DD" format
    count: v.number(),       // number of tasks generated today
    isPremium: v.boolean(),  // lifetime access purchased
  }).index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),
  tasks: defineTable({
    userId: v.id("users"),
    task: v.string(),
    steps: v.array(v.string()),
    createdAt: v.number(),  // Date.now() timestamp
  }).index("by_user", ["userId"]),
});
