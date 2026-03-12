import { ImapFlow, FetchMessageObject, FetchQueryObject } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser, ParsedMail } from "mailparser";
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
  htmlToText,
  extractSnippet,
  parseDate,
} from "../utils/parse";

export interface ImapConnectionData {
  email: string;
  /** Already-decrypted IMAP password */
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  /** Default true — use TLS for IMAP */
  tls?: boolean;
  /** Default true — use TLS/STARTTLS for SMTP */
  smtpTls?: boolean;
}

// Folder name mappings (provider-agnostic → common IMAP folder names)
const FOLDER_MAP: Record<string, string[]> = {
  inbox: ["INBOX"],
  sent: ["Sent", "Sent Items", "Sent Messages", "[Gmail]/Sent Mail"],
  drafts: ["Drafts", "[Gmail]/Drafts"],
  trash: ["Trash", "Deleted Items", "Deleted Messages", "[Gmail]/Trash"],
  spam: ["Spam", "Junk", "Junk Email", "[Gmail]/Spam"],
};

export class ImapDriver implements EmailDriver {
  private config: ImapConnectionData;

  constructor(data: ImapConnectionData) {
    this.config = data;
  }

  // ─── Connection helper ──────────────────────────────────────────────────

  private async withClient<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
    const client = new ImapFlow({
      host: this.config.imapHost,
      port: this.config.imapPort,
      secure: this.config.tls ?? true,
      auth: {
        user: this.config.email,
        pass: this.config.password,
      },
      logger: false,
    });

    await client.connect();
    try {
      return await fn(client);
    } finally {
      try {
        await client.logout();
      } catch {
        // ignore logout errors
      }
    }
  }

  // ─── Resolve folder name ─────────────────────────────────────────────────

  private async resolveFolder(
    client: ImapFlow,
    folderHint: string
  ): Promise<string> {
    const hint = folderHint.toLowerCase();
    const candidates = FOLDER_MAP[hint] ?? [folderHint];

    // Try to list mailboxes and find a match
    const mailboxes = client.listTree ? await client.listTree() : null;
    if (mailboxes) {
      const flatten = (tree: ReturnType<typeof client.listTree> extends Promise<infer T> ? T : never): string[] => {
        const items: string[] = [];
        function walk(node: unknown): void {
          if (!node || typeof node !== "object") return;
          // @ts-expect-error
          if (node.path) items.push(node.path as string);
          // @ts-expect-error
          for (const child of node.folders ?? node.children ?? []) walk(child);
        }
        walk(tree);
        return items;
      };
      const allFolders = flatten(mailboxes as never);
      for (const candidate of candidates) {
        const found = allFolders.find(
          (f) => f.toLowerCase() === candidate.toLowerCase()
        );
        if (found) return found;
      }
    }

    return candidates[0] ?? "INBOX";
  }

  // ─── List emails ─────────────────────────────────────────────────────────

  async listEmails(options: ListEmailsOptions = {}): Promise<ListEmailsResult> {
    const {
      pageToken,
      maxResults = 20,
      labelIds,
      query,
    } = options;

    const folderHint = labelIds?.[0] ?? "INBOX";

    return this.withClient(async (client) => {
      const folder = await this.resolveFolder(client, folderHint);
      const lock = await client.getMailboxLock(folder);

      try {
        const totalMessages = (client.mailbox as { exists?: number })?.exists ?? 0;

        if (totalMessages === 0) {
          return { emails: [], totalCount: 0 };
        }

        // Calculate sequence range for pagination
        const page = pageToken ? parseInt(pageToken, 10) : 0;
        const offset = page * maxResults;

        // IMAP sequences are 1-based; we want newest first
        const end = Math.max(1, totalMessages - offset);
        const start = Math.max(1, end - maxResults + 1);

        const fetchQuery: FetchQueryObject = {
          envelope: true,
          flags: true,
          bodyStructure: true,
          uid: true,
          source: false,
        };

        const emails: RawEmail[] = [];
        const seqRange = `${start}:${end}`;

        for await (const msg of client.fetch(seqRange, fetchQuery)) {
          // Fetch the full RFC 822 source for proper parsing
          const fullMsg = await client.fetchOne(String(msg.seq), {
            source: true,
            flags: true,
            uid: true,
          });

          if (!fullMsg || !('source' in fullMsg) || !fullMsg.source) continue;
          const safeFullMsg = fullMsg as FetchMessageObject;

          // Filter by query if provided
          const parsed = await parseImapMessage(safeFullMsg, msg);
          if (query) {
            const q = query.toLowerCase();
            const matches =
              parsed.subject?.toLowerCase().includes(q) ||
              parsed.fromEmail.toLowerCase().includes(q) ||
              parsed.bodyText?.toLowerCase().includes(q) ||
              parsed.snippet?.toLowerCase().includes(q);
            if (!matches) continue;
          }

          emails.push(parsed);
        }

        // Reverse so newest is first (we fetched start→end)
        emails.reverse();

        const hasMore = start > 1;
        const nextPage = hasMore ? String(page + 1) : undefined;

        return {
          emails,
          nextPageToken: nextPage,
          totalCount: totalMessages,
        };
      } finally {
        lock.release();
      }
    });
  }

  // ─── Get single email ─────────────────────────────────────────────────────

  async getEmail(externalId: string): Promise<RawEmail | null> {
    return this.withClient(async (client) => {
      // externalId format: "FOLDER:UID"
      const { folder, uid } = parseExternalId(externalId);
      const lock = await client.getMailboxLock(folder);

      try {
        const msg = await client.fetchOne(`${uid}`, {
          source: true,
          flags: true,
          uid: true,
        }, { uid: true });

        if (!msg || !msg.source) return null;

        return parseImapMessage(msg, msg);
      } catch {
        return null;
      } finally {
        lock.release();
      }
    });
  }

  // ─── Send email ───────────────────────────────────────────────────────────

  async sendEmail(input: SendEmailInput): Promise<{ externalId: string }> {
    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpTls ?? (this.config.smtpPort === 465),
      auth: {
        user: this.config.email,
        pass: this.config.password,
      },
    });

    const attachments = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    }));

    const info = await transporter.sendMail({
      from: this.config.email,
      to: input.to.map(formatAddr).join(", "),
      cc: input.cc.length > 0 ? input.cc.map(formatAddr).join(", ") : undefined,
      bcc: input.bcc.length > 0 ? input.bcc.map(formatAddr).join(", ") : undefined,
      subject: input.subject,
      text: input.bodyText,
      html: input.bodyHtml,
      inReplyTo: input.inReplyTo,
      references: input.references,
      attachments,
    });

    return { externalId: info.messageId ?? "unknown" };
  }

  // ─── Mark read / unread ───────────────────────────────────────────────────

  async markRead(externalIds: string[], read: boolean): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      if (read) {
        await client.messageFlagsAdd(uids.join(","), ["\\Seen"], { uid: true });
      } else {
        await client.messageFlagsRemove(uids.join(","), ["\\Seen"], { uid: true });
      }
    });
  }

  // ─── Mark starred ─────────────────────────────────────────────────────────

  async markStarred(externalIds: string[], starred: boolean): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      if (starred) {
        await client.messageFlagsAdd(uids.join(","), ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsRemove(uids.join(","), ["\\Flagged"], { uid: true });
      }
    });
  }

  // ─── Trash ────────────────────────────────────────────────────────────────

  async trash(externalIds: string[]): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      const trashFolder = await this.resolveFolder(client, "trash");
      await client.messageMove(uids.join(","), trashFolder, { uid: true });
    });
  }

  // ─── Delete forever ───────────────────────────────────────────────────────

  async delete(externalIds: string[]): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      await client.messageFlagsAdd(uids.join(","), ["\\Deleted"], { uid: true });
      await client.mailboxClose();
    });
  }

  // ─── Archive ─────────────────────────────────────────────────────────────

  async archive(externalIds: string[]): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      const archiveFolder = await this.resolveFolder(client, "archive");
      await client.messageMove(uids.join(","), archiveFolder, { uid: true });
    });
  }

  // ─── Unspam ───────────────────────────────────────────────────────────────

  async unspam(externalIds: string[]): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      const inboxFolder = await this.resolveFolder(client, "inbox");
      await client.messageMove(uids.join(","), inboxFolder, { uid: true });
    });
  }

  // ─── Add label (IMAP keyword flag) ───────────────────────────────────────

  async addLabel(externalIds: string[], labelId: string): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      await client.messageFlagsAdd(uids.join(","), [labelId], { uid: true });
    });
  }

  // ─── Remove label ─────────────────────────────────────────────────────────

  async removeLabel(externalIds: string[], labelId: string): Promise<void> {
    await this.batchModify(externalIds, async (client, folder, uids) => {
      await client.messageFlagsRemove(uids.join(","), [labelId], { uid: true });
    });
  }

  // ─── Incremental sync (IMAP UIDVALIDITY + UIDNEXT cursor) ────────────────

  async syncEmails(cursor?: string): Promise<SyncResult> {
    return this.withClient(async (client) => {
      const folder = "INBOX";
      const lock = await client.getMailboxLock(folder);

      try {
        const mailbox = client.mailbox as {
          uidValidity?: bigint | number;
          uidNext?: number;
          exists?: number;
        };

        const uidValidity = String(mailbox.uidValidity ?? "0");
        const uidNext = mailbox.uidNext ?? 1;

        if (!cursor) {
          // Full initial sync — fetch last 50 messages
          const totalMessages = mailbox.exists ?? 0;
          const start = Math.max(1, totalMessages - 49);
          const emails: RawEmail[] = [];

          for await (const msg of client.fetch(`${start}:*`, {
            source: false,
            flags: true,
            uid: true,
          })) {
            const fullMsg = await client.fetchOne(String(msg.seq), {
              source: true,
              flags: true,
              uid: true,
            });
            if (fullMsg && fullMsg.source) {
              const parsed = await parseImapMessage(fullMsg as FetchMessageObject, fullMsg as FetchMessageObject);
              emails.push(parsed);
            }
          }

          return {
            added: emails,
            updated: [],
            deleted: [],
            newCursor: `${uidValidity}:${uidNext}`,
          };
        }

        // Parse cursor
        const [savedUidValidity, savedUidNextStr] = cursor.split(":");
        const savedUidNext = parseInt(savedUidNextStr ?? "1", 10);

        // If UIDVALIDITY changed, we must do a full resync
        if (savedUidValidity !== uidValidity) {
          return this.syncEmails(undefined);
        }

        if (savedUidNext >= uidNext) {
          // No new messages
          return {
            added: [],
            updated: [],
            deleted: [],
            newCursor: cursor,
          };
        }

        // Fetch messages with UID >= savedUidNext
        const added: RawEmail[] = [];
        const uidRange = `${savedUidNext}:${uidNext - 1}`;

        for await (const msg of client.fetch(uidRange, {
          source: false,
          flags: true,
          uid: true,
        }, { uid: true })) {
          const fullMsg = await client.fetchOne(String(msg.seq), {
            source: true,
            flags: true,
            uid: true,
          });
          if (fullMsg && fullMsg.source) {
            const parsed = await parseImapMessage(fullMsg as FetchMessageObject, fullMsg as FetchMessageObject);
            added.push(parsed);
          }
        }

        return {
          added,
          updated: [],
          deleted: [],
          newCursor: `${uidValidity}:${uidNext}`,
        };
      } finally {
        lock.release();
      }
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async batchModify(
    externalIds: string[],
    fn: (client: ImapFlow, folder: string, uids: number[]) => Promise<void>
  ): Promise<void> {
    // Group by folder
    const byFolder = new Map<string, number[]>();
    for (const id of externalIds) {
      const { folder, uid } = parseExternalId(id);
      const list = byFolder.get(folder) ?? [];
      list.push(uid);
      byFolder.set(folder, list);
    }

    await this.withClient(async (client) => {
      for (const [folder, uids] of byFolder) {
        const lock = await client.getMailboxLock(folder);
        try {
          await fn(client, folder, uids);
        } finally {
          lock.release();
        }
      }
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAddr(r: EmailRecipient): string {
  return r.name ? `${r.name} <${r.email}>` : r.email;
}

function buildExternalId(folder: string, uid: number): string {
  return `${folder}:${uid}`;
}

function parseExternalId(id: string): { folder: string; uid: number } {
  const lastColon = id.lastIndexOf(":");
  if (lastColon === -1) return { folder: "INBOX", uid: parseInt(id, 10) };
  const folder = id.slice(0, lastColon);
  const uid = parseInt(id.slice(lastColon + 1), 10);
  return { folder, uid: isNaN(uid) ? 0 : uid };
}

async function parseImapMessage(
  msg: FetchMessageObject,
  seqMsg: FetchMessageObject
): Promise<RawEmail> {
  let parsed: ParsedMail;

  if (msg.source) {
    parsed = await simpleParser(msg.source);
  } else {
    // Fallback: build minimal from envelope
    parsed = {
      messageId: "",
      subject: msg.envelope?.subject ?? undefined,
      from: msg.envelope?.from?.[0]
        ? { value: [{ address: msg.envelope.from[0].address, name: msg.envelope.from[0].name }], text: "" }
        : undefined,
      to: msg.envelope?.to
        ? { value: msg.envelope.to.map((a) => ({ address: a.address, name: a.name })), text: "" }
        : undefined,
      date: msg.envelope?.date ?? undefined,
      text: undefined,
      html: undefined as string | false | null | undefined,
      attachments: [],
      headerLines: [],
      headers: new Map(),
    } as unknown as ParsedMail;
  }

  const flags = (seqMsg.flags ?? new Set<string>()) as Set<string>;
  const isRead = flags.has("\\Seen");
  const isStarred = flags.has("\\Flagged");
  const isDraft = flags.has("\\Draft");

  const folder = "INBOX"; // default; callers that know the folder override this
  const uid = (seqMsg as FetchMessageObject & { uid?: number }).uid ?? 0;
  const externalId = buildExternalId(folder, uid);

  // Resolve recipients
  const toRecipients: EmailRecipient[] = addressesToRecipients(parsed.to as AddressInput);
  const ccRecipients: EmailRecipient[] = addressesToRecipients(parsed.cc as AddressInput);
  const bccRecipients: EmailRecipient[] = addressesToRecipients(parsed.bcc as AddressInput);

  const fromAddr = Array.isArray(parsed.from?.value)
    ? parsed.from!.value[0]
    : undefined;
  const fromEmail = fromAddr?.address ?? "";
  const fromName = fromAddr?.name || undefined;

  const bodyText =
    typeof parsed.text === "string" && parsed.text.trim()
      ? parsed.text
      : parsed.html
      ? htmlToText(parsed.html as string)
      : undefined;
  const bodyHtml =
    parsed.html && typeof parsed.html === "string" ? parsed.html : undefined;

  const snippet = extractSnippet(bodyText ?? bodyHtml ?? "");

  const attachments: EmailAttachment[] = (parsed.attachments ?? [])
    .filter((a) => a.contentDisposition === "attachment")
    .map((a) => ({
      name: a.filename ?? "attachment",
      mimeType: a.contentType,
      size: a.size,
      attachmentId: a.checksum ?? `${uid}-${a.filename ?? "file"}`,
      content: a.content,
    }));

  // Build label list from keyword flags
  const labels: string[] = [];
  for (const flag of flags) {
    if (!flag.startsWith("\\")) labels.push(flag);
  }

  return {
    externalId,
    messageId: parsed.messageId ?? undefined,
    threadExternalId: parsed.messageId ?? undefined,
    inReplyTo: Array.isArray(parsed.inReplyTo)
      ? (parsed.inReplyTo as string[]).join(" ")
      : parsed.inReplyTo ?? undefined,
    references:
      Array.isArray(parsed.references)
        ? (parsed.references as string[]).join(" ")
        : typeof parsed.references === "string"
        ? parsed.references
        : undefined,
    subject: parsed.subject ?? undefined,
    fromEmail,
    fromName,
    toRecipients,
    ccRecipients,
    bccRecipients,
    bodyText,
    bodyHtml,
    snippet,
    attachments,
    isRead,
    isStarred,
    isDraft,
    isSent: false, // INBOX assumption; override when opening Sent folder
    labels,
    sentAt: parsed.date instanceof Date ? parsed.date : (parsed.date ? parseDate(String(parsed.date)) ?? undefined : undefined),
    receivedAt: parsed.date instanceof Date ? parsed.date : undefined,
  };
}

type AddressInput =
  | { value: Array<{ address?: string; name?: string }> }
  | undefined
  | null;

function addressesToRecipients(addr: AddressInput): EmailRecipient[] {
  if (!addr) return [];
  return (addr.value ?? [])
    .filter((a) => !!a.address)
    .map((a) => ({ email: a.address!, name: a.name || undefined }));
}
