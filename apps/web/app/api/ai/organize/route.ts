import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections, threads, labels, threadLabels } from "@nexomail/db";
import { and, eq, or, isNull, desc } from "drizzle-orm";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY não configurada." },
        { status: 503 }
      );
    }

    // Get user connections
    const userConnections = await db.query.connections.findMany({
      where: and(
        eq(connections.userId, session.user.id),
        eq(connections.isActive, true)
      ),
      columns: { id: true, email: true },
    });

    if (userConnections.length === 0) {
      return NextResponse.json({ error: "Nenhuma conta conectada" }, { status: 400 });
    }

    const connectionIds = userConnections.map((c) => c.id);
    const connectionFilter =
      connectionIds.length === 1
        ? eq(threads.connectionId, connectionIds[0]!)
        : or(...connectionIds.map((id) => eq(threads.connectionId, id)));

    // Fetch recent inbox threads (last 30, unarchived, not trashed)
    const recentThreads = await db.query.threads.findMany({
      where: and(
        connectionFilter,
        eq(threads.isArchived, false),
        eq(threads.isTrashed, false),
        eq(threads.isSpam, false),
        eq(threads.isDraft, false),
        eq(threads.isSent, false)
      ),
      orderBy: [desc(threads.lastMessageAt)],
      limit: 30,
      with: {
        threadLabels: {
          with: { label: { columns: { id: true, name: true } } },
        },
      },
    });

    // Only process threads that have NO labels yet
    const unlabeledThreads = recentThreads.filter(
      (t) => (t.threadLabels?.length ?? 0) === 0
    );

    if (unlabeledThreads.length === 0) {
      return NextResponse.json({
        summary: "Todos os emails recentes já têm labels.",
        labeled: 0,
        created: 0,
      });
    }

    // Get existing user labels
    const existingLabels = await db.query.labels.findMany({
      where:
        connectionIds.length === 1
          ? eq(labels.connectionId, connectionIds[0]!)
          : or(...connectionIds.map((id) => eq(labels.connectionId, id))),
      columns: { id: true, name: true, color: true },
    });

    // Prepare email summary for AI
    const emailList = unlabeledThreads.map((t, i) => ({
      index: i,
      subject: t.subject ?? "(sem assunto)",
      from: t.from ?? "",
      snippet: (t.snippet ?? "").slice(0, 120),
    }));

    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const prompt = `You are an email organizer. Analyze these ${emailList.length} emails and assign ONE label to each.

Existing labels: ${existingLabels.map((l) => l.name).join(", ") || "none"}

Emails to classify:
${emailList.map((e) => `[${e.index}] From: ${e.from} | Subject: ${e.subject} | Preview: ${e.snippet}`).join("\n")}

Rules:
1. Reuse existing labels when appropriate (case-insensitive match).
2. Create new labels only when no existing label fits well.
3. Use concise, descriptive label names (max 20 chars).
4. Return ONLY valid JSON — no markdown, no explanation.
5. Use common categories like: Trabalho, Pessoal, Finanças, Newsletters, Promoções, Notificações, Social, Suporte, Compras, Viagem.

Return JSON array with exactly ${emailList.length} objects:
[{"index": 0, "labelName": "...", "color": "#hex_or_null"}, ...]`;

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      temperature: 0.2,
      maxTokens: 1000,
    });

    // Parse AI response
    let assignments: Array<{ index: number; labelName: string; color?: string }> = [];
    try {
      const cleaned = text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
      assignments = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Falha ao processar resposta da IA" },
        { status: 500 }
      );
    }

    // Build label cache (name -> id)
    const labelCache = new Map<string, string>(
      existingLabels.map((l) => [l.name.toLowerCase(), l.id])
    );
    const newLabelsCreated: string[] = [];

    let labeled = 0;

    for (const assignment of assignments) {
      const thread = unlabeledThreads[assignment.index];
      if (!thread) continue;

      const normalizedName = assignment.labelName?.trim();
      if (!normalizedName) continue;

      let labelId = labelCache.get(normalizedName.toLowerCase());

      // Create label if it doesn't exist
      if (!labelId) {
        const targetConnectionId = thread.connectionId;
        const color = assignment.color ?? randomColor();

        const [newLabel] = await db
          .insert(labels)
          .values({
            connectionId: targetConnectionId,
            name: normalizedName,
            color,
            isSystem: false,
            type: "user",
          })
          .returning({ id: labels.id });

        if (newLabel) {
          labelId = newLabel.id;
          labelCache.set(normalizedName.toLowerCase(), labelId);
          newLabelsCreated.push(normalizedName);
        }
      }

      if (labelId) {
        await db
          .insert(threadLabels)
          .values({ threadId: thread.id, labelId })
          .onConflictDoNothing();
        labeled++;
      }
    }

    const summary = newLabelsCreated.length > 0
      ? `${labeled} emails rotulados. ${newLabelsCreated.length} nova(s) label(s) criada(s): ${newLabelsCreated.join(", ")}.`
      : `${labeled} emails rotulados com labels existentes.`;

    return NextResponse.json({
      summary,
      labeled,
      created: newLabelsCreated.length,
      newLabels: newLabelsCreated,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[ai/organize] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899",
  "#14b8a6", "#64748b",
];

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#6366f1";
}
