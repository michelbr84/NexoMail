import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { emails } from "@nexomail/db";
import { eq } from "drizzle-orm";
import { createDriver } from "@/lib/driver-factory";
import type { ConnectionRow } from "@/lib/driver-factory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const email = await db.query.emails.findFirst({
      where: eq(emails.id, id),
      with: { connection: true },
    });

    if (!email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (email.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark as read if not already, and sync to provider
    if (!email.isRead) {
      await db.update(emails).set({ isRead: true }).where(eq(emails.id, id));
      try {
        const driver = createDriver(email.connection as ConnectionRow);
        await driver.markRead([email.externalId], true);
      } catch {
        // Driver sync failure is non-fatal
      }
    }

    return NextResponse.json({ email: { ...email, isRead: true } });
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

    const email = await db.query.emails.findFirst({
      where: eq(emails.id, id),
      with: { connection: true },
    });

    if (!email || email.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const driver = createDriver(email.connection as ConnectionRow);

    const updates: {
      isRead?: boolean;
      isStarred?: boolean;
      isArchived?: boolean;
      isTrashed?: boolean;
    } = {};

    if (typeof body.isRead === "boolean") {
      updates.isRead = body.isRead;
      await driver.markRead([email.externalId], body.isRead).catch(() => {});
    }

    if (typeof body.isStarred === "boolean") {
      updates.isStarred = body.isStarred;
      await driver
        .markStarred([email.externalId], body.isStarred)
        .catch(() => {});
    }

    if (typeof body.isArchived === "boolean") {
      updates.isArchived = body.isArchived;
      if (body.isArchived) {
        await driver.archive([email.externalId]).catch(() => {});
      }
    }

    if (typeof body.isTrashed === "boolean") {
      updates.isTrashed = body.isTrashed;
      if (body.isTrashed) {
        await driver.trash([email.externalId]).catch(() => {});
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(emails).set(updates).where(eq(emails.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const email = await db.query.emails.findFirst({
      where: eq(emails.id, id),
      with: { connection: true },
    });

    if (!email || email.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const driver = createDriver(email.connection as ConnectionRow);
    await driver.trash([email.externalId]).catch(() => {});
    await db
      .update(emails)
      .set({ isTrashed: true })
      .where(eq(emails.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
