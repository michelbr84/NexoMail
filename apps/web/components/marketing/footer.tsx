"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

const links = {
  Produto: [
    { label: "Funcionalidades", href: "#features" },
    { label: "Como funciona", href: "#how-it-works" },
    { label: "Preços", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Empresa: [
    { label: "Sobre nós", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Contato", href: "#" },
  ],
  Legal: [
    { label: "Termos de uso", href: "#" },
    { label: "Privacidade", href: "#" },
    { label: "Cookies", href: "#" },
    { label: "Segurança", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="relative bg-[#060608] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white tracking-tight text-[15px]">
                NexoMail
              </span>
            </Link>
            <p className="text-xs text-white/30 leading-relaxed max-w-[180px]">
              Email com inteligência artificial. Feito para quem não tem tempo a perder.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-white/35 hover:text-white/70 transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} NexoMail. Todos os direitos reservados.
          </p>
          <p className="text-xs text-white/20">
            Construído com ♥ e Claude AI
          </p>
        </div>
      </div>
    </footer>
  );
}
