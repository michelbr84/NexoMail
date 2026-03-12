import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { generateReply } from "@nexomail/ai";
import { z } from "zod";

const schema = z.object({
  instructions: z.string().min(1),
  originalSubject: z.string().optional().default(""),
  originalFrom: z.string().optional().default(""),
  originalBody: z.string().optional().default(""),
  tone: z
    .enum(["professional", "friendly", "brief", "detailed"])
    .optional()
    .default("professional"),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = schema.parse(await req.json());

    const draft = await generateReply({
      originalSubject: body.originalSubject,
      originalFrom: body.originalFrom,
      originalBody: body.originalBody,
      instructions: body.instructions,
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[ai/compose] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao gerar rascunho" },
      { status: 500 },
    );
  }
}
