"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { Pause, Play, Trash2 } from "lucide-react";
import { recurringApi, type RecurringSchedule } from "@/lib/finance-api";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function RecurringDetailSheet({
  scheduleId,
  open,
  onOpenChange,
  onUpdated,
}: {
  scheduleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const canManage = isAdmin || isManager;

  const { data: schedule, isLoading, mutate } = useSWR<RecurringSchedule>(
    user && scheduleId && open ? ["recurring-schedule", scheduleId] : null,
    () => recurringApi.get(scheduleId!),
  );

  const refresh = async () => {
    await mutate();
    onUpdated?.();
  };

  const handlePause = async () => {
    if (!scheduleId) return;
    try {
      await recurringApi.pause(scheduleId);
      toast.success("Schedule paused");
      refresh();
    } catch {
      toast.error("Failed to pause");
    }
  };

  const handleResume = async () => {
    if (!scheduleId) return;
    try {
      await recurringApi.resume(scheduleId);
      toast.success("Schedule resumed");
      refresh();
    } catch {
      toast.error("Failed to resume");
    }
  };

  const handleDelete = async () => {
    if (!scheduleId || !confirm("Delete this schedule?")) return;
    try {
      await recurringApi.delete(scheduleId);
      toast.success("Schedule deleted");
      onOpenChange(false);
      onUpdated?.();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={schedule?.name || "Recurring schedule"}
      description={schedule?.client_name}
      size="lg"
      footer={
        canManage && schedule ? (
          <div className="flex flex-wrap justify-end gap-2">
            {schedule.is_active ? (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" onClick={handleResume}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )}
            <Button variant="outline" className="text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !schedule ? (
        <p className="text-muted-foreground text-sm">Schedule not found.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <Badge variant="outline" className="capitalize">
            {schedule.is_active ? "Active" : "Paused"}
          </Badge>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Frequency</p>
              <p className="font-medium">
                {FREQUENCY_LABELS[schedule.frequency] || schedule.frequency}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">
                ₹{Number(schedule.base_amount || 0).toLocaleString()}
              </p>
            </div>
            {schedule.next_run_date && (
              <div>
                <p className="text-muted-foreground">Next run</p>
                <p className="font-medium">
                  {format(new Date(schedule.next_run_date), "dd MMM yyyy")}
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Client</p>
            <p>{schedule.client_name}</p>
            <p className="text-muted-foreground">{schedule.client_email}</p>
          </div>
        </div>
      )}
    </FormSideSheet>
  );
}
