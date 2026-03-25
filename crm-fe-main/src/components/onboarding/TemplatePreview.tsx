"use client";

import { addDays, format } from "date-fns";
import type { TaskBuilderRow } from "./TaskBuilder";

interface TemplatePreviewProps {
  tasks: Pick<TaskBuilderRow, "task_name" | "due_days_from_joining">[];
  joiningDate: Date;
}

export function TemplatePreview({ tasks, joiningDate }: TemplatePreviewProps) {
  if (!tasks.length) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Add tasks to see due date preview.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
      <p className="text-sm font-medium">
        If joining date is {format(joiningDate, "d MMM yyyy")}, tasks would be due on:
      </p>
      <ul className="text-xs space-y-1.5 max-h-[220px] overflow-y-auto">
        {tasks.map((t, i) => {
          const due = addDays(joiningDate, t.due_days_from_joining ?? 0);
          return (
            <li key={i} className="flex justify-between gap-2 border-b border-border/50 pb-1 last:border-0">
              <span className="truncate">{t.task_name || "(Untitled)"}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {format(due, "d MMM yyyy")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
