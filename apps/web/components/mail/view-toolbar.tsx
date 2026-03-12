"use client";
import { cn } from "@/lib/utils";
import type { GroupBy, ViewMode } from "./thread-list";
import {
  AlignJustify,
  LayoutList,
  CalendarDays,
  User,
  MessageSquare,
  Tag,
  Minus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewToolbarProps {
  groupBy: GroupBy;
  viewMode: ViewMode;
  onGroupByChange: (g: GroupBy) => void;
  onViewModeChange: (v: ViewMode) => void;
  threadCount?: number;
}

const GROUP_OPTIONS: { value: GroupBy; label: string; icon: React.ElementType }[] = [
  { value: "date", label: "Por data", icon: CalendarDays },
  { value: "sender", label: "Por remetente", icon: User },
  { value: "subject", label: "Por assunto", icon: MessageSquare },
  { value: "none", label: "Sem agrupamento", icon: Minus },
];

export function ViewToolbar({
  groupBy,
  viewMode,
  onGroupByChange,
  onViewModeChange,
  threadCount,
}: ViewToolbarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/20">
        {/* Thread count */}
        {threadCount !== undefined && (
          <span className="text-xs text-muted-foreground flex-1">
            {threadCount} {threadCount === 1 ? "conversa" : "conversas"}
          </span>
        )}

        {/* Group by options */}
        <div className="flex items-center gap-0.5 mr-2">
          {GROUP_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onGroupByChange(value)}
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-md transition-colors text-muted-foreground",
                    groupBy === value
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-border mr-1" />

        {/* View mode */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onViewModeChange(viewMode === "normal" ? "compact" : "normal")}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
                "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {viewMode === "normal" ? (
                <LayoutList className="w-3.5 h-3.5" />
              ) : (
                <AlignJustify className="w-3.5 h-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {viewMode === "normal" ? "Modo compacto" : "Modo normal"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
