"use client";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-6">Perfil</h1>
      <div className="rounded-lg border border-border p-6 space-y-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Informações da conta
        </p>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.image ?? ""} />
            <AvatarFallback className="text-lg">
              {user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nome</p>
            <p className="text-sm">{user?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm">{user?.email ?? "—"}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          As informações do perfil são sincronizadas com o provedor de autenticação (Google / Microsoft).
        </p>
      </div>
    </div>
  );
}
