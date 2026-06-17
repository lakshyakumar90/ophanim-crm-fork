"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Network } from "lucide-react";
import { orgChartApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { OrgChartTree } from "@/components/hr/org-chart/org-chart-tree";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export default function OrgChartPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user ? ["org-chart"] : null,
    () => orgChartApi.get(),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const roots = Array.isArray(data) ? data : (data as { roots?: unknown[] })?.roots ?? [];
  const totalEmployees = (data as { total_employees?: number })?.total_employees;

  return (
    <ListPageLayout
      className="p-3 lg:p-4"
      title="Organization Chart"
      description={
        totalEmployees
          ? `${totalEmployees} active employees · department clusters and reporting lines`
          : "Company hierarchy and reporting structure"
      }
      icon={<Network className="h-4 w-4 text-primary" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Org Chart" },
      ]}
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : roots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No org chart data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add reporting managers in employee profiles to build the hierarchy.
          </CardContent>
        </Card>
      ) : (
        <OrgChartTree roots={roots as Parameters<typeof OrgChartTree>[0]["roots"]} />
      )}
    </ListPageLayout>
  );
}
