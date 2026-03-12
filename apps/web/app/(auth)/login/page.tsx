"use client";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "microsoft" | null>(null);

  const handleSignIn = async (provider: "google" | "microsoft") => {
    setLoading(provider);
    try {
      await signIn.social({ provider, callbackURL: "/mail" });
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-8"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">NexoMail</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground mb-8">
          Acesse sua conta para gerenciar seus emails
        </p>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 gap-3 text-base"
            onClick={() => handleSignIn("google")}
            disabled={!!loading}
          >
            {loading === "google" ? (
              <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continuar com Google
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 gap-3 text-base"
            onClick={() => handleSignIn("microsoft")}
            disabled={!!loading}
          >
            {loading === "microsoft" ? (
              <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
            )}
            Continuar com Microsoft
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Ao continuar, você concorda com nossos{" "}
          <a href="#" className="underline hover:text-foreground">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a href="#" className="underline hover:text-foreground">
            Política de Privacidade
          </a>
        </p>
      </motion.div>
    </div>
  );
}
