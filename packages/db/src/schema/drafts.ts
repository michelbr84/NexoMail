import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { connections } from "./connections";
import { threads } from "./threads";
import { type EmailRecipient, type EmailAttachment } from "./emails";

export const drafts = pgTable("drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id").references(() => threads.id, {
    onDelete: "set null",
  }),
  externalId: text("external_id"), // Provider draft ID (set once synced)
  subject: text("subject"),
  toRecipients: jsonb("to_recipients").$type<EmailRecipient[]>().default([]),
  ccRecipients: jsonb("cc_recipients").$type<EmailRecipient[]>().default([]),
  bccRecipients: jsonb("bcc_recipients").$type<EmailRecipient[]>().default([]),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  attachments: jsonb("attachments").$type<EmailAttachment[]>().default([]),
  inReplyTo: text("in_reply_to"),  // Message-ID of the email being replied to
  references: text("references"),
  // AI assistance
  aiGeneratedContent: boolean("ai_generated_content").default(false),
  aiPrompt: text("ai_prompt"),     // The prompt used to generate this draft
  isSent: boolean("is_sent").default(false).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const draftsRelations = relations(drafts, ({ one }) => ({
  connection: one(connections, {
    fields: [drafts.connectionId],
    references: [connections.id],
  }),
  thread: one(threads, {
    fields: [drafts.threadId],
    references: [threads.id],
  }),
}));

export type Draft = typeof drafts.$inferSelect;
export type NewDraft = typeof drafts.$inferInsert;
