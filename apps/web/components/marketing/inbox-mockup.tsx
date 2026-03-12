"use client";

import { motion } from "framer-motion";
import { Mail, Search, Star, Archive, Tag, BarChart2, MessageSquare, Bot } from "lucide-react";

const threads = [
  {
    id: 1,
    sender: "Equipe Vercel",
    avatar: "V",
    color: "bg-black",
    subject: "Seu deploy foi concluído com sucesso",
    preview: "O projeto nexomail-frontend foi implantado em produção...",
    time: "09:14",
    unread: true,
    tag: "Notificação",
    tagColor: "text-blue-400 bg-blue-400/10",
  },
  {
    id: 2,
    sender: "Lucas Ferreira",
    avatar: "L",
    color: "bg-emerald-600",
    subject: "Re: Proposta Q1 — precisamos revisar os números",
    preview: "Analisei os dados que você enviou e tenho algumas sugestões...",
    time: "08:47",
    unread: true,
    tag: "Importante",
    tagColor: "text-amber-400 bg-amber-400/10",
  },
  {
    id: 3,
    sender: "GitHub",
    avatar: "G",
    color: "bg-neutral-700",
    subject: "[NexoMail] Pull request #42 aprovado",
    preview: "brunomelo aprovou seu pull request. Pronto para merge...",
    time: "08:02",
    unread: false,
    tag: "Dev",
    tagColor: "text-violet-400 bg-violet-400/10",
  },
  {
    id: 4,
    sender: "Ana Paula Costa",
    avatar: "A",
    color: "bg-pink-600",
    subject: "Reunião de alinhamento — amanhã 10h",
    preview: "Confirmando nossa conversa para amanhã. Vou enviar o link...",
    time: "Ontem",
    unread: false,
    tag: "Reunião",
    tagColor: "text-rose-400 bg-rose-400/10",
  },
];

export function InboxMockup() {
  return (
    <div className="bg-[#0d0d10] flex h-[480px] text-white select-none overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-white/[0.06] bg-[#0a0a0d] flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-white/[0.06]">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <Mail className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">NexoMail</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 mt-1">
          {[
            { icon: Mail, label: "Caixa de entrada", count: 12, active: true },
            { icon: Star, label: "Favoritos", count: null, active: false },
            { icon: Archive, label: "Arquivo", count: null, active: false },
            { icon: Tag, label: "Labels", count: null, active: false },
            { icon: BarChart2, label: "Dashboard", count: null, active: false },
            { icon: MessageSquare, label: "Agente IA", count: null, active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                item.active
                  ? "bg-indigo-600/15 text-indigo-400"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </div>
              {item.count && (
                <span className="text-[10px] bg-indigo-600/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">
                  {item.count}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-semibold text-white">
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/80 truncate">Michel</div>
              <div className="text-[10px] text-white/30 truncate">m@nexomail.app</div>
            </div>
          </div>
        </div>
      </div>

      {/* Thread list */}
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white/90 flex-1">Caixa de entrada</h2>
            <span className="text-[10px] text-white/30">12 não lidos</span>
          </div>
          {/* Search */}
          <div className="mt-2.5 flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
            <Search className="w-3 h-3 text-white/30" />
            <span className="text-xs text-white/25">Buscar emails...</span>
          </div>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {threads.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.07 }}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                i === 1
                  ? "bg-indigo-600/[0.08] border-l-2 border-indigo-500"
                  : "hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full ${t.color} flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-white mt-0.5`}
                >
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        t.unread ? "font-semibold text-white" : "text-white/60"
                      }`}
                    >
                      {t.sender}
                    </span>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{t.time}</span>
                  </div>
                  <div
                    className={`text-[11px] truncate mb-1 ${
                      t.unread ? "text-white/80 font-medium" : "text-white/50"
                    }`}
                  >
                    {t.subject}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/30 truncate">{t.preview}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${t.tagColor}`}
                    >
                      {t.tag}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Thread header */}
        <div className="px-6 py-3.5 border-b border-white/[0.06]">
          <div className="text-sm font-semibold text-white/90 mb-0.5">
            Re: Proposta Q1 — precisamos revisar os números
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span>Lucas Ferreira</span>
            <span>·</span>
            <span>Para você</span>
            <span>·</span>
            <span>08:47</span>
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="text-xs text-white/60 leading-relaxed space-y-3">
            <p>Oi, tudo bem?</p>
            <p>
              Analisei os dados que você enviou e tenho algumas sugestões de
              ajuste nos números para o Q1. Precisamos conversar sobre a
              margem de crescimento projetada.
            </p>
            <p>
              Você pode me enviar o modelo atualizado até quinta-feira?
              Quero garantir que temos tudo pronto para a apresentação da
              sexta.
            </p>
            <p>Abraços,<br />Lucas</p>
          </div>
        </div>

        {/* AI suggestion bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mx-4 mb-4 p-3 rounded-xl bg-indigo-600/[0.08] border border-indigo-600/20"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600/20 flex-shrink-0 flex items-center justify-center mt-0.5">
              <Bot className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-indigo-400 mb-1">Sugestão do Agente IA</div>
              <div className="text-[10px] text-white/50 leading-relaxed">
                "Olá Lucas! Enviarei o modelo atualizado até quinta-feira. Podemos agendar 15 min na sexta antes da apresentação?"
              </div>
            </div>
            <button className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-md hover:bg-indigo-600/10 flex-shrink-0 transition-colors">
              Usar
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
