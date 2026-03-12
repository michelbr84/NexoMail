import { google, gmail_v1 } from "googleapis";
import type {
  EmailDriver,
  RawEmail,
  SendEmailInput,
  ListEmailsOptions,
  ListEmailsResult,
  SyncResult,
  EmailAttachment,
  EmailRecipient,
} from "../types";
import {
  parseEmailAddress,
  parseAddressList,
  htmlToText,
  extractSnippet,
  parseDate,
  decodeBase64Url,
  decodeBase64UrlBuffer,
} from "../utils/parse";

export interface GmailConnectionData {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

// Gmail system label IDs
const GMAIL_LABELS = {
  INBOX: "INBOX",
  SENT: "SENT",
  DRAFTS: "DRAFT",
  SPAM: "SPAM",
  TRASH: "TRASH",
  UNREAD: "UNREAD",
  STARRED: "STARRED",
} as const;

export class GmailDriver implements EmailDriver {
  private gmail: gmail_v1.Gmail;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private connectionData: GmailConnectionData;

  constructor(data: GmailConnectionData) {
    this.connectionData = data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OAuth2 = google.auth.OAuth2 as any;
    this.oauth2Client = new OAuth2(data.clientId, data.clientSecret);
    this.oauth2Client.setCredentials({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });
    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  // ─── Token refresh ────────────────────────────────────────────────────────

  async refreshToken(): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  }> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    const accessToken = credentials.access_token;
    if (!accessToken) throw new Error("Gmail token refresh returned no access_token");
    this.oauth2Client.setCredentials(credentials);
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);
    return {
      accessToken,
      expiresAt,
      refreshToken: credentials.refresh_token ?? this.connectionData.refreshToken,
    };
  }

  // ─── List emails ──────────────────────────────────────────────────────────

  async listEmails(options: ListEmailsOptions = {}): Promise<ListEmailsResult> {
    const {
      pageToken,
      maxResults = 20,
      labelIds,
      query,
      includeSpamTrash = false,
    } = options;

    const params: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: "me",
      maxResults,
      includeSpamTrash,
    };

    if (pageToken) params.pageToken = pageToken;
    if (labelIds && labelIds.length > 0) params.labelIds = labelIds;
    if (query) params.q = query;

    const listRes = await this.gmail.users.messages.list(params);
    const messages = listRes.data.messages ?? [];
    const nextPageToken = listRes.data.nextPageToken ?? undefined;
    const totalCount = listRes.data.resultSizeEstimate ?? undefined;

    const emails = await Promise.all(
      messages.map((m) => this.getEmail(m.id!))
    );

    return {
      emails: emails.filter((e): e is RawEmail => e !== null),
      nextPageToken,
      totalCount,
    };
  }

  // ─── Get single email ─────────────────────────────────────────────────────

  async getEmail(externalId: string): Promise<RawEmail | null> {
    try {
      const res = await this.gmail.users.messages.get({
        userId: "me",
        id: externalId,
        format: "full",
      });
      return this.parseMessage(res.data);
    } catch (err: unknown) {
      if (isGoogleApiError(err) && err.status === 404) return null;
      throw err;
    }
  }

  // ─── Send email ───────────────────────────────────────────────────────────

  async sendEmail(input: SendEmailInput): Promise<{ externalId: string }> {
    const raw = buildMimeMessage(input);
    const encoded = Buffer.from(raw).toString("base64url");

    const res = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    const id = res.data.id;
    if (!id) throw new Error("Gmail send returned no message ID");
    return { externalId: id };
  }

  // ─── Mark read / unread ───────────────────────────────────────────────────

  async markRead(externalIds: string[], read: boolean): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: {
            addLabelIds: read ? [] : [GMAIL_LABELS.UNREAD],
            removeLabelIds: read ? [GMAIL_LABELS.UNREAD] : [],
          },
        })
      )
    );
  }

  // ─── Mark starred ─────────────────────────────────────────────────────────

  async markStarred(externalIds: string[], starred: boolean): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: {
            addLabelIds: starred ? [GMAIL_LABELS.STARRED] : [],
            removeLabelIds: starred ? [] : [GMAIL_LABELS.STARRED],
          },
        })
      )
    );
  }

  // ─── Trash ────────────────────────────────────────────────────────────────

  async trash(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.trash({ userId: "me", id })
      )
    );
  }

  // ─── Delete forever ───────────────────────────────────────────────────────

  async delete(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.delete({ userId: "me", id })
      )
    );
  }

  // ─── Archive (remove INBOX label) ────────────────────────────────────────

  async archive(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: {
            removeLabelIds: [GMAIL_LABELS.INBOX],
          },
        })
      )
    );
  }

  // ─── Unspam (move out of SPAM to INBOX) ──────────────────────────────────

  async unspam(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: {
            addLabelIds: [GMAIL_LABELS.INBOX],
            removeLabelIds: [GMAIL_LABELS.SPAM],
          },
        })
      )
    );
  }

  // ─── Add label ────────────────────────────────────────────────────────────

  async addLabel(externalIds: string[], labelId: string): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: { addLabelIds: [labelId] },
        })
      )
    );
  }

  // ─── Remove label ─────────────────────────────────────────────────────────

  async removeLabel(externalIds: string[], labelId: string): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: { removeLabelIds: [labelId] },
        })
      )
    );
  }

  // ─── Incremental sync ─────────────────────────────────────────────────────

  async syncEmails(cursor?: string): Promise<SyncResult> {
    if (!cursor) {
      // Full initial sync — return the 50 most recent inbox messages
      const result = await this.listEmails({
        maxResults: 50,
        labelIds: [GMAIL_LABELS.INBOX],
      });
      // Retrieve the current history ID to use as next cursor
      const profile = await this.gmail.users.getProfile({ userId: "me" });
      const newCursor = profile.data.historyId ?? undefined;
      return {
        added: result.emails,
        updated: [],
        deleted: [],
        newCursor,
      };
    }

    // Incremental sync using history API
    const added: RawEmail[] = [];
    const updatedIds = new Set<string>();
    const deletedIds = new Set<string>();

    let pageToken: string | undefined;

    do {
      const historyRes = await this.gmail.users.history.list({
        userId: "me",
        startHistoryId: cursor,
        historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
        pageToken,
      });

      const history = historyRes.data.history ?? [];

      for (const record of history) {
        // Messages added
        for (const ma of record.messagesAdded ?? []) {
          const id = ma.message?.id;
          if (id) {
            const email = await this.getEmail(id);
            if (email) added.push(email);
          }
        }

        // Messages deleted
        for (const md of record.messagesDeleted ?? []) {
          const id = md.message?.id;
          if (id) deletedIds.add(id);
        }

        // Label changes = updated
        for (const la of record.labelsAdded ?? []) {
          const id = la.message?.id;
          if (id && !deletedIds.has(id)) updatedIds.add(id);
        }
        for (const lr of record.labelsRemoved ?? []) {
          const id = lr.message?.id;
          if (id && !deletedIds.has(id)) updatedIds.add(id);
        }
      }

      pageToken = historyRes.data.nextPageToken ?? undefined;
    } while (pageToken);

    const profile = await this.gmail.users.getProfile({ userId: "me" });
    const newCursor = profile.data.historyId ?? cursor;

    // Remove added IDs from updatedIds (they're already in added)
    const addedIds = new Set(added.map((e) => e.externalId));
    for (const id of addedIds) updatedIds.delete(id);

    return {
      added,
      updated: Array.from(updatedIds),
      deleted: Array.from(deletedIds),
      newCursor,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private parseMessage(msg: gmail_v1.Schema$Message): RawEmail {
    const headers = msg.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    const labelIds = msg.labelIds ?? [];

    const fromRaw = getHeader("From");
    const fromParsed = parseEmailAddress(fromRaw);

    const toRaw = getHeader("To");
    const ccRaw = getHeader("Cc");
    const bccRaw = getHeader("Bcc");

    const toRecipients: EmailRecipient[] = parseAddressList(toRaw);
    const ccRecipients: EmailRecipient[] = parseAddressList(ccRaw);
    const bccRecipients: EmailRecipient[] = parseAddressList(bccRaw);

    // Parse body parts recursively
    const { bodyText, bodyHtml, attachments } = extractParts(msg.payload);

    const snippet = msg.snippet ?? extractSnippet(bodyText ?? bodyHtml ?? "");
    const sentAtRaw = getHeader("Date");
    const sentAt = parseDate(sentAtRaw) ?? undefined;
    const receivedAt =
      msg.internalDate ? new Date(Number(msg.internalDate)) : sentAt;

    return {
      externalId: msg.id!,
      messageId: getHeader("Message-ID") || undefined,
      threadExternalId: msg.threadId ?? undefined,
      inReplyTo: getHeader("In-Reply-To") || undefined,
      references: getHeader("References") || undefined,
      subject: getHeader("Subject") || undefined,
      fromEmail: fromParsed.email,
      fromName: fromParsed.name,
      toRecipients,
      ccRecipients,
      bccRecipients,
      bodyText: bodyText || undefined,
      bodyHtml: bodyHtml || undefined,
      snippet,
      attachments,
      isRead: !labelIds.includes(GMAIL_LABELS.UNREAD),
      isStarred: labelIds.includes(GMAIL_LABELS.STARRED),
      isDraft: labelIds.includes(GMAIL_LABELS.DRAFTS),
      isSent: labelIds.includes(GMAIL_LABELS.SENT),
      labels: labelIds,
      sentAt,
      receivedAt,
    };
  }
}

// ─── MIME parsing helpers ────────────────────────────────────────────────────

interface ParsedParts {
  bodyText?: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
}

function extractParts(payload: gmail_v1.Schema$MessagePart | undefined): ParsedParts {
  const result: ParsedParts = { attachments: [] };
  if (!payload) return result;
  traversePart(payload, result);
  return result;
}

function traversePart(part: gmail_v1.Schema$MessagePart, acc: ParsedParts): void {
  const mimeType = part.mimeType ?? "";
  const filename = part.filename;

  // Attachment
  if (filename && filename.length > 0 && part.body?.attachmentId) {
    acc.attachments.push({
      name: filename,
      mimeType,
      size: part.body.size ?? 0,
      attachmentId: part.body.attachmentId,
    });
    return;
  }

  if (mimeType === "text/plain" && !acc.bodyText) {
    const data = part.body?.data;
    if (data) acc.bodyText = decodeBase64Url(data);
  } else if (mimeType === "text/html" && !acc.bodyHtml) {
    const data = part.body?.data;
    if (data) acc.bodyHtml = decodeBase64Url(data);
  } else if (mimeType.startsWith("multipart/")) {
    for (const sub of part.parts ?? []) {
      traversePart(sub, acc);
    }
  } else if (mimeType === "message/rfc822") {
    // Embedded message
    for (const sub of part.parts ?? []) {
      traversePart(sub, acc);
    }
  }
}

// ─── MIME message builder ────────────────────────────────────────────────────

function formatRecipients(list: EmailRecipient[]): string {
  return list
    .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
    .join(", ");
}

function buildMimeMessage(input: SendEmailInput): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [];

  lines.push(`To: ${formatRecipients(input.to)}`);
  if (input.cc.length > 0) lines.push(`Cc: ${formatRecipients(input.cc)}`);
  if (input.bcc.length > 0) lines.push(`Bcc: ${formatRecipients(input.bcc)}`);
  lines.push(`Subject: ${input.subject}`);
  if (input.inReplyTo) lines.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) lines.push(`References: ${input.references}`);
  lines.push(`MIME-Version: 1.0`);

  const hasAttachments = input.attachments.length > 0;
  const outerBoundary = hasAttachments
    ? `outer_${boundary}`
    : null;

  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${outerBoundary}"`);
    lines.push("");
    lines.push(`--${outerBoundary}`);
  }

  // Body parts
  if (input.bodyText && input.bodyHtml) {
    const altBoundary = `alt_${boundary}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    lines.push("");
    lines.push(`--${altBoundary}`);
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: quoted-printable`);
    lines.push("");
    lines.push(input.bodyText);
    lines.push(`--${altBoundary}`);
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: quoted-printable`);
    lines.push("");
    lines.push(input.bodyHtml);
    lines.push(`--${altBoundary}--`);
  } else if (input.bodyHtml) {
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: quoted-printable`);
    lines.push("");
    lines.push(input.bodyHtml);
  } else {
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: quoted-printable`);
    lines.push("");
    lines.push(input.bodyText ?? "");
  }

  // Attachments
  if (hasAttachments) {
    for (const att of input.attachments) {
      lines.push(`--${outerBoundary}`);
      lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push(`Content-Transfer-Encoding: base64`);
      lines.push("");
      lines.push(att.content.toString("base64"));
    }
    lines.push(`--${outerBoundary}--`);
  }

  return lines.join("\r\n");
}

// ─── Type guard ───────────────────────────────────────────────────────────────

function isGoogleApiError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as Record<string, unknown>).status === "number"
  );
}
