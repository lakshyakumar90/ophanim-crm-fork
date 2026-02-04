import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MiniStatsCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: "blue" | "green" | "orange" | "purple" | "rose" | "slate";
  className?: string;
}

const colorClasses = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  green:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  orange:
    "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  purple:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  slate:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function MiniStatsCard({
  label,
  value,
  icon: Icon,
  color = "slate",
  className,
}: MiniStatsCardProps) {
  const colorClass = colorClasses[color];

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-4 flex flex-col items-center justify-center text-center",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center mb-2",
            colorClass.split(" ")[0],
            colorClass.split(" ")[2] // dark bg
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              colorClass.split(" ")[1],
              colorClass.split(" ")[3]
            )}
          />
        </div>
      )}
      <p
        className={cn(
          "text-2xl font-bold",
          color === "slate"
            ? "text-foreground"
            : colorClass.split(" ")[1] + " " + (colorClass.split(" ")[3] || "")
        )}
      >
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
