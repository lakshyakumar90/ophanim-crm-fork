"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { tasksApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Clock, AlertTriangle } from "lucide-react";

export default function TaskDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    tasksApi
      .get(id)
      .then((t) => mounted && setTask(t))
      .catch(() => mounted && setTask(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  const due = task?.dueDate || task?.due_date || null;
  const projectId = task?.projectId || task?.project_id || null;
  const relatedLeadId = task?.relatedLeadId || task?.related_lead_id || null;
  const reminderMin = task?.reminderBeforeMinutes ?? task?.reminder_before_minutes ?? null;

  const nowIso = useMemo(() => new Date().toISOString(), []);
  const isOverdue =
    !!due &&
    due < nowIso &&
    task?.status !== "completed" &&
    task?.status !== "cancelled";

  const reminderAt = useMemo(() => {
    if (!due || reminderMin == null) return null;
    const dueMs = new Date(due).getTime();
    return new Date(dueMs - Number(reminderMin) * 60 * 1000).toISOString();
  }, [due, reminderMin]);

  const isReminderOverdue = !!reminderAt && reminderAt < nowIso;

  const primaryOpenHref = projectId
    ? `/projects/${projectId}/tasks?taskId=${id}`
    : relatedLeadId
      ? `/sales/tasks/${id}`
      : `/tasks?taskId=${id}`;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" /> Back to Tasks
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href={primaryOpenHref}>
            Open in context <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {task?.title || (loading ? "Loading..." : "Task")}
            {isOverdue && (
              <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
              </Badge>
            )}
            {isReminderOverdue && !isOverdue && (
              <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                <Clock className="h-3 w-3 mr-1" /> Reminder due
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {task?.status ? `Status: ${task.status}` : " "}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading task...</p>
          ) : !task ? (
            <p className="text-sm text-muted-foreground">Task not found or you don’t have access.</p>
          ) : (
            <>
              {task.description && <p className="text-sm whitespace-pre-wrap">{task.description}</p>}

              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Due</p>
                  <p className={cn(isOverdue ? "text-red-700 font-semibold" : "")}>
                    {due ? formatIST(due, "MMM d, yyyy h:mm a") : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reminder</p>
                  <p className={cn(isReminderOverdue ? "text-amber-700 font-semibold" : "")}>
                    {reminderMin != null ? `${reminderMin} minutes before` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p>{task.department?.name || task.departmentName || "No department"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="capitalize">{task.priority || "-"}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

