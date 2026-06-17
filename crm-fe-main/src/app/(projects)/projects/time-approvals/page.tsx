"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Clock, Check, X } from "lucide-react";
import { timeEntriesApi, type TimeEntry } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export default function TimeApprovalsPage() {
  const { user, can } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = useIsAdmin();
  const canApprove =
    isAdmin ||
    can("timesheets:approve") ||
    can("timesheets:manage");

  const { data, isLoading, mutate } = useSWR(
    user ? ["time-approvals"] : null,
    () => timeEntriesApi.list({ status: "submitted" }),
  );

  const entries: TimeEntry[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const handleApprove = async (id: string) => {
    try {
      await timeEntriesApi.approve(id);
      toast.success("Approved");
      mutate();
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await timeEntriesApi.reject(id, reason);
      toast.success("Rejected");
      mutate();
    } catch {
      toast.error("Failed to reject");
    }
  };

  return (
    <ListPageLayout
      className="p-3 lg:p-4"
      title="Time Approvals"
      description="Review and approve submitted timesheets"
      icon={<Clock className="h-4 w-4 text-primary" />}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: "Time Approvals" },
      ]}
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Hours</TableHead>
              {canApprove && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canApprove ? 5 : 4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canApprove ? 5 : 4} className="py-8 text-center text-muted-foreground">
                  No pending approvals
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.user?.full_name ?? entry.userId}</TableCell>
                  <TableCell>
                    {format(new Date(entry.entryDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{entry.project?.name ?? entry.projectId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.hours}h</Badge>
                  </TableCell>
                  {canApprove && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleApprove(entry.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(entry.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ListPageLayout>
  );
}
