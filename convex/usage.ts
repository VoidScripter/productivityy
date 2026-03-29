import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const FREE_DAILY_LIMIT = 3;

// Helper to get today's date string in UTC
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// Query: get current user's usage info
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const today = getTodayString();

    // Check if user has premium (lifetime) access
    const premiumRecord = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isPremium"), true))
      .first();

    if (premiumRecord) {
      return { isPremium: true, remaining: Infinity, used: 0, limit: FREE_DAILY_LIMIT };
    }

    // Get today's usage
    const todayUsage = await ctx.db
      .query("usage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    const used = todayUsage?.count ?? 0;
    return {
      isPremium: false,
      remaining: Math.max(0, FREE_DAILY_LIMIT - used),
      used,
      limit: FREE_DAILY_LIMIT,
    };
  },
});

// Mutation: increment usage count, returns true if allowed, false if limit reached
export const incrementUsage = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const today = getTodayString();

    // Check premium
    const premiumRecord = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isPremium"), true))
      .first();

    if (premiumRecord) return true;

    // Get or create today's usage
    const todayUsage = await ctx.db
      .query("usage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", today))
      .first();

    if (todayUsage) {
      if (todayUsage.count >= FREE_DAILY_LIMIT) return false;
      await ctx.db.patch(todayUsage._id, { count: todayUsage.count + 1 });
    } else {
      await ctx.db.insert("usage", { userId, date: today, count: 1, isPremium: false });
    }

    return true;
  },
});

// Mutation: mark user as premium (called after successful payment verification)
export const upgradeToPremium = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already premium
    const premiumRecord = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isPremium"), true))
      .first();

    if (premiumRecord) return true; // Already premium

    // Create a premium record
    await ctx.db.insert("usage", {
      userId,
      date: "premium",
      count: 0,
      isPremium: true,
    });

    return true;
  },
});
