"use client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Paperclip } from "lucide-react";
import { motion } from "framer-motion";

export type GroupBy = "date" | "sender" | "subject" | "none";
export type ViewMode = "normal" | "compact";

export interface Thread {
  id: string;
  subject: string | null;
  from: string | null;
  snippet: string | null;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  lastMessageAt: string | null;
  messageCount: number | null;
  connection: { email: string; provider: string };
  labels?: Array<{ id: string; name: string; color: string | null }>;
}

interface ThreadListProps {
  threads: Thread[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  groupBy?: GroupBy;
  viewMode?: ViewMode;
}

function getInitials(from: string): string {
  const name = from.replace(/<.*>/, "").trim();
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getProviderColor(provider: string): string {
  if (provider === "gmail") return "#EA4335";
  if (provider === "outlook") return "#0078D4";
  return "#6366f1";
}

function getSenderName(from: string | null): string {
  if (!from) return "Desconhecido";
  return from.replace(/<.*>/, "").trim() || from;
}

// ---------- Date grouping helpers ----------
function getDateGroup(dateStr: string | null): string {
  if (!dateStr) return "Sem data";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());
  const threadDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (threadDay.getTime() === today.getTime()) return "Hoje";
  if (threadDay.getTime() === yesterday.getTime()) return "Ontem";
  if (threadDay >= weekAgo) return "Esta semana";
  if (threadDay >= monthAgo) return "Este mês";
  return "Mais antigos";
}

const DATE_GROUP_ORDER = ["Hoje", "Ontem", "Esta semana", "Este mês", "Mais antigos", "Sem data"];

function groupThreads(threads: Thread[], groupBy: GroupBy): Array<{ key: string; threads: Thread[] }> {
  if (groupBy === "none") return [{ key: "", threads }];

  const groups = new Map<string, Thread[]>();

  for (const thread of threads) {
    let key = "";
    if (groupBy === "date") {
      key = getDateGroup(thread.lastMessageAt);
    } else if (groupBy === "sender") {
      key = getSenderName(thread.from);
    } else if (groupBy === "subject") {
      // Normalize subject: strip Re:/Fwd: and trim
      key = (thread.subject ?? "(sem assunto)")
        .replace(/^(Re:|Fwd:|FWD:|RE:|FW:)\s*/gi, "")
        .trim() || "(sem assunto)";
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(thread);
  }

  const entries = Array.from(groups.entries()).map(([key, threads]) => ({ key, threads }));

  // Sort date groups in predefined order
  if (groupBy === "date") {
    entries.sort((a, b) => {
      const ai = DATE_GROUP_ORDER.indexOf(a.key);
      const bi = DATE_GROUP_ORDER.indexOf(b.key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  } else {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  }

  return entries;
}

// ---------- Single thread row ----------
function ThreadRow({
  thread,
  selected,
  compact,
  onSelect,
  index,
}: {
  thread: Thread;
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
  index: number;
}) {
  const labels = thread.labels?.filter((l) => l.name) ?? [];

  return (
    <motion.button
      key={thread.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.015, 0.3) }}
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 px-4 text-left border-b border-border/50 hover:bg-muted/30 transition-colors",
        compact ? "py-2" : "py-3",
        selected && "bg-muted/50 border-l-2 border-l-primary",
        !thread.isRead && "bg-muted/20"
      )}
    >
      {!compact && (
        <Avatar className="w-9 h-9 shrink-0 mt-0.5">
          <AvatarFallback
            className="text-xs text-white"
            style={{
              backgroundColor: getProviderColor(thread.connection?.provider ?? "imap"),
            }}
          >
            {getInitials(thread.from ?? "?")}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {compact && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getProviderColor(thread.connection?.provider ?? "imap") }}
            />
          )}
          <span
            className={cn(
              "text-sm truncate flex-1",
              !thread.isRead && "font-semibold"
            )}
          >
            {getSenderName(thread.from)}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {thread.lastMessageAt ? formatDate(thread.lastMessageAt) : ""}
          </span>
        </div>

        <p
          className={cn(
            "text-sm truncate",
            compact ? "mb-0" : "mb-0.5",
            !thread.isRead ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {thread.subject ?? "(sem assunto)"}
        </p>

        {!compact && (
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {thread.snippet}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {labels.slice(0, 2).map((label) => (
                <span
                  key={label.id}
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: label.color ?? "#6366f1" }}
                  title={label.name}
                />
              ))}
              {thread.hasAttachments && (
                <Paperclip className="w-3 h-3 text-muted-foreground" />
              )}
              {thread.isStarred && (
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              )}
              {(thread.messageCount ?? 1) > 1 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {thread.messageCount}
                </Badge>
              )}
            </div>
          </div>
        )}

        {compact && (
          <div className="flex items-center gap-1 mt-0.5">
            {labels.slice(0, 3).map((label) => (
              <span
                key={label.id}
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: label.color ?? "#6366f1" }}
                title={label.name}
              />
            ))}
            {thread.hasAttachments && (
              <Paperclip className="w-3 h-3 text-muted-foreground" />
            )}
            {thread.isStarred && (
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            )}
            {(thread.messageCount ?? 1) > 1 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {thread.messageCount}
              </Badge>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export function ThreadList({
  threads,
  isLoading,
  selectedId,
  onSelect,
  groupBy = "date",
  viewMode = "normal",
}: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Nenhum email encontrado</p>
      </div>
    );
  }

  const compact = viewMode === "compact";
  const grouped = groupThreads(threads, groupBy);
  let globalIndex = 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {grouped.map(({ key, threads: groupThreads }) => (
        <div key={key}>
          {/* Group header — only when groupBy is active */}
          {groupBy !== "none" && key && (
            <div className="sticky top-0 z-10 px-4 py-1.5 bg-background/95 backdrop-blur-sm border-b border-border/50">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {key}
                <span className="ml-1.5 font-normal normal-case">
                  ({groupThreads.length})
                </span>
              </span>
            </div>
          )}
          {groupThreads.map((thread) => {
            const idx = globalIndex++;
            return (
              <ThreadRow
                key={thread.id}
                thread={thread}
                selected={selectedId === thread.id}
                compact={compact}
                onSelect={() => onSelect(thread.id)}
                index={idx}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
