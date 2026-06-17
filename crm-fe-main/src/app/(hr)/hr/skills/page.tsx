"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Plus, Sparkles } from "lucide-react";
import { skillsApi } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { CreateSkillModal } from "@/components/hr/skills/CreateSkillModal";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export default function SkillsPage() {
  const { user, can } = useAuth();
  const canManage = can("skills:manage") || can("hr:manage");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    user ? ["hr-skills"] : null,
    () => skillsApi.list({ limit: 100 }),
  );

  const skills = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  return (
    <ListPageLayout
      title="Skills"
      description="Skills catalog and competency tracking"
      icon={<Sparkles className="h-4 w-4 text-primary" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Skills" },
      ]}
      actions={
        canManage ? (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add skill
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : skills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No skills defined
                </TableCell>
              </TableRow>
            ) : (
              skills.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.category ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {s.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateSkillModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          await mutate();
        }}
      />
    </ListPageLayout>
  );
}
