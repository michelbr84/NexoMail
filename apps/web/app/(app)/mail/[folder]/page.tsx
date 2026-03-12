"use client";
import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { ThreadList } from "@/components/mail/thread-list";
import type { GroupBy, ViewMode } from "@/components/mail/thread-list";
import { ThreadView } from "@/components/mail/thread-view";
import { ViewToolbar } from "@/components/mail/view-toolbar";
import { AnimatePresence, motion } from "framer-motion";

const VALID_FOLDERS = [
  "sent",
  "drafts",
  "trash",
  "spam",
  "starred",
  "archived",
];

const FOLDER_LABELS: Record<string, string> = {
  sent: "Enviados",
  drafts: "Rascunhos",
  trash: "Lixeira",
  spam: "Spam",
  starred: "Com estrela",
  archived: "Arquivados",
};

export default function FolderPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = use(params);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

  if (!VALID_FOLDERS.includes(folder)) notFound();

  const { data, isLoading } = useQuery({
    queryKey: ["threads", folder],
    queryFn: () =>
      fetch(`/api/emails?folder=${folder}`).then((r) => r.json()),
  });

  const threads = data?.threads ?? [];

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={`flex flex-col border-r border-border ${
          selectedId ? "w-80 shrink-0" : "flex-1"
        }`}
      >
        <div className="flex items-center px-4 h-14 border-b border-border shrink-0">
          <h1 className="font-semibold text-sm flex-1">
            {FOLDER_LABELS[folder]}
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

      <AnimatePresence mode="wait">
        {selectedId ? (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
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
