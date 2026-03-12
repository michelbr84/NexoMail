"use client";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, Suspense } from "react";
import { ThreadList } from "@/components/mail/thread-list";
import { ThreadView } from "@/components/mail/thread-view";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
    enabled: q.length >= 2,
  });

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={`flex flex-col border-r border-border ${
          selectedId ? "w-80 shrink-0" : "flex-1"
        }`}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <Search className="w-4 h-4 text-muted-foreground" />
          <h1 className="font-semibold text-sm">
            {q ? `Resultados para "${q}"` : "Busca"}
          </h1>
          {!isLoading && data?.results && q.length >= 2 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {data.results.length} resultado(s)
            </span>
          )}
        </div>

        {q.length < 2 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Search className="w-10 h-10 opacity-20 mx-auto mb-2" />
              <p className="text-sm">Digite para buscar</p>
              <p className="text-xs mt-1 opacity-60">Mínimo de 2 caracteres</p>
            </div>
          </div>
        ) : (
          <ThreadList
            threads={data?.results ?? []}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
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
            <p className="text-sm">Selecione um email para ler</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">Carregando...</p>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
