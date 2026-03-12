import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { connections } from "./connections";
import { threads } from "./threads";

export const labels = pgTable("labels", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  externalId: text("external_id"), // Provider label ID
  name: text("name").notNull(),
  color: text("color"),
  isSystem: boolean("is_system").default(false).notNull(),
  type: text("type").default("user").notNull(), // 'user' | 'system'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const threadLabels = pgTable(
  "thread_labels",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.threadId, table.labelId] }),
  })
);

export const labelsRelations = relations(labels, ({ one, many }) => ({
  connection: one(connections, {
    fields: [labels.connectionId],
    references: [connections.id],
  }),
  threadLabels: many(threadLabels),
}));

export const threadLabelsRelations = relations(threadLabels, ({ one }) => ({
  thread: one(threads, {
    fields: [threadLabels.threadId],
    references: [threads.id],
  }),
  label: one(labels, {
    fields: [threadLabels.labelId],
    references: [labels.id],
  }),
}));

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
export type ThreadLabel = typeof threadLabels.$inferSelect;
