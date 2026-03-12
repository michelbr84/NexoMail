import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { connections } from "./connections";
import { emails } from "./emails";
import { threadLabels } from "./labels";

export const threads = pgTable("threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(), // Gmail thread ID / Outlook conversation ID
  subject: text("subject"),
  snippet: text("snippet"),
  from: text("from"),
  messageCount: integer("message_count").default(1),
  hasAttachments: boolean("has_attachments").default(false),
  isRead: boolean("is_read").default(false).notNull(),
  isStarred: boolean("is_starred").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isTrashed: boolean("is_trashed").default(false).notNull(),
  isSpam: boolean("is_spam").default(false).notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("threads_external_connection_uniq").on(t.externalId, t.connectionId),
]);

export const threadsRelations = relations(threads, ({ one, many }) => ({
  connection: one(connections, {
    fields: [threads.connectionId],
    references: [connections.id],
  }),
  emails: many(emails),
  threadLabels: many(threadLabels),
}));

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
