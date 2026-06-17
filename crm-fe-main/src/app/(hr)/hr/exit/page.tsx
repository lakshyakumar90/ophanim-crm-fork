"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { LogOut, Plus } from "lucide-react";
import { exitApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { StartExitChecklistModal } from "@/components/hr/exit/StartExitChecklistModal";
import { ListPageLayout } from "@/components/shared/list-page-layout";

function countCompletedItems(checklist: {
  template_json?: Array<{ id?: string; title?: string }>;
  completed_items?: string[];
}) {
  const template = Array.isArray(checklist.template_json) ? checklist.template_json : [];
  const completed = new Set(
    Array.isArray(checklist.completed_items) ? checklist.completed_items : [],
  );
  if (template.length === 0) return null;
  const done = template.filter((item, index) => {
    const key = item.id || item.title || String(index);
    return completed.has(key);
  }).length;
  return { done, total: template.length };
}

export default function ExitPage() {
  const { user, can } = useAuth();
  const canManage = can("hr:manage");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user && canManage ? ["exit-checklists"] : null,
    () => exitApi.list({ limit: 50 }),
  );

  const checklists = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user && canManage) });

  if (!canManage) {
    return (
      <div className="text-muted-foreground">
        You do not have permission to manage exit workflows.
      </div>
    );
  }

  return (
    <ListPageLayout
      title="Exit Management"
      description="Offboarding checklists and exit workflows"
      icon={<LogOut className="h-4 w-4 text-primary" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Exit" },
      ]}
      actions={
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Start checklist
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : checklists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active exit checklists
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checklists.map((c: any) => {
            const progress = countCompletedItems(c);
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {c.employee?.full_name ?? c.user_id}
                    </CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {c.status ?? "in_progress"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {c.last_working_day && (
                    <p>
                      Last day:{" "}
                      {format(new Date(c.last_working_day), "MMM d, yyyy")}
                    </p>
                  )}
                  {progress ? (
                    <p>
                      {progress.done} / {progress.total} items completed
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StartExitChecklistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          await mutate();
        }}
      />
    </ListPageLayout>
  );
}
