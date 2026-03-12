"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  Star,
  Archive,
  Plus,
  Settings,
  LogOut,
  Mail,
  BarChart2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/auth";

interface AppSidebarProps {
  user: User;
}

const NAV_ITEMS = [
  { href: "/mail", icon: Inbox, label: "Caixa de entrada", folder: "inbox" },
  { href: "/mail/sent", icon: Send, label: "Enviados", folder: "sent" },
  { href: "/mail/drafts", icon: FileText, label: "Rascunhos", folder: "drafts" },
  { href: "/mail/starred", icon: Star, label: "Com estrela", folder: "starred" },
  { href: "/mail/archived", icon: Archive, label: "Arquivados", folder: "archived" },
  { href: "/mail/spam", icon: AlertOctagon, label: "Spam", folder: "spam" },
  { href: "/mail/trash", icon: Trash2, label: "Lixeira", folder: "trash" },
];

const BOTTOM_NAV = [
  { href: "/dashboard", icon: BarChart2, label: "Dashboard" },
  { href: "/chat", icon: MessageSquare, label: "Assistente AI" },
  { href: "/settings/accounts", icon: Settings, label: "Configurações" },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { data: labelsData } = useQuery({
    queryKey: ["labels"],
    queryFn: () => fetch("/api/labels").then((r) => r.json()),
  });

  const { data: statsData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => fetch("/api/dashboard/stats").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const unreadCount = statsData?.stats?.unread ?? 0;
  const labels = labelsData?.labels?.filter((l: any) => !l.isSystem) ?? [];

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative flex flex-col h-screen border-r border-border bg-background overflow-hidden shrink-0"
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center h-14 px-4 gap-3",
            collapsed && "justify-center px-0"
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm tracking-tight">
                NexoMail
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <Separator />

        {/* Compose button */}
        <div className={cn("px-3 py-3", collapsed && "px-2")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="default"
                  className="w-full"
                  onClick={() => router.push("/mail/compose")}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Novo email</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              className="w-full justify-start gap-2"
              onClick={() => router.push("/mail/compose")}
            >
              <Plus className="w-4 h-4" />
              Novo email
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/mail" && pathname.startsWith(item.href));
            const showBadge = item.folder === "inbox" && unreadCount > 0;

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center h-9 w-full rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                  {showBadge && ` (${unreadCount})`}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {showBadge && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-xs ml-auto"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* Labels section */}
          {!collapsed && (
            <>
              <div className="pt-4 pb-1 px-3 flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1">
                  Labels
                </span>
                <Link
                  href="/settings/labels"
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Gerenciar labels"
                >
                  <Plus className="w-3 h-3" />
                </Link>
              </div>
              {labels.slice(0, 8).map((label: any) => (
                <Link
                  key={label.id}
                  href={`/mail/label/${label.id}`}
                  className={cn(
                    "flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors",
                    pathname === `/mail/label/${label.id}`
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: label.color ?? "#6366f1" }}
                  />
                  <span className="truncate">{label.name}</span>
                </Link>
              ))}
              {labels.length > 8 && (
                <Link
                  href="/settings/labels"
                  className="flex items-center gap-3 h-9 px-3 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  + {labels.length - 8} mais labels
                </Link>
              )}
              {labels.length === 0 && (
                <Link
                  href="/settings/labels"
                  className="flex items-center gap-3 h-9 px-3 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Criar label
                </Link>
              )}
            </>
          )}
        </nav>

        <Separator />

        {/* Bottom nav */}
        <div className="px-2 py-2 space-y-0.5">
          {BOTTOM_NAV.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center h-9 w-full rounded-md transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 h-9 px-3 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Separator />

        {/* User */}
        <div className={cn("p-3", collapsed && "p-2")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {user.name?.[0] ?? user.email?.[0]}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                {user.name ?? user.email}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user.name?.[0] ?? user.email?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 shrink-0"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => router.push("/login"),
                    },
                  })
                }
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-14 -right-3 w-6 h-6 rounded-full border border-border bg-background flex items-center justify-center hover:bg-accent transition-colors z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}
