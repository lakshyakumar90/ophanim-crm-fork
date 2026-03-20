"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { tasksApi } from "@/lib/api";
import { getDepartments } from "@/lib/supabase-queries";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIST, formatDistanceToNowIST } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";
import {
  CheckSquare,
  Search,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  Trash2,
  Check,
} from "lucide-react";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

type StatusFilter = "all" | "todo" | "in_progress" | "completed" | "cancelled";
type PriorityFilter = "all" | "low" | "medium" | "high";

const statusLabel: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function GlobalTasksPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: deptData } = useSWR("departments", () => getDepartments(), {
    revalidateOnFocus: false,
  });
  const departments: any[] = Array.isArray(deptData) ? deptData : [];
  const departmentMap = useMemo(
    () => new Map<string, any>(departments.map((d: any) => [d.id, d])),
    [departments],
  );

  const {
    data: tasksRes,
    isLoading,
    mutate,
  } = useSWR(
    ["global-tasks", status, priority, search],
    async () => {
      const res = await tasksApi.list({
        page: 1,
        limit: 200,
        status: status === "all" ? undefined : status,
        priority: priority === "all" ? undefined : priority,
        search: search || undefined,
        sortBy: "due_date",
        sortOrder: "asc",
      });
      return res;
    },
    { revalidateOnFocus: false },
  );

  useHeaderRefresh({ onRefresh: async () => { await mutate(); } });

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const tasks: any[] = tasksRes?.data || [];
  const projectMgmtDept = useMemo(
    () => departments.find((d: any) => d.slug === "project-management"),
    [departments],
  );

  const normalized = useMemo(() => {
    return tasks.map((t: any) => {
      const due = t.dueDate || t.due_date || null;
      const projectId = t.projectId || t.project_id || null;
      // Prefer task.department_id, fall back to assigned_user.department_id (RBAC-driven departments)
      let deptId =
        t.departmentId ||
        t.department_id ||
        t.department?.id ||
        t.assignedUser?.departmentId ||
        t.assignedUser?.department_id ||
        t.assigned_user?.department_id ||
        "none";
      let deptName =
        t.department?.name ||
        (deptId !== "none" ? departmentMap.get(deptId)?.name : null) ||
        "No Department";
      // Project tasks without department: infer Project Management
      if (projectId && deptId === "none" && projectMgmtDept) {
        deptId = projectMgmtDept.id;
        deptName = projectMgmtDept.name;
      }
      const deptSlug = deptId !== "none" ? departmentMap.get(deptId)?.slug : null;
      return {
        ...t,
        _due: due,
        _deptId: deptId,
        _deptName: deptName,
        _deptSlug: deptSlug,
        _projectId: projectId,
        _isOverdue:
          !!due &&
          due < nowIso &&
          t.status !== "completed" &&
          t.status !== "cancelled",
      };
    });
  }, [tasks, departmentMap, projectMgmtDept, nowIso]);

  const filtered = useMemo(() => {
    if (departmentId === "all") return normalized;
    return normalized.filter((t: any) => t._deptId === departmentId);
  }, [normalized, departmentId]);

  const overdueCount = useMemo(() => filtered.filter((t: any) => t._isOverdue).length, [filtered]);

  const canCreate = !!user;
  void isAdmin;
  void isManager;

  const onSearchChange = useCallback((v: string) => setSearch(v), []);

  const handleMarkComplete = useCallback(async (taskId: string) => {
    try {
      await tasksApi.update(taskId, { status: "completed" });
      void mutate();
    } catch (err) {
      console.error(err);
    }
  }, [mutate]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await tasksApi.delete(taskId);
      void mutate();
    } catch (err) {
      console.error(err);
    }
  }, [mutate]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            All tasks you have access to, across departments.
          </p>
        </div>
        {canCreate && <CreateTaskDialog onSuccess={() => mutate()} />}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base font-semibold">Filters</CardTitle>
              <CardDescription>Search and narrow tasks quickly</CardDescription>
            </div>
            {overdueCount > 0 && (
              <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9"
            />
          </div>

          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={(v) => setPriority(v as PriorityFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentId} onValueChange={(v) => setDepartmentId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="none">No Department</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Results
            <Badge variant="secondary" className="text-xs">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No tasks found</p>
              <p className="text-xs mt-1">Try changing filters or search</p>
            </div>
          ) : (
            filtered.map((t: any) => {
              const due = t._due;
              const statusVal = t.status;
              const isOverdue = t._isOverdue;
              const projectId = t._projectId;
              const deptSlug = t._deptSlug || t.department?.slug || t.departmentSlug || null;
              const href = projectId
                ? `/projects/${projectId}/tasks?taskId=${t.id}`
                : deptSlug === "sales"
                  ? `/sales/tasks/${t.id}`
                  : `/tasks/${t.id}`;

              return (
                <div key={t.id} className="p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{t.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {statusLabel[statusVal] || statusVal}
                        </Badge>
                        {t.priority && (
                          <Badge variant="outline" className={cn("text-xs", priorityBadge[t.priority] || "")}>
                            {t.priority}
                          </Badge>
                        )}
                        {t._deptName && (
                          <Badge variant="outline" className="text-xs">
                            {t._deptName}
                          </Badge>
                        )}
                        {due && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs flex items-center gap-1",
                              isOverdue ? "border-red-200 text-red-700 bg-red-50" : "",
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {formatIST(due, "MMM d, h:mm a")}
                            <span className="opacity-60">({formatDistanceToNowIST(due)} )</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {statusVal !== "completed" && statusVal !== "cancelled" && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Mark Done" onClick={() => handleMarkComplete(t.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete task" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open task">
                        <Link href={href}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

