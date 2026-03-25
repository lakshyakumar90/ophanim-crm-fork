"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { OnboardingChecklistCard } from "@/components/onboarding/OnboardingChecklistCard";
import { ChecklistDetailPanel } from "@/components/onboarding/ChecklistDetailPanel";
import { AssignChecklistModal } from "@/components/onboarding/AssignChecklistModal";
import { InitiateOffboardingModal } from "@/components/onboarding/InitiateOffboardingModal";
import { OnboardingAnalytics } from "@/components/onboarding/OnboardingAnalytics";
import { useOnboardingChecklists } from "@/hooks/useOnboardingChecklists";
import { useChecklistTasks } from "@/hooks/useChecklistTasks";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";
import { fetchHREmployeesForOnboarding } from "@/lib/onboarding-api";
import { mapHrEmployeeRecord, countOverdueTasks } from "@/lib/onboarding-utils";
import type { ChecklistTaskStatusApi, HREmployeeOption, OnboardingChecklist } from "@/types/onboarding";
import { Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";

type TabKey = "onboarding" | "offboarding" | "analytics";

export default function OnboardingPage() {
  const { can } = useAuth();
  const { loadByType, loadOne } = useOnboardingChecklists();
  const { updateTask } = useChecklistTasks();
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    load: loadAnalytics,
    setError: setAnalyticsError,
  } = useOnboardingAnalytics();

  const canManage = can("onboarding:manage");
  const canView = can("onboarding:view") || canManage;

  const [tab, setTab] = useState<TabKey>("onboarding");
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  const [onboardingRows, setOnboardingRows] = useState<OnboardingChecklist[]>([]);
  const [offboardingRows, setOffboardingRows] = useState<OnboardingChecklist[]>([]);
  const [employees, setEmployees] = useState<HREmployeeOption[]>([]);

  const [listLoading, setListLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in_progress" | "completed" | "overdue"
  >("all");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailChecklist, setDetailChecklist] = useState<OnboardingChecklist | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [offboardOpen, setOffboardOpen] = useState(false);

  const employeeById = useMemo(() => {
    const m = new Map<string, HREmployeeOption>();
    employees.forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const departmentOptions = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName) s.add(e.departmentName);
    });
    return [...s].sort();
  }, [employees]);

  const busyOnboardingIds = useMemo(() => {
    const s = new Set<string>();
    onboardingRows.forEach((c) => {
      if (c.completion_rate < 100) s.add(c.employee_id);
    });
    return s;
  }, [onboardingRows]);

  const offboardingBusyIds = useMemo(() => {
    const s = new Set<string>();
    offboardingRows.forEach((c) => s.add(c.employee_id));
    return s;
  }, [offboardingRows]);

  const refreshOnboarding = useCallback(async () => {
    const rows = await loadByType("onboarding");
    setOnboardingRows(rows);
  }, [loadByType]);

  const refreshOffboarding = useCallback(async () => {
    const rows = await loadByType("offboarding");
    setOffboardingRows(rows);
  }, [loadByType]);

  const loadEmployees = useCallback(async () => {
    if (!canView) return;
    try {
      const raw = await fetchHREmployeesForOnboarding();
      setEmployees(
        (raw as Record<string, unknown>[]).map((r) => mapHrEmployeeRecord(r)),
      );
    } catch {
      toast.error("Could not load employee directory");
    }
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    void loadEmployees();
  }, [canView, loadEmployees]);

  const ensureTab = useCallback(
    async (key: TabKey) => {
      if (loaded.has(key)) return;
      setListLoading(true);
      try {
        if (key === "onboarding") await refreshOnboarding();
        else if (key === "offboarding") await refreshOffboarding();
        else if (key === "analytics") {
          const extra = new Set<string>([key]);
          if (!loaded.has("onboarding")) {
            await refreshOnboarding();
            extra.add("onboarding");
          }
          if (!loaded.has("offboarding")) {
            await refreshOffboarding();
            extra.add("offboarding");
          }
          try {
            await loadAnalytics();
          } catch {
            setAnalyticsError("Analytics request failed");
          }
          setLoaded((prev) => new Set([...prev, ...extra]));
          return;
        }
        setLoaded((prev) => new Set(prev).add(key));
      } finally {
        setListLoading(false);
      }
    },
    [
      loaded,
      refreshOnboarding,
      refreshOffboarding,
      loadAnalytics,
      setAnalyticsError,
      loaded,
    ],
  );

  useEffect(() => {
    void ensureTab(tab);
  }, [tab, ensureTab]);

  const mergeChecklist = useCallback((updated: OnboardingChecklist) => {
    setOnboardingRows((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setOffboardingRows((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setDetailChecklist((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const handleInlineTask = useCallback(
    async (checklistId: string, taskIndex: number, body: { status: ChecklistTaskStatusApi; notes?: string }) => {
      const updated = await updateTask(checklistId, taskIndex, body);
      mergeChecklist(updated);
    },
    [updateTask, mergeChecklist],
  );

  const openDetail = async (c: OnboardingChecklist) => {
    const full = await loadOne(c.id);
    if (full) {
      setDetailChecklist(full);
      setDetailOpen(true);
    } else {
      setDetailChecklist(c);
      setDetailOpen(true);
    }
  };

  const filterRows = (rows: OnboardingChecklist[], includeStatusFilter: boolean) => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      const name = c.employee?.full_name?.toLowerCase() ?? "";
      if (q && !name.includes(q)) return false;
      if (deptFilter !== "all") {
        const d = employeeById.get(c.employee_id)?.departmentName;
        if (d !== deptFilter) return false;
      }
      if (includeStatusFilter) {
        if (statusFilter === "completed" && c.completion_rate < 100) return false;
        if (statusFilter === "in_progress" && c.completion_rate >= 100) return false;
        if (statusFilter === "overdue" && countOverdueTasks(c.tasks) === 0) return false;
      }
      return true;
    });
  };

  const allRows = useMemo(
    () => [...onboardingRows, ...offboardingRows],
    [onboardingRows, offboardingRows],
  );

  const kpis = useMemo(() => {
    const activeOn = onboardingRows.length;
    const activeOff = offboardingRows.length;
    const readyToArchive = offboardingRows.length;
    let overdue = 0;
    allRows.forEach((c) => {
      overdue += countOverdueTasks(c.tasks);
    });
    return {
      activeOn,
      activeOff,
      readyToArchive,
      overdue,
    };
  }, [onboardingRows, offboardingRows, allRows]);

  if (!canView) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You don&apos;t have permission to view onboarding.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding &amp; exits</h1>
          <p className="text-muted-foreground mt-1">
            Track onboarding records and offboarding exits, and keep employee setup details up to date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <Button variant="outline" className="gap-2" onClick={() => setOffboardOpen(true)}>
                <UserMinus className="h-4 w-4" />
                Initiate offboarding
              </Button>
              <Button
                className="gap-2"
                onClick={() => {
                  setAssignOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create onboarding
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Onboarding records", value: kpis.activeOn },
          { label: "Offboarding records", value: kpis.activeOff },
          { label: "Ready to archive", value: kpis.readyToArchive },
          { label: "Offboarding PDF", value: "Available" },
          { label: "Overdue tasks", value: kpis.overdue },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-card border p-1">
          <TabsTrigger value="onboarding">Active onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding &amp; exits</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="mt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 bg-card border rounded-lg p-4">
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground self-center">
              Onboarding is employee-info based: confirm and maintain profile assignment details.
            </p>
          </div>
          {listLoading && !loaded.has("onboarding") ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-3">
              {filterRows(onboardingRows, false).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12 border rounded-xl border-dashed">
                  No onboarding checklists match your filters.
                </p>
              ) : (
                filterRows(onboardingRows, false).map((c) => (
                  <OnboardingChecklistCard
                    key={c.id}
                    checklist={c}
                    directory={employeeById.get(c.employee_id)}
                    expanded={expandedId === c.id}
                    onToggleExpand={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                    onViewFull={() => void openDetail(c)}
                    canUpdateTasks={false}
                    onTaskUpdate={handleInlineTask}
                    showTaskActions={false}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offboarding" className="mt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 bg-card border rounded-lg p-4">
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-50">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground self-center">
              Offboarding is direct: generate PDF and archive employee.
            </p>
          </div>
          {listLoading && !loaded.has("offboarding") ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-3">
              {filterRows(offboardingRows, false).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12 border rounded-xl border-dashed">
                  No offboarding checklists found.
                </p>
              ) : (
                filterRows(offboardingRows, false).map((c) => (
                  <OnboardingChecklistCard
                    key={c.id}
                    checklist={c}
                    directory={employeeById.get(c.employee_id)}
                    expanded={expandedId === c.id}
                    onToggleExpand={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                    onViewFull={() => void openDetail(c)}
                    canUpdateTasks={canManage}
                    onTaskUpdate={handleInlineTask}
                    onViewExit={() => void openDetail(c)}
                    showTaskActions={false}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <OnboardingAnalytics
            apiData={analyticsData}
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={() => {
              setAnalyticsError(null);
              void loadAnalytics();
            }}
            onboardingRows={onboardingRows}
            offboardingRows={offboardingRows}
            employeeById={employeeById}
          />
        </TabsContent>
      </Tabs>

      <AssignChecklistModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        employees={employees}
        busyEmployeeIds={busyOnboardingIds}
        onAssigned={async () => {
          await refreshOnboarding();
          setLoaded((prev) => new Set(prev).add("onboarding"));
        }}
      />

      <InitiateOffboardingModal
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        employees={employees}
        offboardingEmployeeIds={offboardingBusyIds}
        onDone={async () => {
          await refreshOffboarding();
          setLoaded((prev) => new Set(prev).add("offboarding"));
        }}
      />

      <ChecklistDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        checklist={detailChecklist}
        directory={detailChecklist ? employeeById.get(detailChecklist.employee_id) : null}
        canUpdateTasks={canManage}
        canArchive={canManage}
        updateChecklistTask={updateTask}
        onTasksChanged={mergeChecklist}
        onArchived={async () => {
          await refreshOffboarding();
          setDetailChecklist(null);
        }}
      />
    </div>
  );
}
