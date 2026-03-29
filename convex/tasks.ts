import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const saveTask = mutation({
  args: {
    task: v.string(),
    steps: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Please sign in to save tasks");
    }

    await ctx.db.insert("tasks", {
      userId,
      task: args.task,
      steps: args.steps,
      createdAt: Date.now(),
    });
  },
});

export const getHistory = query({
  args: {
    sort: v.union(v.literal("latest"), v.literal("oldest")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (args.sort === "latest") {
      return tasks.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      return tasks.sort((a, b) => a.createdAt - b.createdAt);
    }
  },
});
