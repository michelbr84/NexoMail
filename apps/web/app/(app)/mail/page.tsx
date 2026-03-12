"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ThreadList } from "@/components/mail/thread-list";
import type { GroupBy, ViewMode } from "@/components/mail/thread-list";
import { ThreadView } from "@/components/mail/thread-view";
import { SearchBar } from "@/components/mail/search-bar";
import { ViewToolbar } from "@/components/mail/view-toolbar";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InboxPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const folder = "inbox";
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["threads", folder],
    queryFn: () =>
      fetch(`/api/emails?folder=${folder}`).then((r) => r.json()),
  });

  const threads = data?.threads ?? [];

  const syncMutation = useMutation({
    mutationFn: async () => {
      const connsRes = await fetch("/api/connections");
      const { connections } = await connsRes.json();
      await Promise.all(
        connections.map((c: any) =>
          fetch("/api/emails/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId: c.id }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      toast.success("Emails sincronizados");
    },
    onError: () => toast.error("Erro ao sincronizar emails"),
  });

  const organizeMutation = useMutation({
    mutationFn: () =>
      fetch("/api/ai/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then((r) => {
        if (!r.ok) throw new Error("Erro ao organizar");
        return r.json();
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      const msg = data.summary ?? "Emails organizados com IA";
      toast.success(msg);
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "Erro ao organizar emails"),
  });

  // Auto-sync on first load when inbox is empty
  useEffect(() => {
    if (!isLoading && threads.length === 0 && !syncMutation.isPending) {
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread list panel */}
      <div
        className={`flex flex-col border-r border-border transition-all duration-200 ${
          selectedThreadId ? "w-80 shrink-0" : "flex-1"
        }`}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <h1 className="font-semibold text-sm flex-1">Caixa de entrada</h1>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => organizeMutation.mutate()}
            disabled={organizeMutation.isPending}
            title="Organizar emails recentes com IA"
          >
            {organizeMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {!selectedThreadId && "AI Organizar"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="px-3 py-2 border-b border-border">
          <SearchBar />
        </div>

        <ViewToolbar
          groupBy={groupBy}
          viewMode={viewMode}
          onGroupByChange={setGroupBy}
          onViewModeChange={setViewMode}
          threadCount={threads.length}
        />

        <ThreadList
          threads={threads}
          isLoading={isLoading}
          selectedId={selectedThreadId}
          onSelect={setSelectedThreadId}
          groupBy={groupBy}
          viewMode={viewMode}
        />
      </div>

      {/* Thread viewer panel */}
      <AnimatePresence mode="wait">
        {selectedThreadId ? (
          <motion.div
            key={selectedThreadId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden"
          >
            <ThreadView
              threadId={selectedThreadId}
              onClose={() => setSelectedThreadId(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-muted-foreground"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">Selecione um email para ler</p>
            <p className="text-xs mt-1 opacity-60">
              Clique em qualquer mensagem na lista
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
