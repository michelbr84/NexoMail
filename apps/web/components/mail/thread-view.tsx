"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Reply,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Star,
  AlertOctagon,
  Tag,
  Plus,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ThreadViewProps {
  threadId: string;
  onClose: () => void;
}

export function ThreadView({ threadId, onClose }: ThreadViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetch(`/api/threads/${threadId}`).then((r) => r.json()),
    enabled: !!threadId,
  });

  const { data: labelsData } = useQuery({
    queryKey: ["labels"],
    queryFn: () => fetch("/api/labels").then((r) => r.json()),
  });

  const allLabels: any[] = labelsData?.labels?.filter((l: any) => !l.isSystem) ?? [];

  const patchThread = (body: Record<string, unknown>) =>
    fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());

  const archiveMutation = useMutation({
    mutationFn: () => patchThread({ isArchived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Arquivado");
      onClose();
    },
    onError: () => toast.error("Erro ao arquivar"),
  });

  const trashMutation = useMutation({
    mutationFn: () => patchThread({ isTrashed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Movido para a lixeira");
      onClose();
    },
    onError: () => toast.error("Erro ao mover para lixeira"),
  });

  const starMutation = useMutation({
    mutationFn: (starred: boolean) => patchThread({ isStarred: starred }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
    },
    onError: () => toast.error("Erro ao atualizar estrela"),
  });

  const spamMutation = useMutation({
    mutationFn: () => patchThread({ isSpam: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Marcado como spam");
      onClose();
    },
    onError: () => toast.error("Erro ao marcar como spam"),
  });

  const addLabelMutation = useMutation({
    mutationFn: (labelId: string) =>
      fetch(`/api/threads/${threadId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: () => toast.error("Erro ao adicionar label"),
  });

  const removeLabelMutation = useMutation({
    mutationFn: (labelId: string) =>
      fetch(`/api/threads/${threadId}/labels`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: () => toast.error("Erro ao remover label"),
  });

  const thread = data?.thread;
  const emailMessages = thread?.emails ?? [];
  const lastEmailId = emailMessages[emailMessages.length - 1]?.id;
  const isStarred = thread?.isStarred ?? false;
  const threadLabels: any[] = thread?.labels ?? [];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => id === lastEmailId || expandedIds.has(id);

  const isLabelApplied = (labelId: string) =>
    threadLabels.some((l) => l.id === labelId);

  const toggleLabel = (labelId: string) => {
    if (isLabelApplied(labelId)) {
      removeLabelMutation.mutate(labelId);
    } else {
      addLabelMutation.mutate(labelId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Thread não encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 h-14 border-b border-border shrink-0">
        <h2 className="font-semibold text-sm flex-1 truncate">
          {thread.subject ?? "(sem assunto)"}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => starMutation.mutate(!isStarred)}
            disabled={starMutation.isPending}
            title={isStarred ? "Remover estrela" : "Adicionar estrela"}
          >
            <Star
              className={cn(
                "w-4 h-4",
                isStarred && "fill-yellow-400 text-yellow-400"
              )}
            />
          </Button>

          {/* Label picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", showLabelPicker && "bg-accent")}
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              title="Gerenciar labels"
            >
              <Tag className="w-4 h-4" />
            </Button>
            {showLabelPicker && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLabelPicker(false)}
                />
                <div className="absolute right-0 top-9 z-50 w-52 rounded-lg border border-border bg-background shadow-lg py-1">
                  <p className="text-xs font-medium text-muted-foreground px-3 py-1.5 uppercase tracking-wider">
                    Labels
                  </p>
                  {allLabels.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      Nenhuma label criada
                    </p>
                  ) : (
                    allLabels.map((label) => {
                      const applied = isLabelApplied(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: label.color ?? "#6366f1" }}
                          />
                          <span className="flex-1 text-left truncate">{label.name}</span>
                          {applied && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      );
                    })
                  )}
                  <Separator className="my-1" />
                  <button
                    onClick={() => {
                      setShowLabelPicker(false);
                      router.push("/settings/labels");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Gerenciar labels
                  </button>
                </div>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            title="Arquivar"
          >
            <Archive className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => spamMutation.mutate()}
            disabled={spamMutation.isPending}
            title="Marcar como spam"
          >
            <AlertOctagon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => trashMutation.mutate()}
            disabled={trashMutation.isPending}
            title="Lixeira"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Applied labels bar */}
      {threadLabels.length > 0 && (
        <div className="flex items-center gap-1.5 px-6 py-2 border-b border-border flex-wrap">
          {threadLabels.map((label) => (
            <span
              key={label.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{
                borderColor: label.color ?? "#6366f1",
                color: label.color ?? "#6366f1",
                backgroundColor: `${label.color ?? "#6366f1"}18`,
              }}
            >
              {label.name}
              <button
                onClick={() => removeLabelMutation.mutate(label.id)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-3">
          {emailMessages.map((email: any) => (
            <div
              key={email.id}
              className={cn(
                "rounded-xl border border-border bg-card overflow-hidden",
                isExpanded(email.id) && "shadow-sm"
              )}
            >
              {/* Message header */}
              <button
                onClick={() => toggleExpand(email.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
              >
                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs bg-primary text-white">
                    {(email.fromName ?? email.fromEmail ?? "?")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {email.fromName ?? email.fromEmail}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {email.sentAt ? formatDate(email.sentAt) : ""}
                    </span>
                  </div>
                  {!isExpanded(email.id) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {email.snippet}
                    </p>
                  )}
                </div>
                {isExpanded(email.id) ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>

              {/* Message body */}
              <AnimatePresence>
                {isExpanded(email.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <Separator />
                    <div className="p-4">
                      {/* Recipients info */}
                      <div className="text-xs text-muted-foreground mb-4 space-y-0.5">
                        <p>
                          <span className="font-medium">De:</span>{" "}
                          {email.fromName} &lt;{email.fromEmail}&gt;
                        </p>
                        {email.toRecipients?.length > 0 && (
                          <p>
                            <span className="font-medium">Para:</span>{" "}
                            {email.toRecipients
                              .map((r: any) => r.name ?? r.email)
                              .join(", ")}
                          </p>
                        )}
                      </div>

                      {/* Body */}
                      {email.bodyHtml ? (
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert text-sm"
                          dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {email.bodyText}
                        </p>
                      )}

                      {/* Attachments */}
                      {email.attachments?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {email.attachments.length} anexo(s)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {email.attachments.map((att: any) => (
                              <div
                                key={att.name}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-xs"
                              >
                                <Paperclip className="w-3 h-3 text-muted-foreground" />
                                <span className="truncate max-w-[150px]">
                                  {att.name}
                                </span>
                                <span className="text-muted-foreground shrink-0">
                                  {att.size > 1024 * 1024
                                    ? `${(att.size / 1024 / 1024).toFixed(1)} MB`
                                    : `${Math.round(att.size / 1024)} KB`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reply bar */}
                    <div className="px-4 pb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          router.push(
                            `/mail/compose?replyToId=${email.id}&threadId=${threadId}`
                          )
                        }
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Responder
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
