import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections, emails, threads } from "@nexomail/db";
import { eq, and, sql } from "drizzle-orm";
import { createDriver } from "@/lib/driver-factory";
import type { ConnectionRow } from "@/lib/driver-factory";
import type { RawEmail } from "@nexomail/email";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { connectionId } = await req.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, connectionId),
        eq(connections.userId, session.user.id)
      ),
    });

    if (!connection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const driver = createDriver(connection as ConnectionRow);

    // Auto-refresh token if expired (needed for Outlook; Gmail handles it internally)
    if (
      driver.refreshToken &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt < new Date(Date.now() + 60 * 1000) // refresh if expires within 60s
    ) {
      try {
        const refreshed = await driver.refreshToken();
        const { encrypt } = await import("@nexomail/email");
        await db.update(connections).set({
          accessToken: encrypt(refreshed.accessToken),
          ...(refreshed.refreshToken ? { refreshToken: encrypt(refreshed.refreshToken) } : {}),
          tokenExpiresAt: refreshed.expiresAt,
          updatedAt: new Date(),
        }).where(eq(connections.id, connectionId));
      } catch (refreshErr) {
        console.error("[sync] Token refresh failed:", refreshErr);
        return NextResponse.json(
          { error: "Token refresh failed — please reconnect your account" },
          { status: 401 }
        );
      }
    }

    const result = await driver.syncEmails(
      connection.historyId ?? connection.syncCursor ?? undefined
    );

    let savedCount = 0;

    // Persist newly added emails
    for (const rawEmail of result.added) {
      try {
        await upsertEmailAndThread(connection.id, rawEmail);
        savedCount++;
      } catch (err) {
        console.error("[sync] Failed to save email", rawEmail.externalId, err);
      }
    }

    // Handle deletions — mark trashed in DB
    if (result.deleted.length > 0) {
      for (const externalId of result.deleted) {
        await db
          .update(emails)
          .set({ isTrashed: true })
          .where(
            and(
              eq(emails.externalId, externalId),
              eq(emails.connectionId, connection.id)
            )
          );
      }
    }

    // Update sync cursor
    await db
      .update(connections)
      .set({
        lastSyncAt: new Date(),
        historyId: result.newCursor ?? null,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, connectionId));

    return NextResponse.json({
      synced: savedCount,
      deleted: result.deleted.length,
      updated: result.updated.length,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[sync] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

async function upsertEmailAndThread(
  connectionId: string,
  rawEmail: RawEmail
): Promise<void> {
  // Upsert the parent thread first
  const threadExternalId = rawEmail.threadExternalId ?? rawEmail.externalId;
  const fromDisplay =
    rawEmail.fromName
      ? `${rawEmail.fromName} <${rawEmail.fromEmail}>`
      : rawEmail.fromEmail;

  const [thread] = await db
    .insert(threads)
    .values({
      connectionId,
      externalId: threadExternalId,
      subject: rawEmail.subject ?? null,
      snippet: rawEmail.snippet ?? null,
      from: fromDisplay,
      isRead: rawEmail.isRead,
      isStarred: rawEmail.isStarred,
      isDraft: rawEmail.isDraft,
      isSent: rawEmail.isSent,
      lastMessageAt: rawEmail.receivedAt ?? rawEmail.sentAt ?? new Date(),
    })
    .onConflictDoUpdate({
      target: [threads.externalId, threads.connectionId],
      set: {
        snippet: rawEmail.snippet ?? null,
        // A thread stays in inbox (isSent=false) if ANY of its messages is inbox.
        // Only mark as sent if BOTH the existing record AND new message are sent.
        isSent: sql`${threads.isSent} AND EXCLUDED.is_sent`,
        lastMessageAt: rawEmail.receivedAt ?? rawEmail.sentAt ?? new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: threads.id });

  if (!thread) return;

  // Upsert the individual email
  await db
    .insert(emails)
    .values({
      connectionId,
      threadId: thread.id,
      externalId: rawEmail.externalId,
      messageId: rawEmail.messageId ?? null,
      inReplyTo: rawEmail.inReplyTo ?? null,
      references: rawEmail.references ?? null,
      subject: rawEmail.subject ?? null,
      fromEmail: rawEmail.fromEmail,
      fromName: rawEmail.fromName ?? null,
      toRecipients: rawEmail.toRecipients,
      ccRecipients: rawEmail.ccRecipients,
      bccRecipients: rawEmail.bccRecipients,
      bodyText: rawEmail.bodyText ?? null,
      bodyHtml: rawEmail.bodyHtml ?? null,
      snippet: rawEmail.snippet ?? null,
      attachments: rawEmail.attachments,
      isRead: rawEmail.isRead,
      isStarred: rawEmail.isStarred,
      isDraft: rawEmail.isDraft,
      isSent: rawEmail.isSent,
      isArchived: false,
      isTrashed: false,
      isSpam: false,
      sentAt: rawEmail.sentAt ?? null,
      receivedAt: rawEmail.receivedAt ?? new Date(),
    })
    .onConflictDoNothing();
}
