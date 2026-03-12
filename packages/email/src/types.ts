import { z } from "zod";
export type { EmailDriver } from "./driver";

export const EmailRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});
export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;

export const EmailAttachmentSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  attachmentId: z.string(),
  content: z.instanceof(Buffer).optional(),
});
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;

export const RawEmailSchema = z.object({
  externalId: z.string(),
  messageId: z.string().optional(),
  threadExternalId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
  subject: z.string().optional(),
  fromEmail: z.string(),
  fromName: z.string().optional(),
  toRecipients: z.array(EmailRecipientSchema),
  ccRecipients: z.array(EmailRecipientSchema).default([]),
  bccRecipients: z.array(EmailRecipientSchema).default([]),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  snippet: z.string().optional(),
  attachments: z.array(EmailAttachmentSchema).default([]),
  isRead: z.boolean().default(false),
  isStarred: z.boolean().default(false),
  isDraft: z.boolean().default(false),
  isSent: z.boolean().default(false),
  labels: z.array(z.string()).default([]),
  sentAt: z.date().optional(),
  receivedAt: z.date().optional(),
});
export type RawEmail = z.infer<typeof RawEmailSchema>;

export const SendEmailSchema = z.object({
  to: z.array(EmailRecipientSchema).min(1),
  cc: z.array(EmailRecipientSchema).default([]),
  bcc: z.array(EmailRecipientSchema).default([]),
  subject: z.string(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.instanceof(Buffer),
        contentType: z.string(),
      })
    )
    .default([]),
});
export type SendEmailInput = z.infer<typeof SendEmailSchema>;

export interface ListEmailsOptions {
  pageToken?: string;
  maxResults?: number;
  labelIds?: string[];
  query?: string;
  includeSpamTrash?: boolean;
}

export interface ListEmailsResult {
  emails: RawEmail[];
  nextPageToken?: string;
  totalCount?: number;
}

export interface SyncResult {
  added: RawEmail[];
  updated: string[]; // external IDs of updated emails
  deleted: string[]; // external IDs of deleted emails
  newCursor?: string;
}
