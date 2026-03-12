import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "NexoMail — Email com Inteligência Artificial",
    template: "%s | NexoMail",
  },
  description:
    "Gerencie Gmail, Outlook e IMAP em um único lugar com um agente de IA. Categorização automática, respostas inteligentes e inbox sempre organizada.",
  keywords: ["email", "inteligência artificial", "gmail", "outlook", "produtividade", "ai"],
  openGraph: {
    title: "NexoMail — Email com Inteligência Artificial",
    description:
      "Gerencie todos os seus emails com o poder da IA. Gmail, Outlook e IMAP unificados.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "NexoMail — Email com Inteligência Artificial",
    description: "Gerencie todos os seus emails com o poder da IA.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
