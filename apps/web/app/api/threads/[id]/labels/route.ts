import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { threads, threadLabels, labels } from "@nexomail/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// GET /api/threads/[id]/labels — list labels on a thread
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: { connection: { columns: { userId: true } } },
    });

    if (!thread || thread.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await db.query.threadLabels.findMany({
      where: eq(threadLabels.threadId, id),
      with: { label: true },
    });

    return NextResponse.json({ labels: rows.map((r) => r.label) });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

// POST /api/threads/[id]/labels — add a label to a thread
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { labelId } = z.object({ labelId: z.string().uuid() }).parse(await req.json());

    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: { connection: { columns: { userId: true } } },
    });

    if (!thread || thread.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify label belongs to user
    const label = await db.query.labels.findFirst({
      where: eq(labels.id, labelId),
      with: { connection: { columns: { userId: true } } },
    });

    if (!label || label.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    await db
      .insert(threadLabels)
      .values({ threadId: id, labelId })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
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

// DELETE /api/threads/[id]/labels — remove a label from a thread
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { labelId } = z.object({ labelId: z.string().uuid() }).parse(await req.json());

    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: { connection: { columns: { userId: true } } },
    });

    if (!thread || thread.connection.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .delete(threadLabels)
      .where(and(eq(threadLabels.threadId, id), eq(threadLabels.labelId, labelId)));

    return NextResponse.json({ success: true });
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
