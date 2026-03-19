"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns";
import useSWR from "swr";
import { AlarmClock, Clock, AlertCircle, X, ChevronRight } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { getUpcomingReminders, getUpcomingLeadReminders } from "@/lib/supabase-queries";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function ReminderItem({ reminder }: { reminder: any }) {
  const router = useRouter();
  const dueDate = new Date(reminder.dueDate);
  const minutesUntilDue = differenceInMinutes(dueDate, new Date());

  let timeLabel = format(dueDate, "MMM d, h:mm a");
  if (isToday(dueDate)) {
    if (minutesUntilDue <= 0) {
      timeLabel = "Due now";
    } else if (minutesUntilDue < 60) {
      timeLabel = `Due in ${minutesUntilDue}m`;
    } else {
      timeLabel = `Due today at ${format(dueDate, "h:mm a")}`;
    }
  } else if (isTomorrow(dueDate)) {
    timeLabel = `Due tomorrow at ${format(dueDate, "h:mm a")}`;
  }

  const isUrgent = minutesUntilDue <= reminder.reminderBeforeMinutes;

  const priorityColors: Record<string, string> = {
    high: "text-red-500",
    medium: "text-amber-500",
    low: "text-blue-500",
  };

  return (
    <div
      onClick={() => {
        if (reminder.projectId) router.push(`/projects/${reminder.projectId}/tasks?taskId=${reminder.id}`);
        else router.push(`/sales/tasks/${reminder.id}`);
      }}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 cursor-pointer"
    >
      <div className="mt-0.5 shrink-0">
        {isUrgent ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Clock className="h-4 w-4 text-amber-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reminder.title}</p>
        <p className={cn("text-xs mt-0.5 font-medium", isUrgent ? "text-red-500" : "text-amber-600")}>
          {timeLabel}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
    </div>
  );
}

function LeadReminderItem({ reminder }: { reminder: any }) {
  const router = useRouter();
  const reminderDate = new Date(reminder.reminderAt);
  const minutesUntilDue = differenceInMinutes(reminderDate, new Date());

  let timeLabel = format(reminderDate, "MMM d, h:mm a");
  if (isToday(reminderDate)) {
    if (minutesUntilDue <= 0) {
      timeLabel = "Due now";
    } else if (minutesUntilDue < 60) {
      timeLabel = `Due in ${minutesUntilDue}m`;
    } else {
      timeLabel = `Today at ${format(reminderDate, "h:mm a")}`;
    }
  } else if (isTomorrow(reminderDate)) {
    timeLabel = `Tomorrow at ${format(reminderDate, "h:mm a")}`;
  }

  const isOverdue = minutesUntilDue <= 0;

  return (
    <div
      onClick={() => {
        if (reminder.leadId) router.push(`/sales/leads/${reminder.leadId}`);
      }}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 cursor-pointer"
    >
      <div className="mt-0.5 shrink-0">
        {isOverdue ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Clock className="h-4 w-4 text-amber-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {reminder.leadName || "Lead reminder"}
        </p>
        {reminder.note && (
          <p className="text-xs text-muted-foreground truncate">
            {reminder.note}
          </p>
        )}
        <p
          className={cn(
            "text-xs mt-0.5 font-medium",
            isOverdue ? "text-red-500" : "text-amber-600",
          )}
        >
          {timeLabel}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
    </div>
  );
}

export function StartupAlertsDialog() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const { data: reminders = [], isLoading: isLoadingTasks } = useSWR(
    user ? `startup-tasks-${user.id}` : null,
    () => getUpcomingReminders(user!.id),
    { revalidateOnFocus: false }
  );

  const { data: leadReminders = [], isLoading: isLoadingLeads } = useSWR(
    user ? `startup-leads-${user.id}` : null,
    () => getUpcomingLeadReminders(user!.id),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    // Only run this logic once when data has loaded and we haven't checked yet
    if (user && !isLoadingTasks && !isLoadingLeads && !hasChecked) {
      const hasShown = sessionStorage.getItem("crm_startup_alert_shown");
      
      if (!hasShown) {
        // Look for today's reminders or overdue ones
        const now = new Date();
        const todayTasks = reminders.filter((r: any) => isToday(new Date(r.dueDate)));
        const overdueLeads = leadReminders.filter((r: any) => new Date(r.reminderAt) < now);
        const todayLeads = leadReminders.filter((r: any) => 
          new Date(r.reminderAt) >= now && isToday(new Date(r.reminderAt))
        );

        if (todayTasks.length > 0 || overdueLeads.length > 0 || todayLeads.length > 0) {
          setIsOpen(true);
        }
        
        sessionStorage.setItem("crm_startup_alert_shown", "true");
      }
      setHasChecked(true);
    }
  }, [user, isLoadingTasks, isLoadingLeads, hasChecked, reminders, leadReminders]);

  if (!isOpen) return null;

  const now = new Date();
  const todayTasks = reminders.filter((r: any) => isToday(new Date(r.dueDate)));
  const overdueLeads = leadReminders.filter((r: any) => new Date(r.reminderAt) < now);
  const todayLeads = leadReminders.filter((r: any) => 
    new Date(r.reminderAt) >= now && isToday(new Date(r.reminderAt))
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-primary" />
            <DialogTitle>Today&apos;s Reminders</DialogTitle>
          </div>
          <DialogDescription>
            You have upcoming tasks and leads that need your attention.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Task Reminders */}
          {todayTasks.length > 0 && (
            <div className="mb-2">
              <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-t">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Task Reminders
                </span>
              </div>
              <div className="flex flex-col">
                {todayTasks.map((r: any) => (
                  <ReminderItem key={r.id} reminder={r} />
                ))}
              </div>
            </div>
          )}

          {/* Lead Reminders Overdue */}
          {overdueLeads.length > 0 && (
            <div className="mb-2">
              <div className="px-6 py-2 bg-red-50 dark:bg-red-950/30 border-b border-t -mt-px">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Overdue Lead Reminders
                </span>
              </div>
              <div className="flex flex-col">
                {overdueLeads.map((r: any) => (
                  <LeadReminderItem key={r.id} reminder={r} />
                ))}
              </div>
            </div>
          )}

          {/* Lead Reminders Today */}
          {todayLeads.length > 0 && (
            <div className="mb-2">
              <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-t -mt-px">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Upcoming Lead Reminders
                </span>
              </div>
              <div className="flex flex-col">
                {todayLeads.map((r: any) => (
                  <LeadReminderItem key={r.id} reminder={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/10">
          <Button onClick={() => setIsOpen(false)} className="w-full">
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
