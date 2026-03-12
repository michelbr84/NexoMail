import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { labels, connections } from "@nexomail/db";
import { eq, and, or, asc } from "drizzle-orm";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const connectionId = new URL(req.url).searchParams.get("connectionId");

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
      return NextResponse.json({ labels: [] });
    }

    const result = await db.query.labels.findMany({
      where:
        ids.length === 1
          ? eq(labels.connectionId, ids[0]!)
          : or(...ids.map((id) => eq(labels.connectionId, id))),
      orderBy: [asc(labels.name)],
    });

    return NextResponse.json({ labels: result });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

const createLabelSchema = z.object({
  connectionId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { connectionId, name, color } = createLabelSchema.parse(body);

    // Verify the connection belongs to the current user
    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, connectionId),
        eq(connections.userId, session.user.id)
      ),
    });

    if (!connection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [label] = await db
      .insert(labels)
      .values({
        connectionId,
        name,
        color: color ?? null,
        isSystem: false,
        type: "user",
      })
      .returning();

    return NextResponse.json({ label }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    throw err;
  }
}
