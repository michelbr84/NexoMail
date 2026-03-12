import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AIProvider, AIModel } from "./types";

/**
 * Returns a configured Anthropic client.
 * Reads ANTHROPIC_API_KEY from the environment.
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

/**
 * Returns a configured OpenAI client.
 * Reads OPENAI_API_KEY from the environment.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

/**
 * Resolve which AI provider a given model belongs to.
 */
export function resolveProvider(model: AIModel): AIProvider {
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return "openai";
  }
  throw new Error(`Unknown AI model: ${model}`);
}

/**
 * Default models per provider.
 */
export const DEFAULT_MODELS: Record<AIProvider, AIModel> = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o",
};
