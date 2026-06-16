"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { CalendarClock, Plus } from "lucide-react";
import { shiftsApi } from "@/lib/api";
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
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { CreateShiftModal } from "@/components/hr/shifts/CreateShiftModal";

export default function ShiftsPage() {
  const { user, can } = useAuth();
  const isAdmin = useIsAdmin();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const isHrView =
    can("hr:attendance_view") ||
    can("hr:attendance_manage") ||
    can("hr:manage");
  const canManage = can("hr:attendance_manage") || isAdmin;

  const { data, isLoading, mutate } = useSWR(
    user ? ["shifts", isHrView] : null,
    () => (isHrView ? shiftsApi.list({ limit: 50 }) : shiftsApi.getMyShifts()),
  );

  const shifts = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarClock className="h-6 w-6 text-primary" />
            {isHrView ? "Shift Schedule" : "My Shifts"}
          </h1>
          <p className="text-muted-foreground">
            {isHrView ? "Manage employee shift schedules" : "Your upcoming shifts"}
          </p>
        </div>
        {canManage ? (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create shift
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {isHrView && <TableHead>Employee</TableHead>}
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isHrView ? 5 : 4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isHrView ? 5 : 4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No shifts scheduled
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.shift_date
                      ? format(new Date(s.shift_date), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  {isHrView && (
                    <TableCell>{s.user?.full_name ?? s.user_id ?? "—"}</TableCell>
                  )}
                  <TableCell>{s.start_time ?? "—"}</TableCell>
                  <TableCell>{s.end_time ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {s.shift_type ?? "regular"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateShiftModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={async () => {
          await mutate();
        }}
      />
    </div>
  );
}
