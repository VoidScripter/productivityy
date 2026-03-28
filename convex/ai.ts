"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateMicroSteps = action({
  args: { task: v.string() },
  handler: async (_ctx, args) => {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(
        "Missing OPENROUTER_API_KEY. Please add it in the Database tab -> Settings -> Environment Variables."
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are a productivity assistant. Generate exactly 3 micro-steps for completing a task. Each micro-step should take less than 2 minutes to complete. Return ONLY a valid JSON object with a \"steps\" array containing exactly 3 strings. No markdown formatting.",
            },
            {
              role: "user",
              content: `Task: ${args.task}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Strip markdown code blocks if present (free models sometimes add them)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7);
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    const parsed = JSON.parse(cleanedContent) as { steps: string[] };
    if (!Array.isArray(parsed.steps) || parsed.steps.length !== 3) {
      throw new Error("AI did not return exactly 3 steps");
    }

    return parsed.steps;
  },
});
