import { generateObject, generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const classificationSchema = z.object({
  category: z.enum([
    "important",
    "newsletter",
    "notification",
    "promotional",
    "social",
    "financial",
    "travel",
    "work",
    "personal",
    "spam",
  ]),
  priority: z.number().min(1).max(5).describe("1=lowest, 5=highest priority"),
  summary: z.string().max(200).describe("One sentence summary"),
  actionRequired: z.boolean(),
  sentiment: z.enum(["positive", "neutral", "negative", "urgent"]),
});

export type EmailClassification = z.infer<typeof classificationSchema>;

export async function classifyEmail(params: {
  subject: string;
  from: string;
  snippet: string;
  bodyText?: string;
  apiKey: string;
}): Promise<EmailClassification> {
  const anthropic = createAnthropic({ apiKey: params.apiKey });

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: classificationSchema,
    prompt: `Classify this email:
From: ${params.from}
Subject: ${params.subject}
Content: ${params.snippet || params.bodyText?.slice(0, 500) || ""}`,
  });

  return object;
}

export async function summarizeThread(params: {
  subject: string;
  messages: Array<{ from: string; body: string; date: string }>;
  style?: "brief" | "detailed" | "bullets";
  apiKey: string;
}): Promise<string> {
  const anthropic = createAnthropic({ apiKey: params.apiKey });
  const style = params.style ?? "brief";

  const styleInstruction = {
    brief: "Write a single concise paragraph summary (2-3 sentences max).",
    detailed: "Write a detailed summary covering all key points.",
    bullets: "Write a bullet-point summary with the main points.",
  }[style];

  const threadText = params.messages
    .map((m) => `[${m.date}] ${m.from}:\n${m.body.slice(0, 800)}`)
    .join("\n\n---\n\n");

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `Summarize this email thread about "${params.subject}".\n${styleInstruction}\n\nThread:\n${threadText}`,
  });

  return text;
}

export async function generateReply(params: {
  originalSubject: string;
  originalFrom: string;
  originalBody: string;
  instructions: string;
  writingStyle?: string;
  apiKey: string;
}): Promise<string> {
  const anthropic = createAnthropic({ apiKey: params.apiKey });

  const styleContext = params.writingStyle
    ? `\n\nWriting style guidelines: ${params.writingStyle}`
    : "";

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: `Write an email reply based on these instructions: "${params.instructions}"

Original email from ${params.originalFrom}:
Subject: ${params.originalSubject}
${params.originalBody.slice(0, 1000)}
${styleContext}

Write only the reply body (no subject line, no greeting if not needed). Be professional and natural.`,
  });

  return text;
}
