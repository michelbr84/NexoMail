"use client";

import { motion } from "framer-motion";
import { Link2, Sparkles, Inbox } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Conecte suas contas",
    description:
      "Adicione Gmail, Outlook ou IMAP com poucos cliques. OAuth seguro — sem senhas armazenadas.",
    color: "text-indigo-400",
    bg: "bg-indigo-600/10",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "A IA organiza tudo",
    description:
      "Em segundos, o Claude lê seus emails, cria labels, prioriza threads e sugere respostas automáticas.",
    color: "text-violet-400",
    bg: "bg-violet-600/10",
  },
  {
    number: "03",
    icon: Inbox,
    title: "Foque no que importa",
    description:
      "Uma inbox limpa, organizada e com contexto. Delegue o trabalho repetitivo ao agente e responda apenas o essencial.",
    color: "text-emerald-400",
    bg: "bg-emerald-600/10",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 bg-[#060608]">
      {/* Divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs font-medium mb-6">
            Como funciona
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Produtivo em{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              menos de 3 minutos
            </span>
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
            Sem configurações complexas. Conecte, deixe a IA trabalhar e
            desfrute de uma inbox organizada.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-16 left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] h-px bg-gradient-to-r from-indigo-600/30 via-violet-600/30 to-emerald-600/30" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col items-center text-center lg:items-start lg:text-left"
              >
                {/* Icon with number */}
                <div className="relative mb-6">
                  <div
                    className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center`}
                  >
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#060608] border border-white/[0.08] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white/40">{step.number}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
