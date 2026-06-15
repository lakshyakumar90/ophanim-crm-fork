"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface PipelineChartDataItem {
  name: string;
  count: number;
  fill: string;
}

interface PipelineChartProps {
  pipelineChartData: PipelineChartDataItem[];
  pipelineMaxCount: number;
}

export function PipelineChart({
  pipelineChartData,
  pipelineMaxCount,
}: PipelineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
        <CardDescription>
          Deal distribution across pipeline stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pipelineChartData.length > 0 ? (
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pipelineChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  fontSize={12}
                  domain={[0, Math.max(5, pipelineMaxCount)]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px" }}
                  formatter={(v) => [v, "Leads"]}
                />
                <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                  {pipelineChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No pipeline data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
