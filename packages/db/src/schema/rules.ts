import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { connections } from "./connections";

export type RuleConditionField =
  | "from"
  | "to"
  | "subject"
  | "body"
  | "has_attachment"
  | "ai_category"
  | "ai_priority";

export type RuleConditionOperator =
  | "contains"
  | "not_contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than";

export type RuleCondition = {
  field: RuleConditionField;
  operator: RuleConditionOperator;
  value: string;
};

export type RuleActionType =
  | "label"
  | "archive"
  | "trash"
  | "mark_read"
  | "mark_unread"
  | "star"
  | "forward"
  | "notify"
  | "ai_reply";

export type RuleAction = {
  type: RuleActionType;
  value?: string; // e.g. label ID for "label" action, email for "forward"
};

export const emailRules = pgTable("email_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  conditions: jsonb("conditions").$type<RuleCondition[]>().notNull(),
  actions: jsonb("actions").$type<RuleAction[]>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailRulesRelations = relations(emailRules, ({ one }) => ({
  connection: one(connections, {
    fields: [emailRules.connectionId],
    references: [connections.id],
  }),
}));

export type EmailRule = typeof emailRules.$inferSelect;
export type NewEmailRule = typeof emailRules.$inferInsert;
