"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateMicroSteps = action({
  args: { task: v.string() },
  returns: v.array(v.string()),
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing OPENROUTER_API_KEY. Please add it in the Database tab → Settings → Environment Variables."
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a procrastination coach. Given a task someone is avoiding, generate exactly 3 micro-steps that each take less than 2 minutes to complete. The steps should be extremely specific, concrete, and actionable — not vague. The first step should be the absolute smallest physical action to get started. Return a JSON object with a "steps" array containing exactly 3 strings.`,
            },
            {
              role: "user",
              content: `I'm procrastinating on: ${args.task}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Failed to generate micro-steps. Please try again later."
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI returned an unexpected response. Please try again.");
    }

    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.steps) || parsed.steps.length !== 3) {
      throw new Error("AI returned an unexpected response. Please try again.");
    }

    return parsed.steps as string[];
  },
});
