"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  statusBadgeClass,
  statusLabel,
  daysLateWhenCompletingFromOverdue,
} from "@/lib/onboarding-utils";
import type { OnboardingTask, ChecklistTaskStatusApi } from "@/types/onboarding";
import { toast } from "sonner";

const STATUSES: ChecklistTaskStatusApi[] = ["pending", "done", "overdue"];

interface TaskRowProps {
  checklistId: string;
  taskIndex: number;
  task: OnboardingTask;
  canEdit: boolean;
  onUpdate: (
    checklistId: string,
    taskIndex: number,
    body: { status: ChecklistTaskStatusApi; notes?: string },
  ) => Promise<void>;
  compact?: boolean;
}

export function TaskRow({
  checklistId,
  taskIndex,
  task,
  canEdit,
  onUpdate,
  compact,
}: TaskRowProps) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [saving, setSaving] = useState(false);

  const dueLabel =
    task.due_date && isValid(parseISO(task.due_date))
      ? format(parseISO(task.due_date), "d MMM yyyy")
      : "—";

  const ownerLabel = task.assigned_role || task.owner || "—";

  const handleStatus = async (status: ChecklistTaskStatusApi) => {
    if (!canEdit) return;
    const wasOverdue = task.status === "overdue";
    setSaving(true);
    try {
      await onUpdate(checklistId, taskIndex, { status, notes: notes || undefined });
      if (status === "done") {
        const late = wasOverdue ? daysLateWhenCompletingFromOverdue(task) : null;
        toast.success(
          late != null && late > 0
            ? `Task marked complete — completed late (${late} day${late === 1 ? "" : "s"} overdue)`
            : "Task marked complete",
        );
      }
    } catch {
      toast.error("Could not update task");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!canEdit) return;
    if ((notes || "") === (task.notes ?? "")) return;
    setSaving(true);
    try {
      await onUpdate(checklistId, taskIndex, {
        status: task.status,
        notes: notes || undefined,
      });
      toast.success("Notes saved");
    } catch {
      toast.error("Could not save notes");
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 border rounded-md px-3 py-2 bg-background text-sm">
        <span className="font-medium flex-1 min-w-[140px]">{task.task_name}</span>
        <Badge variant="outline" className={statusBadgeClass(task.status)}>
          {statusLabel(task.status)}
        </Badge>
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            disabled={saving || task.status === "done"}
            onClick={() => handleStatus("done")}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Done
          </Button>
        )}
      </div>
    );
  }

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 pr-3 align-top font-medium">{task.task_name}</td>
      <td className="py-3 pr-3 align-top text-muted-foreground text-sm">{ownerLabel}</td>
      <td className="py-3 pr-3 align-top text-sm whitespace-nowrap">{dueLabel}</td>
      <td className="py-3 pr-3 align-top">
        {canEdit ? (
          <Select
            value={task.status}
            disabled={saving}
            onValueChange={(v) => handleStatus(v as ChecklistTaskStatusApi)}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className={statusBadgeClass(task.status)}>
            {statusLabel(task.status)}
          </Badge>
        )}
      </td>
      <td className="py-3 pr-3 align-top min-w-[160px]">
        {canEdit ? (
          <div className="flex gap-1">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Notes"
              className="h-8 text-sm"
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{task.notes || "—"}</span>
        )}
      </td>
      <td className="py-3 align-top text-right">
        {canEdit && task.status !== "done" && (
          <Button size="sm" variant="outline" disabled={saving} onClick={() => handleStatus("done")}>
            Mark complete
          </Button>
        )}
      </td>
    </tr>
  );
}
