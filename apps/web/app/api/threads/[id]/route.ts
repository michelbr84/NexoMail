import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { emails, threads } from "@nexomail/db";
import { eq, asc } from "drizzle-orm";
import { createDriver } from "@/lib/driver-factory";
import type { ConnectionRow } from "@/lib/driver-factory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: {
        connection: {
          columns: {
            userId: true,
            email: true,
            provider: true,
            displayName: true,
          },
        },
        emails: {
          orderBy: [asc(emails.sentAt)],
        },
        threadLabels: {
          with: { label: { columns: { id: true, name: true, color: true } } },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (thread.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark all emails in this thread as read
    await db
      .update(emails)
      .set({ isRead: true })
      .where(eq(emails.threadId, id));

    await db
      .update(threads)
      .set({ isRead: true })
      .where(eq(threads.id, id));

    // Return thread with all emails marked read
    const threadWithRead = {
      ...thread,
      isRead: true,
      emails: thread.emails.map((e) => ({ ...e, isRead: true })),
      labels: thread.threadLabels.map((tl: any) => tl.label),
      threadLabels: undefined,
    };

    return NextResponse.json({ thread: threadWithRead });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();

    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: {
        connection: true,
        emails: { columns: { id: true, externalId: true } },
      },
    });

    if (!thread || thread.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const threadUpdates: {
      isRead?: boolean;
      isStarred?: boolean;
      isArchived?: boolean;
      isTrashed?: boolean;
      isSpam?: boolean;
    } = {};

    const emailUpdates: {
      isRead?: boolean;
      isStarred?: boolean;
      isArchived?: boolean;
      isTrashed?: boolean;
    } = {};

    if (typeof body.isRead === "boolean") {
      threadUpdates.isRead = body.isRead;
      emailUpdates.isRead = body.isRead;
    }
    if (typeof body.isStarred === "boolean") {
      threadUpdates.isStarred = body.isStarred;
      emailUpdates.isStarred = body.isStarred;
    }
    if (typeof body.isArchived === "boolean") {
      threadUpdates.isArchived = body.isArchived;
      emailUpdates.isArchived = body.isArchived;
    }
    if (typeof body.isTrashed === "boolean") {
      threadUpdates.isTrashed = body.isTrashed;
      emailUpdates.isTrashed = body.isTrashed;
    }
    if (typeof body.isSpam === "boolean") {
      threadUpdates.isSpam = body.isSpam;
    }

    if (Object.keys(threadUpdates).length > 0) {
      await db.update(threads).set(threadUpdates).where(eq(threads.id, id));
    }

    if (Object.keys(emailUpdates).length > 0) {
      await db
        .update(emails)
        .set(emailUpdates)
        .where(eq(emails.threadId, id));
    }

    // Sync to provider (best-effort, non-fatal)
    try {
      const driver = createDriver(thread.connection as ConnectionRow);
      const externalIds = thread.emails.map((e) => e.externalId);

      if (externalIds.length > 0) {
        if (typeof body.isArchived === "boolean" && body.isArchived) {
          await driver.archive(externalIds).catch(() => {});
        }
        if (typeof body.isTrashed === "boolean" && body.isTrashed) {
          await driver.trash(externalIds).catch(() => {});
        }
        if (typeof body.isStarred === "boolean") {
          await driver.markStarred(externalIds, body.isStarred).catch(() => {});
        }
        if (typeof body.isRead === "boolean") {
          await driver.markRead(externalIds, body.isRead).catch(() => {});
        }
      }
    } catch {
      // Driver errors are non-fatal — DB already updated
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
