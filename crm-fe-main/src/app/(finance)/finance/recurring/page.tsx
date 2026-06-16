"use client";

import { Suspense, useState, useCallback } from "react";
import useSWR from "swr";
import { recurringApi, type RecurringSchedule } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { CreateRecurringSheet } from "@/components/finance/recurring/CreateRecurringSheet";
import { RecurringDetailSheet } from "@/components/finance/recurring/RecurringDetailSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw as RefreshCwIcon,
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Eye,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringSchedulesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RecurringSchedulesPageContent />
    </Suspense>
  );
}

function RecurringSchedulesPageContent() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sheet = useSheetQuery();

  const { data, isLoading, mutate } = useSWR(
    user ? "recurring-schedules" : null,
    () => recurringApi.list({ limit: 50 }),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: handleRefresh,
    isRefreshing,
    enabled: Boolean(user),
  });

  const handlePause = async (id: string) => {
    try {
      await recurringApi.pause(id);
      toast.success("Schedule paused");
      mutate();
    } catch (error) {
      toast.error("Failed to pause schedule");
    }
  };

  const handleResume = async (id: string) => {
    try {
      await recurringApi.resume(id);
      toast.success("Schedule resumed");
      mutate();
    } catch (error) {
      toast.error("Failed to resume schedule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring schedule?"))
      return;
    try {
      await recurringApi.delete(id);
      toast.success("Schedule deleted");
      mutate();
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  const schedules = data?.data || [];

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Recurring Invoices
          </h1>
          <p className="text-muted-foreground">
            Manage automated invoice schedules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCwIcon
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {(isAdmin || isManager) && (
            <Button size="sm" onClick={sheet.openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No recurring schedules</p>
            {(isAdmin || isManager) && (
              <Button variant="link" className="mt-2" onClick={sheet.openCreate}>
                Create your first schedule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule: RecurringSchedule) => (
                <TableRow
                  key={schedule.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => sheet.openDetail(schedule.id)}
                >
                  <TableCell className="font-medium">{schedule.name}</TableCell>
                  <TableCell>
                    <div>
                      <p>{schedule.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.client_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {FREQUENCY_LABELS[schedule.frequency]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {schedule.next_run_date
                      ? format(new Date(schedule.next_run_date), "dd MMM yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(schedule.base_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        schedule.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }
                    >
                      {schedule.is_active ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => sheet.openDetail(schedule.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {schedule.is_active ? (
                          <DropdownMenuItem
                            onClick={() => handlePause(schedule.id)}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleResume(schedule.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(schedule.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>

    {(isAdmin || isManager) && (
      <CreateRecurringSheet
        open={sheet.createOpen}
        onOpenChange={(open) => (open ? sheet.openCreate() : sheet.closeCreate())}
        onCreated={() => mutate()}
      />
    )}
    <RecurringDetailSheet
      scheduleId={sheet.selectedId}
      open={Boolean(sheet.selectedId)}
      onOpenChange={(open) => !open && sheet.closeDetail()}
      onUpdated={() => mutate()}
    />
    </>
  );
}
