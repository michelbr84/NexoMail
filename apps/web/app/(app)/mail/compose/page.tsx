"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Send, Sparkles, Loader2 } from "lucide-react";

interface Recipient {
  email: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// RecipientInput
// ---------------------------------------------------------------------------
function RecipientInput({
  value,
  onChange,
  placeholder,
}: {
  value: Recipient[];
  onChange: (v: Recipient[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addRecipient = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (value.some((r) => r.email === email)) {
      setInputValue("");
      return;
    }
    onChange([...value, { email }]);
    setInputValue("");
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center min-h-9 px-3 py-1.5 border-b border-border focus-within:border-ring transition-colors">
      <span className="text-xs text-muted-foreground shrink-0 w-6">
        {placeholder}
      </span>
      {value.map((r) => (
        <span
          key={r.email}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs"
        >
          {r.name ?? r.email}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x.email !== r.email))}
            className="hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addRecipient(inputValue);
          }
          if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (inputValue) addRecipient(inputValue);
        }}
        placeholder={value.length === 0 ? "Adicionar destinatário..." : ""}
        className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComposeForm — reads searchParams
// ---------------------------------------------------------------------------
function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replyToId = searchParams.get("replyToId");

  const [to, setTo] = useState<Recipient[]>([]);
  const [cc, setCc] = useState<Recipient[]>([]);
  const [bcc, setBcc] = useState<Recipient[]>([]);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [inReplyTo, setInReplyTo] = useState<string | undefined>();
  const [references, setReferences] = useState<string | undefined>();
  const [isReply, setIsReply] = useState(false);

  const { data: connsData } = useQuery({
    queryKey: ["connections"],
    queryFn: () => fetch("/api/connections").then((r) => r.json()),
  });

  const connections: any[] = connsData?.connections ?? [];
  const activeConnectionId = selectedConnectionId ?? connections[0]?.id;

  // Pre-fill form when replying
  useEffect(() => {
    if (!replyToId) return;

    fetch(`/api/emails/${replyToId}`)
      .then((r) => r.json())
      .then((data) => {
        const email = data.email;
        if (!email) return;

        setIsReply(true);
        setTo([{ email: email.fromEmail, name: email.fromName ?? undefined }]);

        const originalSubject = email.subject ?? "";
        setSubject(
          originalSubject.startsWith("Re:")
            ? originalSubject
            : `Re: ${originalSubject}`
        );

        setInReplyTo(email.messageId ?? email.externalId);
        setReferences(
          email.references
            ? `${email.references} ${email.messageId ?? ""}`.trim()
            : email.messageId ?? undefined
        );

        if (email.connectionId) {
          setSelectedConnectionId(email.connectionId);
        }

        if (email.bodyText) {
          const date = email.sentAt
            ? new Date(email.sentAt).toLocaleString("pt-BR")
            : "";
          const quoted = email.bodyText
            .split("\n")
            .map((l: string) => `> ${l}`)
            .join("\n");
          setBody(
            `\n\n---\nEm ${date}, ${email.fromEmail} escreveu:\n${quoted}`
          );
        }
      })
      .catch(() => {});
  }, [replyToId]);

  const sendMutation = useMutation({
    mutationFn: () =>
      fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: activeConnectionId,
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          bodyText: body,
          bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
          ...(inReplyTo ? { inReplyTo } : {}),
          ...(references ? { references } : {}),
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Falha ao enviar");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Email enviado!");
      router.push("/mail");
    },
    onError: () => toast.error("Erro ao enviar email"),
  });

  const aiMutation = useMutation({
    mutationFn: () =>
      fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: aiPrompt,
          originalSubject: subject,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Erro na geração AI");
        return r.json();
      }),
    onSuccess: (data) => {
      setBody(data.draft ?? data.body ?? "");
      setShowAiAssist(false);
      setAiPrompt("");
      toast.success("Rascunho gerado!");
    },
    onError: () => toast.error("Erro na geração AI"),
  });

  const canSend =
    to.length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !!activeConnectionId;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 h-14 border-b border-border shrink-0">
        <h1 className="font-semibold text-sm flex-1">
          {isReply ? "Responder email" : "Novo email"}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.back()}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* From selector */}
      {connections.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border text-sm">
          <span className="text-xs text-muted-foreground w-6">De</span>
          <select
            value={activeConnectionId ?? ""}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          >
            {connections.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.displayName ? `${c.displayName} <${c.email}>` : c.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* To */}
      <RecipientInput value={to} onChange={setTo} placeholder="Para" />

      {/* Cc / Bcc toggle row */}
      <div className="flex items-center border-b border-border">
        <div className="flex-1">
          {showCcBcc && (
            <>
              <RecipientInput value={cc} onChange={setCc} placeholder="Cc" />
              <RecipientInput value={bcc} onChange={setBcc} placeholder="Bcc" />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCcBcc(!showCcBcc)}
          className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          Cc/Bcc
        </button>
      </div>

      {/* Subject */}
      <div className="border-b border-border">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Assunto"
          className="w-full px-4 h-11 text-sm bg-transparent outline-none font-medium placeholder:text-muted-foreground placeholder:font-normal"
        />
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva seu email aqui..."
          className="w-full h-full px-6 py-4 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
        />
      </div>

      {/* AI assist panel */}
      {showAiAssist && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Descreva o que quer escrever (ex: resposta profissional recusando a proposta)..."
              className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Enter" && aiPrompt.trim()) {
                  aiMutation.mutate();
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => aiMutation.mutate()}
              disabled={!aiPrompt.trim() || aiMutation.isPending}
              className="gap-1.5"
            >
              {aiMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Gerar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAiAssist(false)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        <Button
          onClick={() => sendMutation.mutate()}
          disabled={!canSend || sendMutation.isPending}
          className="gap-2"
        >
          {sendMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Enviar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowAiAssist(!showAiAssist)}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Assistente AI
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Descartar
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComposePage — wraps ComposeForm in Suspense for useSearchParams
// ---------------------------------------------------------------------------
export default function ComposePage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <ComposeForm />
    </Suspense>
  );
}
