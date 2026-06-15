import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelDatum } from "@/hooks/sales/useSalesAnalytics";
import { EmptyState } from "./EmptyState";

interface PipelineFunnelCardProps {
  funnelData: FunnelDatum[];
}

export function PipelineFunnelCard({ funnelData }: PipelineFunnelCardProps) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        <CardDescription className="text-xs">
          Stage distribution from filtered lead dataset
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={120} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [v, "Leads"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No funnel data for selected filters" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
