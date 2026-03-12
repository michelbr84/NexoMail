import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { connections } from "./connections";

export const emailStats = pgTable(
  "email_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    received: integer("received").default(0),
    sent: integer("sent").default(0),
    read: integer("read").default(0),
    unread: integer("unread").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    connectionDateIdx: uniqueIndex("email_stats_connection_date_idx").on(
      table.connectionId,
      table.date
    ),
  })
);

export const emailStatsRelations = relations(emailStats, ({ one }) => ({
  connection: one(connections, {
    fields: [emailStats.connectionId],
    references: [connections.id],
  }),
}));

export type EmailStat = typeof emailStats.$inferSelect;
export type NewEmailStat = typeof emailStats.$inferInsert;
