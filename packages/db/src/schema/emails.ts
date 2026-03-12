import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { connections } from "./connections";
import { threads } from "./threads";

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailAttachment = {
  name: string;
  mimeType: string;
  size: number;
  attachmentId: string;
};

export const emails = pgTable("emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id").references(() => threads.id, {
    onDelete: "cascade",
  }),
  externalId: text("external_id").notNull(), // Provider message ID
  messageId: text("message_id"),             // RFC Message-ID header
  inReplyTo: text("in_reply_to"),
  references: text("references"),
  subject: text("subject"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  toRecipients: jsonb("to_recipients").$type<EmailRecipient[]>(),
  ccRecipients: jsonb("cc_recipients").$type<EmailRecipient[]>(),
  bccRecipients: jsonb("bcc_recipients").$type<EmailRecipient[]>(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  snippet: text("snippet"),
  attachments: jsonb("attachments").$type<EmailAttachment[]>(),
  isRead: boolean("is_read").default(false).notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isTrashed: boolean("is_trashed").default(false).notNull(),
  isSpam: boolean("is_spam").default(false).notNull(),
  // AI-enriched fields
  aiSummary: text("ai_summary"),
  aiCategory: text("ai_category"),
  aiPriority: integer("ai_priority"), // 1 (low) to 5 (critical)
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("emails_external_connection_uniq").on(t.externalId, t.connectionId),
]);

export const emailsRelations = relations(emails, ({ one }) => ({
  connection: one(connections, {
    fields: [emails.connectionId],
    references: [connections.id],
  }),
  thread: one(threads, {
    fields: [emails.threadId],
    references: [threads.id],
  }),
}));

export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
