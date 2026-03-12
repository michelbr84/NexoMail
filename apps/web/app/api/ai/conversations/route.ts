import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { aiConversations, aiMessages } from "@nexomail/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await requireSession();
  const convos = await db.query.aiConversations.findMany({
    where: eq(aiConversations.userId, session.user.id),
    orderBy: [desc(aiConversations.updatedAt)],
    limit: 20,
  });
  return NextResponse.json({ conversations: convos });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { title, connectionId } = await req.json();

  const [convo] = await db
    .insert(aiConversations)
    .values({
      userId: session.user.id,
      connectionId: connectionId ?? null,
      title: title ?? "Nova conversa",
    })
    .returning();

  return NextResponse.json({ conversation: convo }, { status: 201 });
}
