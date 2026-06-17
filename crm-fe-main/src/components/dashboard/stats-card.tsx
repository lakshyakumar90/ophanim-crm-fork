import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?:
    | "blue"
    | "green"
    | "orange"
    | "purple"
    | "rose"
    | "cyan"
    | "violet"
    | "amber"
    | "emerald";
  sparkline?: ReactNode;
  className?: string;
}

const accentColors = {
  blue: { iconBg: "bg-status-info", iconColor: "text-[var(--status-info-fg)]" },
  green: { iconBg: "bg-status-success", iconColor: "text-[var(--status-success-fg)]" },
  orange: { iconBg: "bg-status-warning", iconColor: "text-[var(--status-warning-fg)]" },
  purple: { iconBg: "bg-status-info", iconColor: "text-[var(--status-info-fg)]" },
  rose: { iconBg: "bg-status-danger", iconColor: "text-[var(--status-danger-fg)]" },
  cyan: { iconBg: "bg-status-info", iconColor: "text-[var(--status-info-fg)]" },
  violet: { iconBg: "bg-status-info", iconColor: "text-[var(--status-info-fg)]" },
  amber: { iconBg: "bg-status-warning", iconColor: "text-[var(--status-warning-fg)]" },
  emerald: { iconBg: "bg-status-success", iconColor: "text-[var(--status-success-fg)]" },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  accentColor = "blue",
  sparkline,
  className,
}: StatsCardProps) {
  const colors = accentColors[accentColor];

  return (
    <Card
      size="sm"
      className={cn(
        "rounded-xl ring-1 ring-border elevation-raised transition-interactive",
        className,
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground/80">{title}</p>
            <p className="mt-0.5 text-xl font-semibold text-foreground">{value}</p>
            {(description || trend) && (
              <div className="mt-1 flex items-center gap-1">
                {trend && (
                  <span
                    className={cn(
                      "flex items-center text-xs font-medium",
                      trend.isPositive ? "text-primary" : "text-destructive",
                    )}
                  >
                    {trend.isPositive ? (
                      <TrendingUp className="mr-0.5 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-0.5 h-3 w-3" />
                    )}
                    {Math.abs(trend.value)}%
                  </span>
                )}
                {description ? (
                  <span className="text-xs text-muted-foreground">{description}</span>
                ) : null}
              </div>
            )}
            {sparkline ? <div className="mt-2 h-12">{sparkline}</div> : null}
          </div>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              colors.iconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", colors.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
