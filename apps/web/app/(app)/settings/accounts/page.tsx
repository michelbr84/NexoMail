"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  imap: "IMAP",
};

const PROVIDER_COLORS: Record<string, string> = {
  gmail: "#EA4335",
  outlook: "#0078D4",
  imap: "#6366f1",
};

export default function AccountsSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetch("/api/connections").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/connections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      toast.success("Conta removida com sucesso");
    },
    onError: () => toast.error("Erro ao remover conta"),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/emails/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      toast.success("Sincronização iniciada");
    },
    onError: () => toast.error("Erro ao sincronizar"),
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Contas de email</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas contas conectadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href="/api/connections/oauth/google">
              <Plus className="w-3.5 h-3.5" />
              Gmail
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href="/api/connections/oauth/microsoft">
              <Plus className="w-3.5 h-3.5" />
              Outlook
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-border animate-pulse bg-muted/30"
            />
          ))}

        {data?.connections?.map((conn: any) => (
          <div
            key={conn.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={conn.avatarUrl} />
              <AvatarFallback
                style={{ backgroundColor: PROVIDER_COLORS[conn.provider] ?? "#6366f1" }}
                className="text-white text-sm"
              >
                {conn.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {conn.displayName ?? conn.email}
                </p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {PROVIDER_LABELS[conn.provider] ?? conn.provider}
                </Badge>
                {conn.isActive ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {conn.email}
              </p>
              {conn.lastSyncAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Último sync:{" "}
                  {new Date(conn.lastSyncAt).toLocaleString("pt-BR")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => syncMutation.mutate(conn.id)}
                disabled={syncMutation.isPending}
                title="Sincronizar"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncMutation.isPending ? "animate-spin" : ""
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (
                    confirm(
                      `Remover a conta ${conn.email}? Todos os emails sincronizados serão apagados.`
                    )
                  ) {
                    deleteMutation.mutate(conn.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                title="Remover conta"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {!isLoading && data?.connections?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <p className="text-sm">Nenhuma conta conectada</p>
            <p className="text-xs mt-1">
              Adicione uma conta usando os botões acima
            </p>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border">
        <h3 className="text-sm font-medium mb-1">Sobre a sincronização</h3>
        <p className="text-xs text-muted-foreground">
          Os emails são sincronizados automaticamente a cada 30 minutos. Você
          pode forçar uma sincronização manual clicando no ícone de atualização
          ao lado de cada conta.
        </p>
      </div>
    </div>
  );
}
