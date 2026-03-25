"use client";

import { TaskRow } from "./TaskRow";
import type { OnboardingTask, ChecklistTaskStatusApi } from "@/types/onboarding";

interface TaskListProps {
  checklistId: string;
  tasks: OnboardingTask[];
  canEdit: boolean;
  onUpdate: (
    checklistId: string,
    taskIndex: number,
    body: { status: ChecklistTaskStatusApi; notes?: string },
  ) => Promise<void>;
  compact?: boolean;
}

export function TaskList({ checklistId, tasks, canEdit, onUpdate, compact }: TaskListProps) {
  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center border rounded-md bg-muted/20">
        No tasks on this checklist yet.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskRow
            key={`${checklistId}-${index}`}
            checklistId={checklistId}
            taskIndex={index}
            task={task}
            canEdit={canEdit}
            onUpdate={onUpdate}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th className="py-2 px-3 font-medium">Task</th>
            <th className="py-2 px-3 font-medium">Owner / Role</th>
            <th className="py-2 px-3 font-medium">Due</th>
            <th className="py-2 px-3 font-medium">Status</th>
            <th className="py-2 px-3 font-medium">Notes</th>
            <th className="py-2 px-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <TaskRow
              key={`${checklistId}-${index}`}
              checklistId={checklistId}
              taskIndex={index}
              task={task}
              canEdit={canEdit}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
