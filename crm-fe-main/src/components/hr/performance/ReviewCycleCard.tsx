"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReviewCycleRow, ReviewFrequency } from "@/types/performance";
import { deadlineUrgency } from "@/lib/performanceHelpers";
import { CalendarDays, ChevronRight, Trash2 } from "lucide-react";

function freqLabel(f?: string | null): string {
  switch (f as ReviewFrequency | undefined) {
    case "quarterly":
      return "Quarterly";
    case "half_yearly":
      return "Half-yearly";
    case "annual":
      return "Annual";
    default:
      return f || "—";
  }
}

function scopeLabel(scope: string, departmentId?: string | null): string {
  if (scope === "department") return departmentId ? "Department" : "Department";
  return "All employees";
}

export function ReviewCycleCard({
  cycle,
  selfDonePct,
  onView,
  onActivate,
  onEdit,
  onDelete,
  canManage,
}: {
  cycle: ReviewCycleRow;
  selfDonePct?: number;
  onView: () => void;
  onActivate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canManage: boolean;
}) {
  const completed = cycle.status === "completed";
  const selfU = deadlineUrgency(cycle.self_assessment_deadline ?? null, completed);
  const mgrU = deadlineUrgency(cycle.manager_review_deadline ?? null, completed);

  const statusBadge =
    cycle.status === "draft" ? (
      <Badge variant="secondary" className="bg-muted">
        Draft
      </Badge>
    ) : cycle.status === "active" ? (
      <Badge className="bg-blue-600 hover:bg-blue-600">Active</Badge>
    ) : (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">Completed</Badge>
    );

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-tight pr-2">{cycle.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {statusBadge}
              <Badge variant="outline">{freqLabel(cycle.frequency)}</Badge>
              <Badge variant="outline">{scopeLabel(cycle.scope, cycle.department_id)}</Badge>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>
              Self-assessment:{" "}
              {cycle.self_assessment_deadline
                ? format(new Date(cycle.self_assessment_deadline), "MMM d, yyyy")
                : "—"}
            </span>
            {selfU === "soon" ? (
              <Badge className="text-[10px] bg-amber-100 text-amber-950 border-amber-200">Due soon</Badge>
            ) : null}
            {selfU === "overdue" && !completed ? (
              <Badge variant="destructive" className="text-[10px]">
                Overdue
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <CalendarDays className="h-3 w-3 shrink-0" />
            <span>
              Manager review:{" "}
              {cycle.manager_review_deadline
                ? format(new Date(cycle.manager_review_deadline), "MMM d, yyyy")
                : "—"}
            </span>
            {mgrU === "soon" ? (
              <Badge className="text-[10px] bg-amber-100 text-amber-950 border-amber-200">Due soon</Badge>
            ) : null}
            {mgrU === "overdue" && !completed ? (
              <Badge variant="destructive" className="text-[10px]">
                Overdue
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {typeof selfDonePct === "number" ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Self-assessments submitted</span>
              <span>{Math.round(selfDonePct)}%</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, selfDonePct))} className="h-2" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Open cycle to see participant progress.</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="default" className="gap-1" onClick={onView}>
          View cycle
          <ChevronRight className="h-4 w-4" />
        </Button>
        {canManage && cycle.status === "draft" && onActivate ? (
          <Button variant="secondary" onClick={onActivate}>
            Activate
          </Button>
        ) : null}
        {canManage && cycle.status === "draft" && onEdit ? (
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {canManage && cycle.status === "draft" && onDelete ? (
          <Button variant="destructive" onClick={onDelete} className="gap-1">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
