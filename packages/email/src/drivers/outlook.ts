import { Client } from "@microsoft/microsoft-graph-client";
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

export interface OutlookConnectionData {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tenantId?: string; // defaults to "common"
}

// Well-known folder name → Graph folder path mapping
const OUTLOOK_FOLDERS: Record<string, string> = {
  inbox: "inbox",
  sent: "sentitems",
  drafts: "drafts",
  trash: "deleteditems",
  spam: "junkemail",
  archive: "archive",
};

// ─── Graph API response shape shims ──────────────────────────────────────────

interface GraphRecipient {
  emailAddress: { name?: string; address: string };
}

interface GraphMessage {
  id: string;
  internetMessageId?: string;
  conversationId?: string;
  subject?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  bccRecipients?: GraphRecipient[];
  body?: { contentType: "text" | "html" | string; content: string };
  bodyPreview?: string;
  isRead?: boolean;
  isDraft?: boolean;
  isFlagged?: boolean; // flag.flagStatus === "flagged"
  flag?: { flagStatus: "flagged" | "notFlagged" | "complete" };
  internetMessageHeaders?: Array<{ name: string; value: string }>;
  categories?: string[];
  sentDateTime?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
  attachments?: GraphAttachment[];
  // Folder info
  parentFolderId?: string;
}

interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string; // base64
}

interface GraphDeltaResponse {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

// ─── Token refresh (uses fetch — no extra dep needed) ────────────────────────

async function refreshOutlookToken(data: OutlookConnectionData): Promise<{
  accessToken: string;
  expiresAt: Date;
  refreshToken: string;
}> {
  const tenant = data.tenantId ?? "common";
  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: data.clientId,
    client_secret: data.clientSecret,
    refresh_token: data.refreshToken,
    grant_type: "refresh_token",
    scope: "https://graph.microsoft.com/.default offline_access",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook token refresh failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
  return {
    accessToken: json.access_token,
    expiresAt,
    refreshToken: json.refresh_token ?? data.refreshToken,
  };
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export class OutlookDriver implements EmailDriver {
  private client: Client;
  private connectionData: OutlookConnectionData;

  constructor(data: OutlookConnectionData) {
    this.connectionData = data;
    this.client = OutlookDriver.buildClient(data.accessToken);
  }

  private static buildClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done: (error: unknown, accessToken: string | null) => void) => {
        done(null, accessToken);
      },
    });
  }

  // ─── Token refresh ──────────────────────────────────────────────────────

  async refreshToken(): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  }> {
    const result = await refreshOutlookToken(this.connectionData);
    // Rebuild client with new token
    this.client = OutlookDriver.buildClient(result.accessToken);
    this.connectionData = {
      ...this.connectionData,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
    return result;
  }

  // ─── List emails ─────────────────────────────────────────────────────────

  async listEmails(options: ListEmailsOptions = {}): Promise<ListEmailsResult> {
    const {
      pageToken,
      maxResults = 20,
      labelIds,
      query,
      includeSpamTrash = false,
    } = options;

    // Determine folder — use first labelId as folder hint, default to inbox
    const folderHint = labelIds?.[0]?.toLowerCase() ?? "inbox";
    const folder = OUTLOOK_FOLDERS[folderHint] ?? folderHint;

    let req = this.client
      .api(`/me/mailFolders/${folder}/messages`)
      .top(maxResults)
      .select(
        "id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,bodyPreview,body,isRead,isDraft,flag,categories,sentDateTime,receivedDateTime,hasAttachments,parentFolderId,internetMessageHeaders"
      )
      .orderby("receivedDateTime desc");

    if (query) {
      req = req.filter(`contains(subject,'${escapeOdata(query)}') or contains(from/emailAddress/address,'${escapeOdata(query)}')`);
    }

    if (!includeSpamTrash) {
      // Already scoped to specific folder so nothing extra needed
    }

    if (pageToken) {
      // pageToken is the $skip value encoded as a string
      const skip = parseInt(pageToken, 10);
      if (!isNaN(skip)) req = req.skip(skip);
    }

    const res = (await req.get()) as { value: GraphMessage[]; "@odata.count"?: number };
    const messages: GraphMessage[] = res.value ?? [];

    const emails = await Promise.all(
      messages.map((m) => this.parseGraphMessage(m, folder))
    );

    const currentSkip = pageToken ? parseInt(pageToken, 10) : 0;
    const nextSkip = (isNaN(currentSkip) ? 0 : currentSkip) + messages.length;
    const totalCount = res["@odata.count"] ?? undefined;
    const hasMore = totalCount !== undefined ? nextSkip < totalCount : messages.length === maxResults;

    return {
      emails,
      nextPageToken: hasMore ? String(nextSkip) : undefined,
      totalCount,
    };
  }

  // ─── Get single email ────────────────────────────────────────────────────

  async getEmail(externalId: string): Promise<RawEmail | null> {
    try {
      const msg = (await this.client
        .api(`/me/messages/${externalId}`)
        .select(
          "id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,body,bodyPreview,isRead,isDraft,flag,categories,sentDateTime,receivedDateTime,hasAttachments,attachments,parentFolderId,internetMessageHeaders"
        )
        .expand("attachments")
        .get()) as GraphMessage;
      return this.parseGraphMessage(msg, undefined);
    } catch (err: unknown) {
      if (isGraphError(err) && err.statusCode === 404) return null;
      throw err;
    }
  }

  // ─── Send email ──────────────────────────────────────────────────────────

  async sendEmail(input: SendEmailInput): Promise<{ externalId: string }> {
    const message = buildGraphMessage(input);

    // If there are attachments, create as draft first then send
    if (input.attachments.length > 0) {
      const draft = (await this.client
        .api("/me/messages")
        .post(message)) as GraphMessage;

      // Upload attachments
      await Promise.all(
        input.attachments.map((att) =>
          this.client.api(`/me/messages/${draft.id}/attachments`).post({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: att.filename,
            contentType: att.contentType,
            contentBytes: att.content.toString("base64"),
          })
        )
      );

      // Send the draft
      await this.client.api(`/me/messages/${draft.id}/send`).post({});
      return { externalId: draft.id! };
    }

    // No attachments — send directly
    await this.client.api("/me/sendMail").post({ message, saveToSentItems: true });

    // Retrieve the sent message ID from Sent Items
    const sentRes = (await this.client
      .api("/me/mailFolders/sentitems/messages")
      .top(1)
      .select("id")
      .orderby("sentDateTime desc")
      .get()) as { value: Array<{ id: string }> };

    const externalId = sentRes.value[0]?.id ?? "unknown";
    return { externalId };
  }

  // ─── Mark read / unread ──────────────────────────────────────────────────

  async markRead(externalIds: string[], read: boolean): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.client.api(`/me/messages/${id}`).patch({ isRead: read })
      )
    );
  }

  // ─── Mark starred ────────────────────────────────────────────────────────

  async markStarred(externalIds: string[], starred: boolean): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.client.api(`/me/messages/${id}`).patch({
          flag: { flagStatus: starred ? "flagged" : "notFlagged" },
        })
      )
    );
  }

  // ─── Trash ───────────────────────────────────────────────────────────────

  async trash(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.client.api(`/me/messages/${id}/move`).post({
          destinationId: "deleteditems",
        })
      )
    );
  }

  // ─── Delete forever ──────────────────────────────────────────────────────

  async delete(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) => this.client.api(`/me/messages/${id}`).delete())
    );
  }

  // ─── Archive ─────────────────────────────────────────────────────────────

  async archive(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.client.api(`/me/messages/${id}/move`).post({
          destinationId: "archive",
        })
      )
    );
  }

  // ─── Unspam ──────────────────────────────────────────────────────────────

  async unspam(externalIds: string[]): Promise<void> {
    await Promise.all(
      externalIds.map((id) =>
        this.client.api(`/me/messages/${id}/move`).post({
          destinationId: "inbox",
        })
      )
    );
  }

  // ─── Add label (category) ────────────────────────────────────────────────

  async addLabel(externalIds: string[], labelId: string): Promise<void> {
    // Outlook uses categories as labels
    await Promise.all(
      externalIds.map(async (id) => {
        const msg = (await this.client
          .api(`/me/messages/${id}`)
          .select("categories")
          .get()) as { categories: string[] };
        const categories = Array.from(new Set([...(msg.categories ?? []), labelId]));
        await this.client.api(`/me/messages/${id}`).patch({ categories });
      })
    );
  }

  // ─── Remove label (category) ─────────────────────────────────────────────

  async removeLabel(externalIds: string[], labelId: string): Promise<void> {
    await Promise.all(
      externalIds.map(async (id) => {
        const msg = (await this.client
          .api(`/me/messages/${id}`)
          .select("categories")
          .get()) as { categories: string[] };
        const categories = (msg.categories ?? []).filter((c) => c !== labelId);
        await this.client.api(`/me/messages/${id}`).patch({ categories });
      })
    );
  }

  // ─── Delta (incremental) sync ─────────────────────────────────────────────

  async syncEmails(cursor?: string): Promise<SyncResult> {
    const added: RawEmail[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

    let url: string;

    if (cursor) {
      // cursor is the deltaLink URL from a previous sync
      url = cursor;
    } else {
      // Start a fresh delta query on the inbox
      url = "/me/mailFolders/inbox/messages/delta?$select=id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,body,bodyPreview,isRead,isDraft,flag,categories,sentDateTime,receivedDateTime,hasAttachments,parentFolderId";
    }

    let newCursor: string | undefined;

    while (url) {
      const res = (await this.client.api(url).get()) as GraphDeltaResponse;

      for (const item of res.value ?? []) {
        // Deleted items have @removed annotation
        if ((item as unknown as Record<string, unknown>)["@removed"]) {
          deleted.push(item.id);
        } else if (cursor) {
          // During incremental sync, items are updates
          updated.push(item.id);
        } else {
          // Initial sync — all items are new
          const email = await this.parseGraphMessage(item, "inbox");
          added.push(email);
        }
      }

      if (res["@odata.deltaLink"]) {
        newCursor = res["@odata.deltaLink"];
        break;
      }
      url = res["@odata.nextLink"] ?? "";
    }

    // On initial sync (no cursor), also fetch recent sent items
    if (!cursor) {
      try {
        const sentResult = await this.listEmails({ maxResults: 50, labelIds: ["sent"] });
        for (const e of sentResult.emails) added.push(e);
      } catch (err) {
        console.error("[outlook] Failed to fetch sent items during initial sync:", err);
      }
    }

    return { added, updated, deleted, newCursor };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async parseGraphMessage(msg: GraphMessage, sourceFolderName?: string): Promise<RawEmail> {
    const fromEmail = msg.from?.emailAddress.address ?? "";
    const fromName = msg.from?.emailAddress.name;

    const toRecipients: EmailRecipient[] = (msg.toRecipients ?? []).map(
      graphRecipientToRecipient
    );
    const ccRecipients: EmailRecipient[] = (msg.ccRecipients ?? []).map(
      graphRecipientToRecipient
    );
    const bccRecipients: EmailRecipient[] = (msg.bccRecipients ?? []).map(
      graphRecipientToRecipient
    );

    const bodyContent = msg.body?.content ?? "";
    const isHtml = (msg.body?.contentType ?? "").toLowerCase() === "html";
    const bodyHtml = isHtml ? bodyContent : undefined;
    const bodyText = isHtml ? htmlToText(bodyContent) : bodyContent;

    const snippet = msg.bodyPreview ?? extractSnippet(bodyText ?? "");

    // Determine folder flags
    // parentFolderId is a GUID, not a readable name — use sourceFolderName passed from the call site
    const isSent = sourceFolderName === "sent" || sourceFolderName === "sentitems";
    const isDraft = msg.isDraft ?? false;

    // Parse internet message headers for threading
    const headers = msg.internetMessageHeaders ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

    // Parse attachments
    const attachments: EmailAttachment[] = (msg.attachments ?? []).map((a) => ({
      name: a.name,
      mimeType: a.contentType,
      size: a.size,
      attachmentId: a.id,
      content: a.contentBytes ? Buffer.from(a.contentBytes, "base64") : undefined,
    }));

    // Build label list from categories + folder info
    const labels: string[] = [...(msg.categories ?? [])];
    if (msg.parentFolderId) labels.push(msg.parentFolderId);

    return {
      externalId: msg.id,
      messageId: msg.internetMessageId ?? getHeader("Message-ID"),
      threadExternalId: msg.conversationId ?? undefined,
      inReplyTo: getHeader("In-Reply-To"),
      references: getHeader("References"),
      subject: msg.subject ?? undefined,
      fromEmail,
      fromName,
      toRecipients,
      ccRecipients,
      bccRecipients,
      bodyText: bodyText || undefined,
      bodyHtml,
      snippet,
      attachments,
      isRead: msg.isRead ?? false,
      isStarred: msg.flag?.flagStatus === "flagged",
      isDraft,
      isSent,
      labels,
      sentAt: parseDate(msg.sentDateTime) ?? undefined,
      receivedAt: parseDate(msg.receivedDateTime) ?? undefined,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function graphRecipientToRecipient(r: GraphRecipient): EmailRecipient {
  return {
    email: r.emailAddress.address,
    name: r.emailAddress.name || undefined,
  };
}

function buildGraphMessage(input: SendEmailInput): Record<string, unknown> {
  const toRecipients = input.to.map(recipientToGraph);
  const ccRecipients = input.cc.map(recipientToGraph);
  const bccRecipients = input.bcc.map(recipientToGraph);

  const bodyContent = input.bodyHtml ?? input.bodyText ?? "";
  const contentType = input.bodyHtml ? "html" : "text";

  return {
    subject: input.subject,
    body: { contentType, content: bodyContent },
    toRecipients,
    ccRecipients,
    bccRecipients,
    ...(input.inReplyTo
      ? {
          internetMessageHeaders: [
            { name: "In-Reply-To", value: input.inReplyTo },
            ...(input.references
              ? [{ name: "References", value: input.references }]
              : []),
          ],
        }
      : {}),
  };
}

function recipientToGraph(r: EmailRecipient): GraphRecipient {
  return { emailAddress: { address: r.email, name: r.name } };
}

function escapeOdata(value: string): string {
  return value.replace(/'/g, "''");
}

function isGraphError(err: unknown): err is { statusCode: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as Record<string, unknown>).statusCode === "number"
  );
}
