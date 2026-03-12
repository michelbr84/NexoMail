import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export type EmailProvider = "gmail" | "outlook" | "imap";

export type WritingStyle = {
  tone: "formal" | "casual" | "friendly" | "professional";
  greeting?: string;
  signature?: string;
  averageSentenceLength?: "short" | "medium" | "long";
  usesEmoji?: boolean;
  sampleEmails?: string[];
};

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").$type<EmailProvider>().notNull(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Encrypted OAuth tokens
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  // IMAP/SMTP credentials (encrypted at rest)
  imapHost: text("imap_host"),
  imapPort: text("imap_port"),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port"),
  imapPassword: text("imap_password"),
  // Sync state
  lastSyncAt: timestamp("last_sync_at"),
  historyId: text("history_id"),    // Gmail history ID for incremental sync
  syncCursor: text("sync_cursor"),  // Outlook delta link
  isActive: boolean("is_active").default(true).notNull(),
  // AI writing style profile
  writingStyle: jsonb("writing_style").$type<WritingStyle>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const connectionsRelations = relations(connections, ({ one }) => ({
  user: one(users, {
    fields: [connections.userId],
    references: [users.id],
  }),
}));

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
