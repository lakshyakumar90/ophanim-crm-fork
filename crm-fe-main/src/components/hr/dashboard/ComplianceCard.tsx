"use client";

import useSWR from "swr";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hrAnalyticsApi } from "@/lib/api";

export function ComplianceCard() {
  const { data, isLoading, error } = useSWR(
    "/hr/analytics/compliance",
    () => hrAnalyticsApi.compliance(),
    { revalidateOnFocus: false },
  );

  if (isLoading || error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
          <CardDescription>Documents & requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rose-100/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          Compliance Status
        </CardTitle>
        <CardDescription>Documents & requirements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-md bg-red-50 border border-red-100">
            <p className="text-2xl font-bold text-red-600">
              {data?.expiringDocumentsCount || 0}
            </p>
            <p className="text-xs text-red-700">Expiring Docs (30d)</p>
          </div>
          <div className="p-3 rounded-md bg-orange-50 border border-orange-100">
            <p className="text-2xl font-bold text-orange-600">
              {data?.probationEndingCount || 0}
            </p>
            <p className="text-xs text-orange-700">Probation Ending (30d)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
