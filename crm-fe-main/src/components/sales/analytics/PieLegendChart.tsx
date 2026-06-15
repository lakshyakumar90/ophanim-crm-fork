import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { EmptyState } from "./EmptyState";
import { PIE_COLORS } from "./utils";

export function PieLegendChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total === 0) {
    return <EmptyState message="No data for selected filters" />;
  }

  return (
    <div className="flex items-center gap-4" style={{ minHeight: 240 }}>
      <div className="flex-1 min-w-0 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="46%" outerRadius="72%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [v, "Count"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-44 shrink-0 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="flex-1 truncate text-foreground/80 capitalize">{item.name}</span>
              <span className="font-semibold tabular-nums">{item.value}</span>
              <span className="text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
