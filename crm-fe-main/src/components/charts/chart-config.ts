import type { ChartConfig } from "@/components/ui/chart";

export const CHART_SERIES = [
  "series1",
  "series2",
  "series3",
  "series4",
  "series5",
] as const;

export const defaultChartConfig: ChartConfig = {
  series1: { label: "Series 1", color: "var(--chart-1)" },
  series2: { label: "Series 2", color: "var(--chart-2)" },
  series3: { label: "Series 3", color: "var(--chart-3)" },
  series4: { label: "Series 4", color: "var(--chart-4)" },
  series5: { label: "Series 5", color: "var(--chart-5)" },
};

export function buildChartConfig(
  entries: Record<string, { label: string; colorIndex?: number }>,
): ChartConfig {
  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];
  return Object.fromEntries(
    Object.entries(entries).map(([key, { label, colorIndex = 0 }], i) => [
      key,
      { label, color: colors[colorIndex ?? i % colors.length] },
    ]),
  );
}

export const chartAxisProps = {
  tickLine: false as const,
  axisLine: false as const,
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
};

export const chartGridProps = {
  strokeDasharray: "3 3",
  vertical: false,
  className: "stroke-border/50",
};
