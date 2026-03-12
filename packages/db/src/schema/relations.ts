/**
 * Cross-table relations that cannot be defined in individual schema files
 * due to circular import constraints. These augment the partial relations
 * already defined in each table's own file.
 */
import { relations } from "drizzle-orm";
import { users } from "./users";
import { connections } from "./connections";
import { threads } from "./threads";
import { emails } from "./emails";
import { labels } from "./labels";
import { aiConversations } from "./conversations";

export const usersExtendedRelations = relations(users, ({ many }) => ({
  connections: many(connections),
  aiConversations: many(aiConversations),
}));

export const connectionsExtendedRelations = relations(connections, ({ many }) => ({
  threads: many(threads),
  emails: many(emails),
  labels: many(labels),
}));
