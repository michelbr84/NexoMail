import { streamText, convertToCoreMessages, type Message } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { agentTools } from "./tools";

const SYSTEM_PROMPT = `You are NexoMail Assistant, an intelligent email management agent built into NexoMail.

You help users manage their email inbox with natural language commands. You can:
- Search and find emails by topic, sender, subject, or date
- Summarize email threads and groups of messages
- Organize emails: archive, move, label, trash
- Create new labels and folders
- Show email statistics and insights
- Help compose replies and drafts

Always be concise and action-oriented. When the user asks you to do something, use the available tools to actually do it, then confirm what was done.

When searching or filtering, always call the search_emails tool rather than asking for more information.

Respond in the same language as the user's message. If they write in Portuguese, respond in Portuguese.

Current date: ${new Date().toISOString().split("T")[0]}`;

export interface AgentContext {
  userId: string;
  connectionId?: string;
  messages: Message[];
  anthropicApiKey: string;
}

export async function runAgent(ctx: AgentContext) {
  const anthropic = createAnthropic({ apiKey: ctx.anthropicApiKey });

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages: convertToCoreMessages(ctx.messages),
    tools: agentTools,
    maxSteps: 10,
    temperature: 0.3,
  });

  return result;
}
