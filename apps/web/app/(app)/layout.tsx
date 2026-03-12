import { AppSidebar } from "@/components/layout/app-sidebar";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={session.user} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
