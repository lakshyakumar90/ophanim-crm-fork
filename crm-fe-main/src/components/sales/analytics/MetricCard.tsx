import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: "blue" | "emerald" | "rose" | "violet" | "amber" | "cyan";
}) {
  const toneClass: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300",
    rose: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300",
    violet: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-300",
    amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300",
    cyan: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/60 dark:border-cyan-800 dark:text-cyan-300",
  };

  return (
    <div className={cn("rounded-xl border p-4 text-center", toneClass[tone])}>
      <div className="flex justify-center mb-1">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
