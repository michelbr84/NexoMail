import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { threads, connections, threadLabels } from "@nexomail/db";
import { and, eq, desc, ilike, or, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const connectionId = searchParams.get("connectionId");
    const folder = searchParams.get("folder") ?? "inbox";
    const labelId = searchParams.get("labelId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const q = searchParams.get("q");
    const offset = (page - 1) * limit;

    // Get all active connections for this user
    const userConnections = await db.query.connections.findMany({
      where: and(
        eq(connections.userId, session.user.id),
        eq(connections.isActive, true)
      ),
      columns: { id: true },
    });

    const connectionIds = connectionId
      ? [connectionId]
      : userConnections.map((c) => c.id);

    if (connectionIds.length === 0) {
      return NextResponse.json({ threads: [], total: 0, page, pages: 0 });
    }

    // If filtering by label, get matching thread IDs first
    if (labelId) {
      const labeled = await db.query.threadLabels.findMany({
        where: eq(threadLabels.labelId, labelId),
        columns: { threadId: true },
      });
      const labeledThreadIds = labeled.map((tl) => tl.threadId);

      if (labeledThreadIds.length === 0) {
        return NextResponse.json({ threads: [], page });
      }

      const connectionFilter =
        connectionIds.length === 1
          ? eq(threads.connectionId, connectionIds[0]!)
          : or(...connectionIds.map((id) => eq(threads.connectionId, id)));

      const results = await db.query.threads.findMany({
        where: and(
          connectionFilter,
          inArray(threads.id, labeledThreadIds),
          q
            ? or(
                ilike(threads.subject, `%${q}%`),
                ilike(threads.snippet, `%${q}%`),
                ilike(threads.from, `%${q}%`)
              )
            : undefined
        ),
        orderBy: [desc(threads.lastMessageAt)],
        limit,
        offset,
        with: {
          connection: { columns: { email: true, provider: true, displayName: true } },
          threadLabels: { with: { label: { columns: { id: true, name: true, color: true } } } },
        },
      });

      const threadsWithLabels = results.map((t) => ({
        ...t,
        labels: t.threadLabels.map((tl: any) => tl.label),
        threadLabels: undefined,
      }));

      return NextResponse.json({ threads: threadsWithLabels, page });
    }

    // Build folder-specific filter conditions
    const folderCondition = () => {
      switch (folder) {
        case "inbox":
          return and(
            eq(threads.isArchived, false),
            eq(threads.isTrashed, false),
            eq(threads.isSpam, false),
            eq(threads.isDraft, false),
            eq(threads.isSent, false)
          );
        case "drafts":
          return eq(threads.isDraft, true);
        case "trash":
          return eq(threads.isTrashed, true);
        case "spam":
          return eq(threads.isSpam, true);
        case "starred":
          return eq(threads.isStarred, true);
        case "sent":
          return eq(threads.isSent, true);
        case "archived":
          return eq(threads.isArchived, true);
        default:
          return and(
            eq(threads.isArchived, false),
            eq(threads.isTrashed, false)
          );
      }
    };

    const connectionFilter =
      connectionIds.length === 1
        ? eq(threads.connectionId, connectionIds[0]!)
        : or(...connectionIds.map((id) => eq(threads.connectionId, id)));

    const searchFilter = q
      ? or(
          ilike(threads.subject, `%${q}%`),
          ilike(threads.snippet, `%${q}%`),
          ilike(threads.from, `%${q}%`)
        )
      : undefined;

    const results = await db.query.threads.findMany({
      where: and(connectionFilter, folderCondition(), searchFilter),
      orderBy: [desc(threads.lastMessageAt)],
      limit,
      offset,
      with: {
        connection: {
          columns: {
            email: true,
            provider: true,
            displayName: true,
          },
        },
        threadLabels: {
          with: { label: { columns: { id: true, name: true, color: true } } },
        },
      },
    });

    const threadsWithLabels = results.map((t) => ({
      ...t,
      labels: t.threadLabels.map((tl: any) => tl.label),
      threadLabels: undefined,
    }));

    return NextResponse.json({ threads: threadsWithLabels, page });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
