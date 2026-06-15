"use client";

import { useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import { useAuth, useIsAdmin, useIsManager } from "@/providers/auth-provider";
import { tasksApi, usersApi, leadsApi } from "@/lib/api";
import { getDepartments } from "@/lib/supabase-queries";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import { toast } from "sonner";

export function useRemindersPage() {
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
    canSeeAllFilters ? ["users-list", searchUser] : null,
    () => usersApi.list({ search: searchUser, limit: 50 }),
    { revalidateOnFocus: false },
  );

  const { data: userStatsData } = useSWR(
    isAdmin || isManager ? "leads-user-stats" : null,
    () => leadsApi.getStatsByUser(),
    { revalidateOnFocus: false },
  );

  const userListForDropdown = useMemo(() => {
    if (canSeeAllFilters) return (usersData?.data || []) as any[];
    if (isManager) {
      const members = (userStatsData?.users || []) as any[];
      const normalizedMembers = members.map((m: any) => ({
        id: m.id,
        fullName: m.fullName || m.full_name,
        full_name: m.fullName || m.full_name,
        avatarUrl: m.avatarUrl || m.avatar_url,
        avatar_url: m.avatarUrl || m.avatar_url,
      }));
      if (!searchUser) return normalizedMembers;
      return normalizedMembers.filter((m: any) =>
        (m.fullName || m.full_name || "").toLowerCase().includes(searchUser.toLowerCase()),
      );
    }
    return [];
  }, [canSeeAllFilters, isManager, usersData, userStatsData, searchUser]);

  const showUserFilter = canSeeAllFilters || isManager;
  const { data: departmentsData } = useSWR("departments", () => getDepartments(), {
    revalidateOnFocus: false,
  });
  const departments: any[] = Array.isArray(departmentsData) ? departmentsData : [];
  const departmentMap = useMemo(
    () => new Map<string, any>(departments.map((d: any) => [d.id, d])),
    [departments],
  );

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

  const handleDeleteLeadReminder = useCallback(
    async (leadId: string, reminderId: string) => {
      if (!window.confirm("Are you sure you want to delete this reminder?")) return;
      try {
        await leadsApi.deleteReminder(leadId, reminderId);
        toast.success("Reminder deleted");
        void mutateLeads();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to delete reminder");
      }
    },
    [mutateLeads],
  );

  const handleMarkCompleteTask = useCallback(
    async (taskId: string) => {
      try {
        await tasksApi.update(taskId, { status: "completed" });
        toast.success("Task marked as completed");
        void mutateTasks();
      } catch (err: any) {
        toast.error("Failed to complete task");
      }
    },
    [mutateTasks],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!window.confirm("Are you sure you want to delete this task?")) return;
      try {
        await tasksApi.delete(taskId);
        toast.success("Task deleted");
        void mutateTasks();
      } catch (err: any) {
        toast.error("Failed to delete task");
      }
    },
    [mutateTasks],
  );

  const showTasks = reminderType === "all" || reminderType === "tasks";
  const showLeads = reminderType === "all" || reminderType === "leads";

  return {
    showOwnerColumn,
    canSeeAllFilters,
    page,
    setPage,
    sortOrder,
    setSortOrder,
    searchUser,
    setSearchUser,
    selectedUserId,
    setSelectedUserId,
    priority,
    setPriority,
    departmentId,
    setDepartmentId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchTask,
    setSearchTask,
    reminderType,
    setReminderType,
    userListForDropdown,
    showUserFilter,
    allowedDepartments,
    isLoading,
    filteredByDept,
    grouped,
    getTaskDeptSlug,
    meta,
    isLoadingLeads,
    leadReminders,
    handleMarkLeadDone,
    handleDeleteLeadReminder,
    handleMarkCompleteTask,
    handleDeleteTask,
    showTasks,
    showLeads,
  };
}

export type RemindersPageState = ReturnType<typeof useRemindersPage>;
