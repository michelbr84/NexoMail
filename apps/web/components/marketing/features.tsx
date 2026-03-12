"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Layers,
  Zap,
  BarChart2,
  Shield,
  Pencil,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Agente de IA",
    description:
      "Converse em linguagem natural com seus emails. Busque, arquive, responda e organize apenas descrevendo o que quer.",
    color: "text-indigo-400",
    bg: "bg-indigo-600/10",
    border: "border-indigo-600/20",
    glow: "group-hover:shadow-indigo-600/10",
  },
  {
    icon: Layers,
    title: "Multi-contas unificadas",
    description:
      "Gmail, Outlook e qualquer servidor IMAP em uma única interface. Troque entre contas sem perder contexto.",
    color: "text-violet-400",
    bg: "bg-violet-600/10",
    border: "border-violet-600/20",
    glow: "group-hover:shadow-violet-600/10",
  },
  {
    icon: Zap,
    title: "Inbox inteligente",
    description:
      "Categorização automática por IA. Labels geradas, prioridades definidas e spam eliminado antes de você ver.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "group-hover:shadow-amber-500/10",
  },
  {
    icon: Pencil,
    title: "Composer com IA",
    description:
      "Descreva o que quer dizer e a IA escreve o email para você. Tons formais, informais, seguimentos automáticos.",
    color: "text-emerald-400",
    bg: "bg-emerald-600/10",
    border: "border-emerald-600/20",
    glow: "group-hover:shadow-emerald-600/10",
  },
  {
    icon: BarChart2,
    title: "Analytics de email",
    description:
      "Dashboard com volume diário, top remetentes, categorias e tendências. Entenda como você usa o email.",
    color: "text-blue-400",
    bg: "bg-blue-600/10",
    border: "border-blue-600/20",
    glow: "group-hover:shadow-blue-600/10",
  },
  {
    icon: Shield,
    title: "Segurança em primeiro lugar",
    description:
      "Tokens OAuth e credenciais criptografados com AES-256. Seus dados nunca saem do seu controle.",
    color: "text-rose-400",
    bg: "bg-rose-600/10",
    border: "border-rose-600/20",
    glow: "group-hover:shadow-rose-600/10",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-32 bg-[#060608]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs font-medium mb-6">
            Funcionalidades
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Tudo que você precisa,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              nada que você não quer
            </span>
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-2xl mx-auto">
            Construído para profissionais que recebem centenas de emails por dia
            e precisam de clareza, não de mais barulho.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className={`group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:shadow-xl ${f.glow}`}
            >
              <div
                className={`w-10 h-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-4`}
              >
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
