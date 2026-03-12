"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Tag, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899",
  "#14b8a6", "#64748b",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "w-5 h-5 rounded-full transition-transform",
            value === c && "ring-2 ring-offset-1 ring-foreground scale-110"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export default function LabelsPage() {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[5]!);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const queryClient = useQueryClient();

  const { data: connsData } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetch("/api/connections").then((r) => r.json()),
  });

  const { data: labelsData, isLoading } = useQuery({
    queryKey: ["labels"],
    queryFn: () => fetch("/api/labels").then((r) => r.json()),
  });

  const connections: any[] = connsData?.connections ?? [];
  const labels: any[] = labelsData?.labels?.filter((l: any) => !l.isSystem) ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome obrigatório");
      if (connections.length === 0) throw new Error("Nenhuma conta conectada");

      await Promise.all(
        connections.map((c) =>
          fetch("/api/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId: c.id, name: name.trim(), color }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      setName("");
      toast.success("Label criada");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao criar label"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      fetch(`/api/labels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setEditingId(null);
      toast.success("Label atualizada");
    },
    onError: () => toast.error("Erro ao atualizar label"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/labels/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Label removida");
    },
    onError: () => toast.error("Erro ao remover label"),
  });

  const startEdit = (label: any) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color ?? PRESET_COLORS[5]!);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editingId) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), color: editColor });
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-1">Labels</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Organize seus emails com labels personalizadas.
      </p>

      {/* Create label form */}
      <div className="rounded-lg border border-border p-5 mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Nova label
        </p>
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex items-center gap-2 mt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da label"
            className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) createMutation.mutate();
            }}
          />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            <Plus className="w-3.5 h-3.5" />
            Criar
          </Button>
        </div>
      </div>

      {/* Labels list */}
      <div className="rounded-lg border border-border divide-y divide-border">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
        ) : labels.length === 0 ? (
          <div className="p-6 flex flex-col items-center gap-2 text-muted-foreground">
            <Tag className="w-8 h-8 opacity-30" />
            <p className="text-sm">Nenhuma label criada ainda</p>
          </div>
        ) : (
          labels.map((label) =>
            editingId === label.id ? (
              /* Edit mode */
              <div key={label.id} className="px-4 py-3 space-y-2.5 bg-muted/20">
                <ColorPicker value={editColor} onChange={setEditColor} />
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: editColor }}
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8 px-2.5 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={saveEdit}
                    disabled={!editName.trim() || updateMutation.isPending}
                    title="Salvar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingId(null)}
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div key={label.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: label.color ?? "#6366f1" }}
                />
                <span className="text-sm flex-1">{label.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(label)}
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(label.id)}
                  disabled={deleteMutation.isPending}
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )
          )
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Labels são aplicadas a emails de todas as contas conectadas.
      </p>
    </div>
  );
}
