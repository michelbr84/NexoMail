import { z } from "zod";

export type AIProvider = "anthropic" | "openai";

export const AIModelSchema = z.enum([
  // Anthropic
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-opus-20240229",
  // OpenAI
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
]);
export type AIModel = z.infer<typeof AIModelSchema>;

export interface AIMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}


export interface ComposeEmailInput {
  context: {
    userEmail: string;
    userName?: string;
    writingStyle?: {
      tone: string;
      greeting?: string;
      signature?: string;
    };
  };
  prompt: string;
  replyToEmail?: {
    subject: string;
    fromEmail: string;
    fromName?: string;
    bodyText: string;
  };
  threadContext?: string[];
}

export interface ComposeEmailResult {
  subject?: string;
  bodyText: string;
  bodyHtml: string;
}

export interface EmailSearchQuery {
  naturalLanguageQuery: string;
  connectionId: string;
}

export interface EmailSearchFilters {
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  isRead?: boolean;
  isStarred?: boolean;
  labels?: string[];
  keywords?: string[];
}
