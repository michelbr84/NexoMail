import { tool } from "ai";
import { z } from "zod";

export const agentTools = {
  search_emails: tool({
    description: "Search emails by query, sender, subject or date range",
    parameters: z.object({
      query: z.string().describe("Search query"),
      from: z.string().optional().describe("Filter by sender email"),
      subject: z.string().optional().describe("Filter by subject"),
      folder: z.enum(["inbox", "sent", "drafts", "trash", "spam", "archived", "starred"]).optional(),
      dateFrom: z.string().optional().describe("ISO date string, start of range"),
      dateTo: z.string().optional().describe("ISO date string, end of range"),
      limit: z.number().min(1).max(50).default(20),
    }),
  }),

  get_thread: tool({
    description: "Get all messages in an email thread by thread ID",
    parameters: z.object({
      threadId: z.string().describe("Thread ID"),
    }),
  }),

  summarize_emails: tool({
    description: "Summarize a set of emails or a thread",
    parameters: z.object({
      threadId: z.string().optional(),
      emailIds: z.array(z.string()).optional(),
      style: z.enum(["brief", "detailed", "bullets"]).default("brief"),
    }),
  }),

  mark_read: tool({
    description: "Mark one or more emails as read or unread",
    parameters: z.object({
      emailIds: z.array(z.string()),
      read: z.boolean(),
    }),
  }),

  move_to_trash: tool({
    description: "Move emails to trash",
    parameters: z.object({
      emailIds: z.array(z.string()),
    }),
  }),

  archive_emails: tool({
    description: "Archive emails (remove from inbox without deleting)",
    parameters: z.object({
      emailIds: z.array(z.string()),
    }),
  }),

  add_label: tool({
    description: "Add a label/tag to emails",
    parameters: z.object({
      emailIds: z.array(z.string()),
      labelName: z.string().describe("Name of the label to add"),
    }),
  }),

  create_label: tool({
    description: "Create a new label/folder",
    parameters: z.object({
      connectionId: z.string(),
      name: z.string(),
      color: z.string().optional(),
    }),
  }),

  move_emails: tool({
    description: "Move emails to a different folder or label",
    parameters: z.object({
      emailIds: z.array(z.string()),
      targetLabel: z.string().describe("Target label or folder name"),
    }),
  }),

  compose_draft: tool({
    description: "Create a draft email",
    parameters: z.object({
      connectionId: z.string(),
      to: z.array(z.object({ email: z.string(), name: z.string().optional() })),
      subject: z.string(),
      body: z.string().describe("Email body in plain text"),
      cc: z.array(z.object({ email: z.string(), name: z.string().optional() })).optional(),
    }),
  }),

  get_stats: tool({
    description: "Get email statistics: unread count, top senders, email volume",
    parameters: z.object({
      connectionId: z.string().optional(),
      days: z.number().default(7).describe("Number of days to analyze"),
    }),
  }),

  list_labels: tool({
    description: "List all labels and folders for a connection",
    parameters: z.object({
      connectionId: z.string().optional(),
    }),
  }),
};

export type AgentToolName = keyof typeof agentTools;
