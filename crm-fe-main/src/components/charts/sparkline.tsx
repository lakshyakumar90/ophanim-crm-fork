"use client";

import { Line, LineChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type SparklineProps = {
  data: { value: number }[];
  className?: string;
  color?: string;
  height?: number;
};

const sparklineConfig: ChartConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
};

export function Sparkline({
  data,
  className,
  color = "var(--chart-1)",
  height = 48,
}: SparklineProps) {
  const config: ChartConfig = {
    value: { label: "Value", color },
  };

  if (!data.length) {
    return <div className={cn("w-full", className)} style={{ height }} />;
  }

  return (
    <ChartContainer
      config={config}
      className={cn("aspect-auto w-full", className)}
      style={{ height }}
      initialDimension={{ width: 120, height }}
    >
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

export { sparklineConfig };
