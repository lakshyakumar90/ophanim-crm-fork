"use client";

import { format, parseISO, isValid, isToday, isBefore, startOfDay } from "date-fns";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingTask } from "@/types/onboarding";
import { statusLabel } from "@/lib/onboarding-utils";

interface TaskTimelineProps {
  tasks: OnboardingTask[];
}

export function TaskTimeline({ tasks }: TaskTimelineProps) {
  const sorted = [...tasks].sort((a, b) => {
    const da = a.due_date && isValid(parseISO(a.due_date)) ? parseISO(a.due_date).getTime() : 0;
    const db = b.due_date && isValid(parseISO(b.due_date)) ? parseISO(b.due_date).getTime() : 0;
    return da - db;
  });

  const today = startOfDay(new Date());

  return (
    <div className="relative pl-8 space-y-0">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
      {sorted.map((task, i) => {
        const due = task.due_date && isValid(parseISO(task.due_date)) ? parseISO(task.due_date) : null;
        let marker: "done" | "overdue" | "today" | "future" | "nodate" = "nodate";
        if (task.status === "done") marker = "done";
        else if (task.status === "overdue") marker = "overdue";
        else if (due) {
          if (isToday(due)) marker = "today";
          else if (isBefore(due, today)) marker = "overdue";
          else marker = "future";
        }

        const Icon =
          marker === "done" ? CheckCircle2 : marker === "overdue" ? AlertCircle : Circle;

        return (
          <div key={i} className="relative pb-6 last:pb-2">
            <div
              className={cn(
                "absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background",
                marker === "done" && "border-emerald-500 text-emerald-600",
                marker === "overdue" && "border-red-500 text-red-600",
                marker === "today" && "border-blue-500 text-blue-600",
                marker === "future" && "border-muted-foreground/40 text-muted-foreground",
                marker === "nodate" && "border-border text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex justify-between gap-2 flex-wrap">
                <p className="font-medium">{task.task_name}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {due ? format(due, "d MMM yyyy") : "No due date"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {task.assigned_role || task.owner || "Unassigned"} · {statusLabel(task.status)}
              </p>
              {task.notes ? (
                <p className="text-xs mt-2 text-muted-foreground border-t pt-2">{task.notes}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
