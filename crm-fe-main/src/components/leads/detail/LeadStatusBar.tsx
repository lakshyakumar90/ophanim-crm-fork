"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, CheckCircle, Clock, Loader2 } from "lucide-react";
import { getAllStatuses } from "@/lib/lead-status-config";
import { toLocaleStringIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

interface PendingReminder {
  id: string;
  reminderAt: string;
  note: string | null;
}

interface LeadStatusBarProps {
  lead: Lead;
  pendingReminders: PendingReminder[];
  isReminderOverdue: (reminderAt: string) => boolean;
  onMarkReminderDone: (reminderId: string) => void;
  onStatusChange: (status: string) => void;
  isChangingStatus: boolean;
}

export function LeadStatusBar({
  lead,
  pendingReminders,
  isReminderOverdue,
  onMarkReminderDone,
  onStatusChange,
  isChangingStatus,
}: LeadStatusBarProps) {
  return (
    <>
      {pendingReminders.length > 0 && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-800">
              {pendingReminders.length} Active Reminder
              {pendingReminders.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {pendingReminders.map((reminder) => {
              const isOverdue = isReminderOverdue(reminder.reminderAt);
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md",
                    isOverdue
                      ? "bg-red-100 border border-red-300"
                      : "bg-amber-100 border border-amber-300",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Clock
                      className={cn(
                        "h-4 w-4",
                        isOverdue ? "text-red-600" : "text-amber-600",
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-medium text-sm",
                          isOverdue ? "text-red-800" : "text-amber-800",
                        )}
                      >
                        {isOverdue ? "OVERDUE: " : ""}
                        {toLocaleStringIST(reminder.reminderAt)}
                      </p>
                      {reminder.note && (
                        <p className="text-sm text-slate-600 mt-0.5">
                          {reminder.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "shrink-0",
                      isOverdue
                        ? "border-red-400 text-red-700 hover:bg-red-200"
                        : "border-amber-400 text-amber-700 hover:bg-amber-200",
                    )}
                    onClick={() => onMarkReminderDone(reminder.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Done
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Status:</span>
        <Select
          value={lead.status}
          onValueChange={onStatusChange}
          disabled={isChangingStatus}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getAllStatuses().map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isChangingStatus && (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        )}
      </div>
    </>
  );
}
