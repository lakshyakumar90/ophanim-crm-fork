"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { Gauge, Users } from "lucide-react";
import { projectsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { ListPageLayout } from "@/components/shared/list-page-layout";

const ROLE_GROUPS = [
  { key: "projectManagers", label: "Project Managers", color: "bg-purple-500" },
  { key: "developers", label: "Developers", color: "bg-blue-500" },
  { key: "designers", label: "Designers", color: "bg-pink-500" },
  { key: "seoSpecialists", label: "SEO Specialists", color: "bg-emerald-500" },
  { key: "contentWriters", label: "Content Writers", color: "bg-amber-500" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CapacityPage() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user ? ["project-resources"] : null,
    () => projectsApi.getResources(),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const summary = useMemo(() => {
    const rows = ROLE_GROUPS.map((group) => {
      const members = (data as Record<string, { id: string; full_name: string }[] | undefined>)?.[group.key] ?? [];
      return { ...group, members };
    });
    const total = rows.reduce((sum, r) => sum + r.members.length, 0);
    return { rows, total };
  }, [data]);

  return (
    <ListPageLayout
      className="p-3 lg:p-4"
      title="Team Capacity"
      description={`${summary.total} available resources across project roles`}
      icon={<Gauge className="h-4 w-4 text-primary" />}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: "Capacity" },
      ]}
    >
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">By role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.rows.map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${row.color}`} />
                    <span className="text-sm truncate">{row.label}</span>
                  </div>
                  <Badge variant="secondary">{row.members.length}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Resource roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {summary.rows.map((row) =>
                  row.members.length === 0 ? null : (
                    <div key={row.key} className="px-6 py-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${row.color}`} />
                        <h3 className="text-sm font-semibold">{row.label}</h3>
                        <span className="text-xs text-muted-foreground">({row.members.length})</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {row.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {initials(member.full_name || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{member.full_name}</p>
                              <p className="text-xs text-muted-foreground">Available</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
                {summary.total === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No resources found for the selected roles.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ListPageLayout>
  );
}
