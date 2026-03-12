import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections } from "@nexomail/db";
import { eq } from "drizzle-orm";
import { encrypt } from "@nexomail/email";
import { z } from "zod";

export async function GET() {
  try {
    const session = await requireSession();

    const userConnections = await db.query.connections.findMany({
      where: eq(connections.userId, session.user.id),
      columns: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        // Sensitive credential fields are intentionally excluded (not listed)
      },
    });

    return NextResponse.json({ connections: userConnections });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

const imapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  imapHost: z.string().min(1),
  imapPort: z.number().default(993),
  smtpHost: z.string().min(1),
  smtpPort: z.number().default(587),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = imapSchema.parse(body);

    const [conn] = await db
      .insert(connections)
      .values({
        userId: session.user.id,
        provider: "imap",
        email: data.email,
        displayName: data.displayName ?? data.email,
        imapHost: data.imapHost,
        imapPort: String(data.imapPort),
        smtpHost: data.smtpHost,
        smtpPort: String(data.smtpPort),
        imapPassword: encrypt(data.password),
        isActive: true,
      })
      .returning({
        id: connections.id,
        email: connections.email,
        provider: connections.provider,
      });

    return NextResponse.json({ connection: conn }, { status: 201 });
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
