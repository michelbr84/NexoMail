"use client";
import { useChat } from "ai/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const SUGGESTIONS = [
  "Quais emails não li esta semana?",
  "Mostre emails do meu chefe",
  "Resume os últimos emails sobre reuniões",
  "Quantos emails não lidos tenho?",
  "Archive todos os emails de newsletters",
];

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, error } =
    useChat({
      api: "/api/ai/chat",
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-semibold text-sm">Assistente NexoMail</h1>
          <p className="text-xs text-muted-foreground">Powered by Claude</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Como posso ajudar?</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm">
              Posso buscar, resumir, organizar e gerenciar seus emails com
              comandos em linguagem natural.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-left px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm hover:bg-muted/60 hover:border-primary/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="py-4 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-7 h-7 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-7 h-7 shrink-0 mt-1">
                  <AvatarFallback className="bg-primary text-white text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mb-2 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 pt-3 border-t border-border shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Peça ao assistente algo sobre seus emails..."
            className="flex-1 h-11 px-4 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 rounded-xl"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
