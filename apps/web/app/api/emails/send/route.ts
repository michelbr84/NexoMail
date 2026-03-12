import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections } from "@nexomail/db";
import { eq, and } from "drizzle-orm";
import { createDriver } from "@/lib/driver-factory";
import type { ConnectionRow } from "@/lib/driver-factory";
import { z } from "zod";

const recipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const sendSchema = z.object({
  connectionId: z.string().uuid(),
  to: z.array(recipientSchema).min(1),
  cc: z.array(recipientSchema).optional().default([]),
  bcc: z.array(recipientSchema).optional().default([]),
  subject: z.string(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = sendSchema.parse(body);

    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, data.connectionId),
        eq(connections.userId, session.user.id)
      ),
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    const driver = createDriver(connection as ConnectionRow);

    // Auto-refresh token if expired
    if (
      driver.refreshToken &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt < new Date(Date.now() + 60 * 1000)
    ) {
      try {
        const refreshed = await driver.refreshToken();
        const { encrypt } = await import("@nexomail/email");
        await db.update(connections).set({
          accessToken: encrypt(refreshed.accessToken),
          ...(refreshed.refreshToken ? { refreshToken: encrypt(refreshed.refreshToken) } : {}),
          tokenExpiresAt: refreshed.expiresAt,
          updatedAt: new Date(),
        }).where(eq(connections.id, data.connectionId));
      } catch {
        return NextResponse.json(
          { error: "Token refresh failed — please reconnect your account in Settings" },
          { status: 401 }
        );
      }
    }

    const result = await driver.sendEmail({
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
      inReplyTo: data.inReplyTo,
      references: data.references,
      attachments: [],
    });

    return NextResponse.json({ success: true, externalId: result.externalId });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("[send] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
