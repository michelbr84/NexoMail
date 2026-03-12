import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { emails, threads, connections } from "@nexomail/db";
import { and, eq, or, gte, count, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const connectionId = new URL(req.url).searchParams.get("connectionId");

    const userConnections = await db.query.connections.findMany({
      where: and(
        eq(connections.userId, session.user.id),
        eq(connections.isActive, true)
      ),
      columns: {
        id: true,
        email: true,
        provider: true,
        displayName: true,
      },
    });

    const ids = connectionId
      ? [connectionId]
      : userConnections.map((c) => c.id);

    if (ids.length === 0) {
      return NextResponse.json({ stats: null });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const emailConnectionFilter =
      ids.length === 1
        ? eq(emails.connectionId, ids[0]!)
        : or(...ids.map((id) => eq(emails.connectionId, id)));

    const threadConnectionFilter =
      ids.length === 1
        ? eq(threads.connectionId, ids[0]!)
        : or(...ids.map((id) => eq(threads.connectionId, id)));

    // Total unread threads (inbox only)
    const [unreadResult] = await db
      .select({ count: count() })
      .from(threads)
      .where(
        and(
          threadConnectionFilter,
          eq(threads.isRead, false),
          eq(threads.isTrashed, false),
          eq(threads.isArchived, false),
          eq(threads.isSpam, false)
        )
      );

    // Total emails received in the last 30 days
    const [totalResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(
        and(
          emailConnectionFilter,
          gte(emails.receivedAt, thirtyDaysAgo)
        )
      );

    // Top senders by email count (last 30 days)
    const topSenders = await db
      .select({
        fromEmail: emails.fromEmail,
        fromName: emails.fromName,
        count: count(),
      })
      .from(emails)
      .where(
        and(
          emailConnectionFilter,
          gte(emails.receivedAt, thirtyDaysAgo)
        )
      )
      .groupBy(emails.fromEmail, emails.fromName)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // Emails received per day (last 7 days) for chart data
    const emailsPerDay = await db
      .select({
        day: sql<string>`date_trunc('day', ${emails.receivedAt})::date`,
        count: count(),
      })
      .from(emails)
      .where(
        and(
          emailConnectionFilter,
          gte(emails.receivedAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`date_trunc('day', ${emails.receivedAt})::date`)
      .orderBy(sql`date_trunc('day', ${emails.receivedAt})::date`);

    // Folder distribution (thread counts per folder)
    const [inboxCount] = await db
      .select({ count: count() })
      .from(threads)
      .where(and(threadConnectionFilter, eq(threads.isArchived, false), eq(threads.isTrashed, false), eq(threads.isSpam, false), eq(threads.isDraft, false), eq(threads.isSent, false)));

    const [archivedCount] = await db
      .select({ count: count() })
      .from(threads)
      .where(and(threadConnectionFilter, eq(threads.isArchived, true)));

    const [spamCount] = await db
      .select({ count: count() })
      .from(threads)
      .where(and(threadConnectionFilter, eq(threads.isSpam, true)));

    const [trashCount] = await db
      .select({ count: count() })
      .from(threads)
      .where(and(threadConnectionFilter, eq(threads.isTrashed, true)));

    return NextResponse.json({
      stats: {
        unread: unreadResult?.count ?? 0,
        total30Days: totalResult?.count ?? 0,
        topSenders,
        emailsPerDay,
        connections: userConnections,
        inbox: inboxCount?.count ?? 0,
        archived: archivedCount?.count ?? 0,
        spam: spamCount?.count ?? 0,
        trash: trashCount?.count ?? 0,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
