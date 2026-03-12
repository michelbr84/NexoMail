import type {
  RawEmail,
  SendEmailInput,
  ListEmailsOptions,
  ListEmailsResult,
  SyncResult,
} from "./types";

/**
 * Abstract interface that all email providers must implement.
 * Concrete implementations: GmailDriver, OutlookDriver, ImapDriver.
 */
export interface EmailDriver {
  /**
   * List emails with optional filtering and pagination.
   */
  listEmails(options?: ListEmailsOptions): Promise<ListEmailsResult>;

  /**
   * Fetch a single email by its provider-specific external ID.
   */
  getEmail(externalId: string): Promise<RawEmail | null>;

  /**
   * Send an email and return the provider's message ID.
   */
  sendEmail(input: SendEmailInput): Promise<{ externalId: string }>;

  /**
   * Perform an incremental sync using provider history/delta.
   * @param cursor - The last known sync cursor (history ID / delta link)
   */
  syncEmails(cursor?: string): Promise<SyncResult>;

  /**
   * Mark one or more emails as read/unread.
   */
  markRead(externalIds: string[], read: boolean): Promise<void>;

  /**
   * Star or un-star one or more emails.
   */
  markStarred(externalIds: string[], starred: boolean): Promise<void>;

  /**
   * Move emails to trash.
   */
  trash(externalIds: string[]): Promise<void>;

  /**
   * Permanently delete emails (must already be in trash for most providers).
   */
  delete(externalIds: string[]): Promise<void>;

  /**
   * Archive emails (remove from inbox without deleting).
   */
  archive(externalIds: string[]): Promise<void>;

  /**
   * Move emails out of spam.
   */
  unspam(externalIds: string[]): Promise<void>;

  /**
   * Apply a provider label to emails.
   */
  addLabel(externalIds: string[], labelId: string): Promise<void>;

  /**
   * Remove a provider label from emails.
   */
  removeLabel(externalIds: string[], labelId: string): Promise<void>;

  /**
   * Refresh OAuth access token. Returns the new access token and expiry.
   * Only applicable to OAuth providers (Gmail, Outlook).
   */
  refreshToken?(): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  }>;
}
