"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    description: "Para quem quer experimentar o poder da IA nos emails.",
    features: [
      "1 conta de email",
      "Agente IA (100 msgs/mês)",
      "Categorização automática",
      "Labels inteligentes",
      "Dashboard básico",
    ],
    cta: "Começar grátis",
    href: "/login",
    featured: false,
  },
  {
    name: "Pro",
    price: "R$ 39",
    period: "por mês",
    description: "Para profissionais que vivem pelo email e precisam de tudo.",
    features: [
      "Contas ilimitadas",
      "Agente IA ilimitado",
      "Respostas automáticas",
      "Regras e automações",
      "Analytics avançado",
      "Suporte prioritário",
    ],
    cta: "Começar Pro",
    href: "/login",
    featured: true,
    badge: "Mais popular",
  },
  {
    name: "Time",
    price: "R$ 99",
    period: "por mês",
    description: "Para equipes que precisam de colaboração e controle total.",
    features: [
      "Tudo do Pro",
      "Até 10 usuários",
      "Caixas compartilhadas",
      "Administração centralizada",
      "Relatórios de equipe",
      "SLA de suporte",
    ],
    cta: "Falar com vendas",
    href: "/login",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-32 bg-[#060608]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

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
            Preços
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Simples e{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              transparente
            </span>
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
            Sem cobranças escondidas. Cancele quando quiser.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-6 border transition-all ${
                plan.featured
                  ? "bg-indigo-600/[0.07] border-indigo-600/30 shadow-xl shadow-indigo-600/10"
                  : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="text-sm font-medium text-white/60 mb-1">{plan.name}</div>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/40 mb-1">/{plan.period}</span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.featured ? "bg-indigo-600/20" : "bg-white/[0.06]"}`}>
                      <Check className={`w-2.5 h-2.5 ${plan.featured ? "text-indigo-400" : "text-white/40"}`} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full text-center text-sm font-medium py-2.5 rounded-xl transition-all active:scale-95 ${
                  plan.featured
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-600/25"
                    : "bg-white/[0.06] hover:bg-white/[0.10] text-white/70 hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
