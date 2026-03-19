"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { format } from "date-fns";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { tasksApi, usersApi, leadsApi } from "@/lib/api";
import { getDepartments } from "@/lib/supabase-queries";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarClock,
  ArrowUpDown,
  ArrowRight,
  Search,
  User as UserIcon,
  Filter,
  CheckSquare,
  UserCircle,
  ExternalLink,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { toast } from "sonner";

export default function RemindersPage() {
  const { user, inDepartment, can } = useAuth();
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const showOwnerColumn = isAdmin || isManager;
  const canSeeAllFilters = isAdmin || can("crm:admin") || !!user?.isGlobal;

  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [sortBy] = useState("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [searchUser, setSearchUser] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<"all" | "low" | "medium" | "high">("all");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchTask, setSearchTask] = useState<string>("");
  const [reminderType, setReminderType] = useState<"all" | "tasks" | "leads">("all");

  const { data: usersData } = useSWR(
    (canSeeAllFilters || isManager) ? ["users-list", searchUser] : null,
    () => usersApi.list({ search: searchUser, limit: 15 }),
    { revalidateOnFocus: false },
  );

  const { data: departmentsData } = useSWR("departments", () => getDepartments(), {
    revalidateOnFocus: false,
  });
  const departments: any[] = Array.isArray(departmentsData) ? departmentsData : [];
  const departmentMap = useMemo(
    () => new Map<string, any>(departments.map((d: any) => [d.id, d])),
    [departments],
  );

  // Filter departments by role: admin/global see all, managers/employees see only their departments
  const allowedDepartments = useMemo(
    () => (canSeeAllFilters ? departments : departments.filter((d: any) => inDepartment(d.id))),
    [departments, canSeeAllFilters, inDepartment],
  );

  const { data: res, mutate: mutateTasks, isLoading } = useSWR(
    ["task-reminders", page, limit, selectedUserId, sortOrder, priority, departmentId, dateFrom, dateTo, searchTask],
    async () => {
      const startDate = dateFrom ? new Date(dateFrom).toISOString() : undefined;
      const endDate = dateTo ? new Date(dateTo + "T23:59:59.999").toISOString() : undefined;
      const apiRes = await tasksApi.list({
        page,
        limit,
        assignedTo: selectedUserId,
        priority: priority === "all" ? undefined : priority,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        search: searchTask || undefined,
      });
      const data = (apiRes.data || []).filter(
        (t: any) =>
          (t.reminderBeforeMinutes ?? t.reminder_before_minutes) != null &&
          (t.dueDate || t.due_date) != null &&
          t.status !== "completed" &&
          t.status !== "cancelled",
      );
      return { data, meta: apiRes.meta };
    },
    { revalidateOnFocus: false },
  );

  const { data: leadRes, mutate: mutateLeads, isLoading: isLoadingLeads } = useSWR(
    reminderType === "all" || reminderType === "leads"
      ? ["lead-reminders", page, selectedUserId, dateFrom, dateTo]
      : null,
    async () => {
      const leadParams: any = {
        page,
        limit,
        status: "pending",
        sortBy: "reminder_at",
        sortOrder,
      };
      if (selectedUserId) leadParams.userId = selectedUserId;
      if (dateFrom) leadParams.date = dateFrom;
      else if (dateTo) leadParams.date = dateTo;
      return leadsApi.getAllReminders(leadParams);
    },
    { revalidateOnFocus: false },
  );

  useHeaderRefresh({
    onRefresh: async () => {
      await Promise.all([mutateTasks(), mutateLeads?.() ?? Promise.resolve()]);
    },
  });

  const tasks: any[] = res?.data || [];
  const leadReminders: any[] = leadRes?.data || [];
  const meta = res?.meta;
  const projectMgmtDept = useMemo(
    () => departments.find((d: any) => d.slug === "project-management"),
    [departments],
  );

  const getTaskDeptId = useCallback(
    (t: any) => {
      const projectId = t.projectId || t.project_id || null;
      let did =
        t.departmentId ||
        t.department_id ||
        t.department?.id ||
        t.assignedUser?.departmentId ||
        t.assignedUser?.department_id ||
        t.assigned_user?.department_id ||
        "none";
      if (projectId && did === "none" && projectMgmtDept) did = projectMgmtDept.id;
      return did;
    },
    [projectMgmtDept],
  );

  const getTaskDeptSlug = useCallback(
    (t: any) => {
      const did = getTaskDeptId(t);
      return did !== "none" ? departmentMap.get(did)?.slug : null;
    },
    [getTaskDeptId, departmentMap],
  );

  const filteredByDept = useMemo(() => {
    if (departmentId === "all") return tasks;
    return tasks.filter((t: any) => getTaskDeptId(t) === departmentId);
  }, [tasks, departmentId, getTaskDeptId]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of filteredByDept) {
      const did = getTaskDeptId(t);
      const list = map.get(did) || [];
      list.push(t);
      map.set(did, list);
    }
    return Array.from(map.entries()).map(([did, list]) => ({
      departmentId: did,
      departmentName: did === "none" ? "No Department" : departmentMap.get(did)?.name || "No Department",
      tasks: list,
    }));
  }, [filteredByDept, departmentMap, getTaskDeptId]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleMarkLeadDone = useCallback(
    async (reminderId: string) => {
      try {
        await leadsApi.markReminderDone(reminderId);
        toast.success("Reminder marked as done");
        void mutateLeads();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to mark reminder as done");
      }
    },
    [mutateLeads],
  );

  const showTasks = reminderType === "all" || reminderType === "tasks";
  const showLeads = reminderType === "all" || reminderType === "leads";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">Task and lead reminders across the CRM.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={reminderType} onValueChange={(v) => setReminderType(v as "all" | "tasks" | "leads")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reminders</SelectItem>
              <SelectItem value="tasks">Task reminders</SelectItem>
              <SelectItem value="leads">Lead reminders</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-[240px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search tasks..."
              value={searchTask}
              onChange={(e) => setSearchTask(e.target.value)}
              className="h-9 pl-9"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          {(canSeeAllFilters || isManager) && (
            <div className="relative w-[220px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <UserIcon className="mr-2 h-4 w-4" />
                    {selectedUserId
                      ? usersData?.data?.find((u: any) => u.id === selectedUserId)?.fullName || "Selected User"
                      : "All Users"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[260px]" align="end">
                  <div className="p-2">
                    <Input
                      placeholder="Search users..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <DropdownMenuItem onClick={() => setSelectedUserId(undefined)}>All Users</DropdownMenuItem>
                  {usersData?.data?.map((u: any) => (
                    <DropdownMenuItem key={u.id} onClick={() => setSelectedUserId(u.id)}>
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback className="text-[10px]">{getInitials(u.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{u.fullName}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {canSeeAllFilters ? "All departments" : "My departments"}
              </SelectItem>
              <SelectItem value="none">No Department</SelectItem>
              {allowedDepartments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[160px]" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[160px]" />
        </div>
      </div>

      {showTasks && (
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
                      <Badge variant="secondary" className="text-xs">{group.tasks.length}</Badge>
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
                                <Badge variant="outline" className={cn("capitalize", t.priority === "high" ? "border-red-200 text-red-700 bg-red-50" : "")}>
                                  {t.priority || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Open task">
                                  <Link href={openHref}>
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </Button>
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
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page} of {meta.totalPages}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {showLeads && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Lead Reminders
            <Badge variant="secondary">{leadReminders.length}</Badge>
          </CardTitle>
          <CardDescription>Follow-up reminders set on leads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingLeads ? (
            <div className="text-sm text-muted-foreground">Loading lead reminders...</div>
          ) : leadReminders.length === 0 ? (
            <div className="text-sm text-muted-foreground">No lead reminders found.</div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Reminder At</TableHead>
                    <TableHead>Note</TableHead>
                    {showOwnerColumn && <TableHead>Set By</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadReminders.map((r: any) => {
                    const reminderAt = r.reminderAt || r.reminder_at;
                    const leadId = r.leadId || r.lead_id;
                    const leadName = r.lead?.leadName || r.lead?.lead_name || "Unknown Lead";
                    const setBy = r.user?.fullName || r.user?.full_name;
                    const nowIso = new Date().toISOString();
                    const isOverdue = !!reminderAt && reminderAt < nowIso;
                    return (
                      <TableRow
                        key={r.id}
                        className={cn(isOverdue && "bg-red-100 hover:bg-red-200")}
                      >
                        <TableCell className="font-medium">
                          <div className="truncate max-w-[200px]">{leadName}</div>
                        </TableCell>
                        <TableCell>
                          {reminderAt ? format(new Date(reminderAt), "MMM d, yyyy h:mm a") : "-"}
                          {isOverdue && (
                            <span className="block text-[11px] text-amber-700 font-semibold">overdue</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {r.note || "-"}
                        </TableCell>
                        {showOwnerColumn && (
                          <TableCell>
                            {setBy ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm truncate">{setBy}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Open lead">
                              <Link href={leadId ? `/sales/leads/${leadId}` : "#"}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Mark done"
                              onClick={() => handleMarkLeadDone(r.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
