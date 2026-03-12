"use client";
import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThreadList } from "@/components/mail/thread-list";
import type { GroupBy, ViewMode } from "@/components/mail/thread-list";
import { ThreadView } from "@/components/mail/thread-view";
import { ViewToolbar } from "@/components/mail/view-toolbar";
import { AnimatePresence, motion } from "framer-motion";
import { Tag } from "lucide-react";

export default function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

  const { data: labelsData } = useQuery({
    queryKey: ["labels"],
    queryFn: () => fetch("/api/labels").then((r) => r.json()),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["threads", "label", id],
    queryFn: () =>
      fetch(`/api/emails?labelId=${id}`).then((r) => r.json()),
  });

  const label = labelsData?.labels?.find((l: any) => l.id === id);
  const threads = data?.threads ?? [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread list panel */}
      <div
        className={`flex flex-col border-r border-border ${
          selectedId ? "w-80 shrink-0" : "flex-1"
        }`}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          {label?.color ? (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: label.color }}
            />
          ) : (
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <h1 className="font-semibold text-sm truncate">
            {label?.name ?? "Label"}
          </h1>
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
          selectedId={selectedId}
          onSelect={setSelectedId}
          groupBy={groupBy}
          viewMode={viewMode}
        />
      </div>

      {/* Thread detail panel */}
      <AnimatePresence mode="wait">
        {selectedId ? (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-hidden"
          >
            <ThreadView
              threadId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center text-muted-foreground"
          >
            <p className="text-sm">Selecione um email</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
