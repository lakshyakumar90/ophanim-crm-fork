"use client";

import { AlarmClock, ChevronRight, Clock, Loader2, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getUpcomingReminders, getUpcomingLeadReminders } from "@/lib/supabase-queries";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns";
import useSWR from "swr";

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
    <button
      onClick={() => {
        if (reminder.projectId) router.push(`/projects/${reminder.projectId}/tasks?taskId=${reminder.id}`);
        else router.push(`/tasks/${reminder.id}`);
      }}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0"
    >
      <div className="mt-0.5 shrink-0">
        {isUrgent ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{reminder.title}</p>
        {reminder.projectName && (
          <p className="text-[10px] text-muted-foreground truncate">{reminder.projectName}</p>
        )}
        <p className={cn("text-[10px] mt-0.5 font-medium", isUrgent ? "text-red-500" : "text-amber-600")}>
          {timeLabel}
        </p>
      </div>
      <span className={cn("text-[10px] font-medium capitalize shrink-0 mt-0.5", priorityColors[reminder.priority] || "text-muted-foreground")}>
        {reminder.priority}
      </span>
    </button>
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
    <button
      onClick={() => {
        if (reminder.leadId) router.push(`/sales/leads/${reminder.leadId}`);
      }}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0"
    >
      <div className="mt-0.5 shrink-0">
        {isOverdue ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {reminder.leadName || "Lead reminder"}
        </p>
        {reminder.note && (
          <p className="text-[10px] text-muted-foreground truncate">
            {reminder.note}
          </p>
        )}
        <p
          className={cn(
            "text-[10px] mt-0.5 font-medium",
            isOverdue ? "text-red-500" : "text-amber-600",
          )}
        >
          {timeLabel}
        </p>
      </div>
    </button>
  );
}

export function RemindersPopover() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: reminders = [], isLoading, mutate } = useSWR(
    user ? `reminders-popover-${user.id}` : null,
    () => getUpcomingReminders(user!.id),
    { revalidateOnFocus: false, refreshInterval: 5 * 60 * 1000 },
  );

  const {
    data: leadReminders = [],
    isLoading: isLoadingLeadReminders,
    mutate: mutateLeadReminders,
  } = useSWR(
    user ? `lead-reminders-popover-${user.id}` : null,
    () => getUpcomingLeadReminders(user!.id),
    { revalidateOnFocus: false, refreshInterval: 5 * 60 * 1000 },
  );

  const now = new Date();
  const todayReminders = reminders.filter((r: any) =>
    isToday(new Date(r.dueDate)),
  );

  const overdueLeadReminders = leadReminders.filter(
    (r: any) => new Date(r.reminderAt) < now,
  );
  const nonOverdueLeadReminders = leadReminders.filter(
    (r: any) => new Date(r.reminderAt) >= now,
  );
  const todayLeadReminders = nonOverdueLeadReminders.filter((r: any) =>
    isToday(new Date(r.reminderAt)),
  );
  const upcomingLeadReminders = nonOverdueLeadReminders.filter(
    (r: any) => !isToday(new Date(r.reminderAt)),
  );

  const badgeCount =
    todayReminders.length + todayLeadReminders.length + overdueLeadReminders.length;

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          void Promise.all([mutate(), mutateLeadReminders()]);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-accent"
          aria-label="Reminders"
        >
          <AlarmClock className="h-5 w-5" />
          {badgeCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-amber-500 border-0">
              {badgeCount > 9 ? "9+" : badgeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <AlarmClock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Reminders</span>
          {badgeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-amber-100 text-amber-700">
              {badgeCount} today
            </Badge>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading || isLoadingLeadReminders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 && leadReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <AlarmClock className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No upcoming reminders</p>
              <p className="text-xs mt-1 opacity-70">Tasks with reminders will appear here</p>
            </div>
          ) : (
            <>
              {/* Today section */}
              {todayReminders.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/20 border-b">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Due Today</span>
                  </div>
                  {todayReminders.map((r: any) => (
                    <ReminderItem key={r.id} reminder={r} />
                  ))}
                </>
              )}

              {/* Lead overdue section */}
              {overdueLeadReminders.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-red-50 dark:bg-red-950/30 border-b">
                    <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wide">
                      Lead Reminders Overdue
                    </span>
                  </div>
                  {overdueLeadReminders.map((r: any) => (
                    <LeadReminderItem key={r.id} reminder={r} />
                  ))}
                </>
              )}

              {/* Lead due today (not yet overdue) */}
              {todayLeadReminders.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/20 border-b">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                      Lead Reminders Today
                    </span>
                  </div>
                  {todayLeadReminders.map((r: any) => (
                    <LeadReminderItem key={r.id} reminder={r} />
                  ))}
                </>
              )}

              {/* Upcoming section */}
              {reminders.filter((r: any) => !isToday(new Date(r.dueDate))).length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-muted/40 border-b">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Upcoming (48h)</span>
                  </div>
                  {reminders
                    .filter((r: any) => !isToday(new Date(r.dueDate)))
                    .map((r: any) => (
                      <ReminderItem key={r.id} reminder={r} />
                    ))}
                </>
              )}

              {/* Upcoming lead reminders */}
              {upcomingLeadReminders.length > 0 && (
                <>
                  <div className="px-4 py-1.5 bg-muted/40 border-b">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Lead Upcoming (48h)
                    </span>
                  </div>
                  {upcomingLeadReminders.map((r: any) => (
                    <LeadReminderItem key={r.id} reminder={r} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <button
            onClick={() => router.push("/reminders")}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            View All Reminders
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
