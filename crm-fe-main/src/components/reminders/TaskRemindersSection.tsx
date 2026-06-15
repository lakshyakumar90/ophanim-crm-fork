"use client";

import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Filter, Check, Trash2, ArrowRight } from "lucide-react";
import type { RemindersPageState } from "@/hooks/shared/useRemindersPage";
import { getInitials } from "./reminders-utils";

type TaskRemindersSectionProps = Pick<
  RemindersPageState,
  | "filteredByDept"
  | "grouped"
  | "isLoading"
  | "showOwnerColumn"
  | "getTaskDeptSlug"
  | "handleMarkCompleteTask"
  | "handleDeleteTask"
  | "meta"
  | "page"
  | "setPage"
>;

export function TaskRemindersSection(props: TaskRemindersSectionProps) {
  const {
    filteredByDept,
    grouped,
    isLoading,
    showOwnerColumn,
    getTaskDeptSlug,
    handleMarkCompleteTask,
    handleDeleteTask,
    meta,
    page,
    setPage,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Task Reminders
          <Badge variant="secondary">{filteredByDept.length}</Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Department-wise table with filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : filteredByDept.length === 0 ? (
          <div className="text-sm text-muted-foreground">No task reminders found.</div>
        ) : (
          grouped
            .sort((a, b) => a.departmentName.localeCompare(b.departmentName))
            .map((group) => (
              <div key={group.departmentId}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.departmentName}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {group.tasks.length}
                    </Badge>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                    <Link href="/tasks">View tasks</Link>
                  </Button>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        {showOwnerColumn && <TableHead>User</TableHead>}
                        <TableHead>Due</TableHead>
                        <TableHead>Reminder</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.tasks.map((t: any) => {
                        const due = t.dueDate || t.due_date;
                        const rmin = t.reminderBeforeMinutes ?? t.reminder_before_minutes;
                        const projectId = t.projectId || t.project_id;
                        const deptSlug = getTaskDeptSlug(t);
                        const openHref = projectId
                          ? `/projects/${projectId}/tasks?taskId=${t.id}`
                          : deptSlug === "sales"
                            ? `/sales/tasks/${t.id}`
                            : `/tasks/${t.id}`;
                        const assigned = t.assignedUser || t.assigned_user;
                        const reminderAt =
                          due && rmin != null
                            ? new Date(new Date(due).getTime() - Number(rmin) * 60 * 1000).toISOString()
                            : null;
                        const nowIso = new Date().toISOString();
                        const isTaskOverdue =
                          !!due &&
                          due < nowIso &&
                          t.status !== "completed" &&
                          t.status !== "cancelled";
                        const isReminderOverdue = !!reminderAt && reminderAt < nowIso;
                        return (
                          <TableRow
                            key={t.id}
                            className={cn(
                              isTaskOverdue
                                ? "bg-red-200 hover:bg-red-300"
                                : isReminderOverdue
                                  ? "bg-amber-50/50 hover:bg-amber-100/50"
                                  : "",
                            )}
                          >
                            <TableCell className="font-medium max-w-[380px]">
                              <div className="truncate">{t.title}</div>
                              {t.project?.name && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {t.project.name}
                                </div>
                              )}
                            </TableCell>

                            {showOwnerColumn && (
                              <TableCell>
                                {assigned ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={assigned.avatarUrl || assigned.avatar_url || undefined} />
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(assigned.fullName || assigned.full_name || "U")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm truncate max-w-[160px]">
                                      {assigned.fullName || assigned.full_name || "Unknown"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            )}

                            <TableCell>{due ? format(new Date(due), "MMM d, yyyy h:mm a") : "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{rmin != null ? `${rmin} min before` : "-"}</span>
                                {isReminderOverdue && !isTaskOverdue && (
                                  <span className="text-[11px] text-amber-700 font-semibold">reminder overdue</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "capitalize",
                                  t.priority === "high" ? "border-red-200 text-red-700 bg-red-50" : "",
                                )}
                              >
                                {t.priority || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {t.status !== "completed" && t.status !== "cancelled" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    title="Mark done"
                                    onClick={() => handleMarkCompleteTask(t.id)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Delete task"
                                  onClick={() => handleDeleteTask(t.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Open task">
                                  <Link href={openHref}>
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {meta.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
