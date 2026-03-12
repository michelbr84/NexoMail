import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@nexomail/db/schema";
import { and, eq, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  const { id } = await params;

  const convo = await db.query.aiConversations.findFirst({
    where: and(
      eq(aiConversations.id, id),
      eq(aiConversations.userId, session.user.id),
    ),
  });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msgs = await db.query.aiMessages.findMany({
    where: eq(aiMessages.conversationId, id),
    orderBy: [asc(aiMessages.createdAt)],
  });

  return NextResponse.json({ conversation: convo, messages: msgs });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  const { id } = await params;

  await db
    .delete(aiConversations)
    .where(
      and(
        eq(aiConversations.id, id),
        eq(aiConversations.userId, session.user.id),
      ),
    );

  return NextResponse.json({ success: true });
}
