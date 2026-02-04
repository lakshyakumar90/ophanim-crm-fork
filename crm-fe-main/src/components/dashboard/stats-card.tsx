import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  className?: string;
}

const accentColors = {
  blue: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-500",
  },
  green: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-500",
  },
  orange: {
    border: "border-l-orange-500",
    iconBg: "bg-orange-50 dark:bg-orange-950",
    iconColor: "text-orange-500",
  },
  purple: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-50 dark:bg-violet-950",
    iconColor: "text-violet-500",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "bg-rose-50 dark:bg-rose-950",
    iconColor: "text-rose-500",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "bg-cyan-50 dark:bg-cyan-950",
    iconColor: "text-cyan-500",
  },
  violet: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-50 dark:bg-violet-950",
    iconColor: "text-violet-500",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950",
    iconColor: "text-amber-500",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-500",
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  accentColor = "blue",
  className,
}: StatsCardProps) {
  const colors = accentColors[accentColor];

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200 border-l-4 bg-card",
        colors.border,
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {(description || trend) && (
              <div className="flex items-center gap-1 mt-2">
                {trend && (
                  <span
                    className={cn(
                      "flex items-center text-sm font-medium",
                      trend.isPositive ? "text-emerald-600" : "text-red-500",
                    )}
                  >
                    {trend.isPositive ? (
                      <TrendingUp className="w-4 h-4 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-0.5" />
                    )}
                    {Math.abs(trend.value)}%
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  {description || "vs previous period"}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              colors.iconBg,
            )}
          >
            <Icon className={cn("h-6 w-6", colors.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
