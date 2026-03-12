"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Mail,
  Inbox,
  Users,
  TrendingUp,
  Plus,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";

const COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
  trend,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  trend?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            color
          )}
        >
          <Icon className="text-white" size={18} />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs text-emerald-500">
            <ArrowUpRight className="w-3 h-3" />
            <span>{trend}%</span>
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16 mb-1" />
      ) : (
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      )}
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip for bar chart
// ---------------------------------------------------------------------------
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value} emails</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip for pie chart
// ---------------------------------------------------------------------------
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{payload[0].name}</p>
      <p className="text-sm font-semibold">{payload[0].value} emails</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      fetch("/api/dashboard/stats").then((r) => r.json()),
    refetchInterval: 60000,
  });

  const stats = data?.stats;

  // Build 7-day bar chart data, filling missing days with 0
  const chartData = (() => {
    const days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().split("T")[0];
      const found = stats?.emailsPerDay?.find((e: any) => e.day === dayKey);
      days.push({
        day: d.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "numeric",
        }),
        count: found?.count ?? 0,
      });
    }
    return days;
  })();

  // Build donut chart data from category counts
  const categoryData = (() => {
    if (!stats) return [];
    return [
      { name: "Caixa de entrada", value: stats.inbox ?? 0 },
      { name: "Arquivados", value: stats.archived ?? 0 },
      { name: "Spam", value: stats.spam ?? 0 },
      { name: "Lixeira", value: stats.trash ?? 0 },
    ].filter((d) => d.value > 0);
  })();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visão geral da sua caixa de entrada
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              asChild
            >
              <Link href="/chat">
                <MessageSquare className="w-3.5 h-3.5" />
                Assistente AI
              </Link>
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/mail/compose">
                <Plus className="w-3.5 h-3.5" />
                Novo email
              </Link>
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Stats row                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Não lidos"
            value={isLoading ? "—" : stats?.unread ?? 0}
            icon={Mail}
            color="bg-primary"
            loading={isLoading}
          />
          <StatCard
            label="Emails (30 dias)"
            value={isLoading ? "—" : stats?.total30Days ?? 0}
            icon={Inbox}
            color="bg-cyan-500"
            loading={isLoading}
          />
          <StatCard
            label="Remetentes únicos"
            value={isLoading ? "—" : stats?.topSenders?.length ?? 0}
            icon={Users}
            color="bg-emerald-500"
            loading={isLoading}
          />
          <StatCard
            label="Contas conectadas"
            value={isLoading ? "—" : stats?.connections?.length ?? 0}
            icon={TrendingUp}
            color="bg-violet-500"
            loading={isLoading}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Charts row                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar chart — emails per day */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-semibold text-sm mb-1">Emails recebidos</h3>
            <p className="text-xs text-muted-foreground mb-5">Últimos 7 dias</p>
            {isLoading ? (
              <Skeleton className="h-52 w-full rounded-lg" />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{
                        fill: "hsl(var(--muted))",
                        radius: 4,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Accounts summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-semibold text-sm mb-1">Contas</h3>
            <p className="text-xs text-muted-foreground mb-5">
              Contas conectadas
            </p>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-2.5 w-2/3" />
                    </div>
                  </div>
                ))
              ) : (stats?.connections?.length ?? 0) === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs">Nenhuma conta</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    asChild
                  >
                    <Link href="/settings/accounts">Conectar</Link>
                  </Button>
                </div>
              ) : (
                stats?.connections?.map((conn: any, i: number) => (
                  <div key={conn.id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      >
                        {conn.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conn.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {conn.provider}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {!isLoading && (stats?.connections?.length ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4 gap-1.5 text-xs"
                asChild
              >
                <Link href="/settings/accounts">
                  <Plus className="w-3 h-3" />
                  Adicionar conta
                </Link>
              </Button>
            )}
          </motion.div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Bottom row: Top senders + Category donut                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top senders */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-semibold text-sm mb-1">
              Principais remetentes
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Últimos 30 dias
            </p>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-48" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-1.5 flex-1 rounded-full" />
                        <Skeleton className="h-3 w-8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !stats?.topSenders?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum dado disponível. Sincronize seus emails primeiro.
              </p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxCount = stats.topSenders[0]?.count ?? 1;
                  return stats.topSenders.map(
                    (sender: any, i: number) => (
                      <div
                        key={sender.email ?? i}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback
                            className="text-xs text-white"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          >
                            {(
                              sender.fromName ??
                              sender.fromEmail ??
                              "?"
                            )[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium truncate flex-1 mr-2">
                              {sender.fromName ?? sender.fromEmail}
                            </p>
                            <span className="text-xs text-muted-foreground shrink-0 font-medium">
                              {sender.count}
                            </span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(sender.count / maxCount) * 100}%`,
                              }}
                              transition={{
                                duration: 0.6,
                                delay: i * 0.05,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  );
                })()}
              </div>
            )}
          </motion.div>

          {/* Email categories donut */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h3 className="font-semibold text-sm mb-1">Categorias</h3>
            <p className="text-xs text-muted-foreground mb-5">
              Distribuição de emails
            </p>
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="w-36 h-36 rounded-full" />
                <div className="space-y-2 w-full">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-full rounded" />
                  ))}
                </div>
              </div>
            ) : categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sem dados de categorias.
              </p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
