import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections, threads, emails, labels, aiMessages } from "@nexomail/db/schema";
import { and, eq, or, ilike, desc, count, sql, gte } from "drizzle-orm";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, convertToCoreMessages, tool } from "ai";
import { z } from "zod";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Safe OR filter — returns sql`false` when the array is empty to avoid Drizzle throwing
function connectionFilter(ids: string[], col: Parameters<typeof eq>[0]) {
  if (ids.length === 0) return sql`false`;
  if (ids.length === 1) return eq(col, ids[0]!);
  return or(...ids.map((id) => eq(col, id)));
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { messages, connectionId, conversationId } = await req.json();

    const userConnections = await db.query.connections.findMany({
      where: and(eq(connections.userId, session.user.id), eq(connections.isActive, true)),
      columns: { id: true, email: true, provider: true, displayName: true },
    });

    const connectionIds = connectionId
      ? [connectionId]
      : userConnections.map((c) => c.id);

    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const toolsWithImpl = {
      search_emails: tool({
        description: "Search emails by query, sender, subject, folder, or date range",
        parameters: z.object({
          query: z.string().optional(),
          from: z.string().optional(),
          folder: z
            .enum(["inbox", "sent", "drafts", "trash", "spam", "archived", "starred"])
            .optional(),
          limit: z.number().default(20),
        }),
        execute: async ({ query, from, folder, limit }) => {
          const folderFilter = () => {
            if (!folder || folder === "inbox")
              return and(
                eq(threads.isArchived, false),
                eq(threads.isTrashed, false),
                eq(threads.isSpam, false),
                eq(threads.isDraft, false),
                eq(threads.isSent, false),
              );
            if (folder === "sent") return eq(threads.isSent, true);
            if (folder === "trash") return eq(threads.isTrashed, true);
            if (folder === "spam") return eq(threads.isSpam, true);
            if (folder === "archived") return eq(threads.isArchived, true);
            if (folder === "starred") return eq(threads.isStarred, true);
            if (folder === "drafts") return eq(threads.isDraft, true);
            return undefined;
          };

          const results = await db.query.threads.findMany({
            where: and(
              connectionFilter(connectionIds, threads.connectionId),
              folderFilter(),
              query
                ? or(
                    ilike(threads.subject, `%${query}%`),
                    ilike(threads.snippet, `%${query}%`),
                    ilike(threads.from, `%${query}%`),
                  )
                : undefined,
              from ? ilike(threads.from, `%${from}%`) : undefined,
            ),
            orderBy: [desc(threads.lastMessageAt)],
            limit,
            with: { connection: { columns: { email: true } } },
          });

          return {
            count: results.length,
            emails: results.map((t) => ({
              id: t.id,
              subject: t.subject,
              from: t.from,
              snippet: t.snippet,
              isRead: t.isRead,
              isStarred: t.isStarred,
              date: t.lastMessageAt,
              account: t.connection.email,
            })),
          };
        },
      }),

      mark_read: tool({
        description: "Mark emails as read or unread",
        parameters: z.object({
          threadIds: z.array(z.string()),
          read: z.boolean(),
        }),
        execute: async ({ threadIds, read }) => {
          for (const id of threadIds) {
            const thread = await db.query.threads.findFirst({
              where: and(
                eq(threads.id, id),
                connectionFilter(connectionIds, threads.connectionId),
              ),
            });
            if (thread) {
              await db.update(threads).set({ isRead: read }).where(eq(threads.id, id));
              await db.update(emails).set({ isRead: read }).where(eq(emails.threadId, id));
            }
          }
          return { success: true, updated: threadIds.length };
        },
      }),

      archive_emails: tool({
        description: "Archive emails (remove from inbox without deleting)",
        parameters: z.object({ threadIds: z.array(z.string()) }),
        execute: async ({ threadIds }) => {
          for (const id of threadIds) {
            await db.update(threads).set({ isArchived: true }).where(
              and(
                eq(threads.id, id),
                connectionFilter(connectionIds, threads.connectionId),
              ),
            );
          }
          return { success: true, archived: threadIds.length };
        },
      }),

      move_to_trash: tool({
        description: "Move emails to trash",
        parameters: z.object({ threadIds: z.array(z.string()) }),
        execute: async ({ threadIds }) => {
          for (const id of threadIds) {
            await db.update(threads).set({ isTrashed: true }).where(
              and(
                eq(threads.id, id),
                connectionFilter(connectionIds, threads.connectionId),
              ),
            );
          }
          return { success: true, trashed: threadIds.length };
        },
      }),

      create_label: tool({
        description: "Create a new label or folder",
        parameters: z.object({
          name: z.string(),
          color: z.string().optional(),
          connectionId: z.string().optional(),
        }),
        execute: async ({ name, color, connectionId: cid }) => {
          const targetConnectionId = cid ?? connectionIds[0];
          if (!targetConnectionId) return { error: "No connection available" };

          const [label] = await db
            .insert(labels)
            .values({
              connectionId: targetConnectionId,
              name,
              color: color ?? "#6366f1",
              isSystem: false,
            })
            .returning({ id: labels.id, name: labels.name });

          return { success: true, label };
        },
      }),

      list_labels: tool({
        description: "List all labels and folders",
        parameters: z.object({}),
        execute: async () => {
          const result = await db.query.labels.findMany({
            where: connectionFilter(connectionIds, labels.connectionId),
            orderBy: (l, { asc }) => [asc(l.name)],
          });
          return {
            labels: result.map((l) => ({
              id: l.id,
              name: l.name,
              color: l.color,
              isSystem: l.isSystem,
            })),
          };
        },
      }),

      get_stats: tool({
        description: "Get email statistics: unread count, volume, top senders",
        parameters: z.object({ days: z.number().default(7) }),
        execute: async ({ days }) => {
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const [unread] = await db
            .select({ count: count() })
            .from(threads)
            .where(
              and(
                connectionFilter(connectionIds, threads.connectionId),
                eq(threads.isRead, false),
                eq(threads.isTrashed, false),
              ),
            );

          const [total] = await db
            .select({ count: count() })
            .from(emails)
            .where(
              and(
                connectionFilter(connectionIds, emails.connectionId),
                gte(emails.receivedAt, since),
              ),
            );

          const topSenders = await db
            .select({
              email: emails.fromEmail,
              name: emails.fromName,
              count: count(),
            })
            .from(emails)
            .where(
              and(
                connectionFilter(connectionIds, emails.connectionId),
                gte(emails.receivedAt, since),
              ),
            )
            .groupBy(emails.fromEmail, emails.fromName)
            .orderBy(sql`count(*) desc`)
            .limit(5);

          return {
            unreadCount: unread?.count ?? 0,
            totalLast: { count: total?.count ?? 0, days },
            topSenders,
          };
        },
      }),
    };

    // Save user message to DB
    if (conversationId) {
      await db
        .insert(aiMessages)
        .values({
          conversationId,
          role: "user",
          content: messages[messages.length - 1]?.content ?? "",
        })
        .catch(() => {});
    }

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY não configurada." },
        { status: 503 }
      );
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: `You are NexoMail Assistant, an intelligent email management agent.
You help users manage their email inbox with natural language. Use tools to search, organize, and analyze emails.
Always confirm what actions you performed. Be concise and action-oriented.
Respond in the same language as the user. If they write in Portuguese, respond in Portuguese.
The user has ${userConnections.length} email account(s): ${userConnections.map((c) => c.email).join(", ")}.
Today is ${new Date().toLocaleDateString("pt-BR")}.`,
      messages: convertToCoreMessages(messages),
      tools: toolsWithImpl,
      maxSteps: 8,
      temperature: 0.3,
      onFinish: async ({ text }) => {
        if (conversationId && text) {
          await db
            .insert(aiMessages)
            .values({
              conversationId,
              role: "assistant",
              content: text,
            })
            .catch(() => {});
        }
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        if (error instanceof Error) {
          if (error.message.includes("credit balance") || error.message.includes("too low")) {
            return "Saldo insuficiente na conta Anthropic. Acesse console.anthropic.com → Plans & Billing para adicionar créditos.";
          }
          if (error.message.includes("invalid x-api-key") || error.message.includes("authentication_error")) {
            return "Chave de API inválida. Verifique ANTHROPIC_API_KEY no arquivo .env";
          }
          return error.message;
        }
        return "Erro interno do servidor";
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[ai/chat] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
