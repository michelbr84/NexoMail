import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { threads, connections } from "@nexomail/db";
import { and, eq, or, ilike, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const connectionId = searchParams.get("connectionId");

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const userConnections = await db.query.connections.findMany({
      where: and(
        eq(connections.userId, session.user.id),
        eq(connections.isActive, true)
      ),
      columns: { id: true },
    });

    const ids = connectionId
      ? [connectionId]
      : userConnections.map((c) => c.id);

    if (ids.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const connectionFilter =
      ids.length === 1
        ? eq(threads.connectionId, ids[0]!)
        : or(...ids.map((id) => eq(threads.connectionId, id)));

    const results = await db.query.threads.findMany({
      where: and(
        connectionFilter,
        or(
          ilike(threads.subject, `%${q}%`),
          ilike(threads.snippet, `%${q}%`),
          ilike(threads.from, `%${q}%`)
        )
      ),
      orderBy: [desc(threads.lastMessageAt)],
      limit: 30,
      with: {
        connection: {
          columns: {
            email: true,
            provider: true,
          },
        },
      },
    });

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
