"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Network } from "lucide-react";
import { orgChartApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

function OrgNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const children = node.children ?? node.reports ?? [];
  return (
    <div className={depth > 0 ? "ml-6 border-l pl-4" : ""}>
      <Card className="mb-2">
        <CardContent className="py-3 text-sm">
          <p className="font-medium">{node.full_name ?? node.name}</p>
          <p className="text-muted-foreground">
            {node.designation || node.job_title || node.role?.replace(/_/g, " ") || "—"}
          </p>
          {node.department_name ? (
            <p className="text-xs text-muted-foreground mt-1">{node.department_name}</p>
          ) : null}
        </CardContent>
      </Card>
      {children.map((child: any) => (
        <OrgNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

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

  const roots = Array.isArray(data) ? data : (data as any)?.roots ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Network className="h-6 w-6 text-primary" />
          Organization Chart
        </h1>
        <p className="text-muted-foreground">Company hierarchy and reporting structure</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : roots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No org chart data</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        roots.map((node: any) => <OrgNode key={node.id} node={node} />)
      )}
    </div>
  );
}
