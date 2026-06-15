import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityPoint } from "@/hooks/sales/useSalesAnalytics";
import { EmptyState } from "./EmptyState";
import { SummaryBadge } from "./SummaryBadge";

interface ActivityTrendsCardProps {
  activityData: ActivityPoint[];
  totalActivities: number;
  totalStatusChanges: number;
  totalNotes: number;
}

export function ActivityTrendsCard({
  activityData,
  totalActivities,
  totalStatusChanges,
  totalNotes,
}: ActivityTrendsCardProps) {
  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity Trends</CardTitle>
        <CardDescription className="text-xs">
          Tracked activity only (status changes, comments, and total actions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#334155" name="Total Activities" radius={[3, 3, 0, 0]} />
                <Bar dataKey="status_change" fill="#3b82f6" name="Status Changes" radius={[3, 3, 0, 0]} />
                <Bar dataKey="comment" fill="#10b981" name="Comments" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No tracked activity for selected filters" />
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <SummaryBadge label="Total Activities" value={totalActivities} />
          <SummaryBadge label="Status Changes" value={totalStatusChanges} />
          <SummaryBadge label="Comments" value={totalNotes} />
        </div>
      </CardContent>
    </Card>
  );
}
