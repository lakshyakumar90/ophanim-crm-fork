"use client";

import { format } from "date-fns";
import useSWR from "swr";
import { Bell, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hrAnalyticsApi } from "@/lib/api";

export function AlertsCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/alerts",
    () => hrAnalyticsApi.alerts(),
    { revalidateOnFocus: false, refreshInterval: 30000 },
  );

  const alerts = data?.alerts || [];

  if (error) {
    return (
      <Card className="md:col-span-1 border-rose-100/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-destructive">
          Failed to load alerts
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-1 border-rose-100/50 shadow-sm relative overflow-hidden flex flex-col min-h-67">
      <div className="absolute top-0 w-full h-1 bg-linear-to-r from-orange-400 to-rose-500" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            Action Required
          </div>
          {alerts.length > 0 && (
            <Badge
              variant="destructive"
              className="rounded-full w-6 h-6 flex items-center justify-center p-0"
            >
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>System alerts & compliance updates</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {isLoading ? (
            <div className="h-20 bg-muted rounded animate-pulse" />
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50/40 text-muted-foreground py-10 px-4">
              <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500/60" />
              <p className="text-sm font-semibold text-emerald-700">
                All caught up!
              </p>
              <p className="text-xs text-emerald-600">No pending alerts.</p>
            </div>
          ) : (
            alerts.map((alert: any) => (
              <div
                key={alert.id}
                className="relative flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    alert.type === "error"
                      ? "bg-red-500"
                      : alert.type === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none mb-1">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 font-medium">
                    {format(new Date(alert.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 rounded-full"
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
