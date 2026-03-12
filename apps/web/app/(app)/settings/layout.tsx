"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Mail, User, Bell, Palette, Tag } from "lucide-react";

const NAV_ITEMS = [
  { href: "/settings/accounts", label: "Contas de email", icon: Mail },
  { href: "/settings/profile", label: "Perfil", icon: User },
  { href: "/settings/notifications", label: "Notificações", icon: Bell },
  { href: "/settings/appearance", label: "Aparência", icon: Palette },
  { href: "/settings/labels", label: "Labels", icon: Tag },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-border p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Configurações
        </h2>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
