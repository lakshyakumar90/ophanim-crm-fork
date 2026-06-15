import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { usePermission } from "@/hooks/use-permission";
import { useEmployees } from "@/hooks/useEmployees";
import { useBulkDeactivate, activateOne, deactivateOne } from "@/hooks/useBulkEmployeeActions";
import {
  buildEmployeeCSV,
  canFetchCompensationHistory,
  canSeeFullCTC,
  employeeMatchesKpiPreset,
  type KPIFilterPreset,
} from "@/lib/employeeHelpers";
import type { CompensationHistory, HREmployee } from "@/types/hr.types";
import {
  fetchEmployeeCompensationHistory,
  fetchHrEmployeeById,
  updateHrEmployee,
} from "@/lib/hr-employee-api";
import { toastHrError } from "@/lib/hr-error-toast";
import { toast } from "sonner";
import {
  filterEmployeesList,
  type EmployeeTableFilters,
} from "@/components/hr/employees/EmployeeSearchFilters";

const defaultFilters: EmployeeTableFilters = {
  search: "",
  department: "all",
  team: "all",
  role: "all",
  status: "all",
  shift: "all",
};

export function useEmployeesPage() {
  const { user } = useAuth();
  const perms = user?.permissions ?? [];
  const pEmpView = usePermission("hr:employees_view");
  const pHrView = usePermission("hr:view");
  const pManage = usePermission("hr:manage");
  const pEmpEdit = usePermission("hr:employees_edit");
  const canView = pEmpView || pHrView || pManage;
  const canEdit = pEmpEdit || pManage;
  const canSeeCTC = canSeeFullCTC(perms);
  const canComp = canFetchCompensationHistory(perms);

  const { employees, loading, error, load, patchEmployee } = useEmployees();
  const { progress, run: bulkDeactivateRun } = useBulkDeactivate();

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<EmployeeTableFilters>(defaultFilters);
  const [kpiPreset, setKpiPreset] = useState<KPIFilterPreset>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyByEmployee, setHistoryByEmployee] = useState<Record<string, CompensationHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEmployee, setDrawerEmployee] = useState<HREmployee | null>(null);
  const [drawerEdit, setDrawerEdit] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [deactOpen, setDeactOpen] = useState(false);
  const [deactTarget, setDeactTarget] = useState<HREmployee | null>(null);
  const [bulkDeactOpen, setBulkDeactOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [actTarget, setActTarget] = useState<HREmployee | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput })), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const mergedList = useMemo(() => {
    let list = filterEmployeesList(employees, filters);
    if (kpiPreset !== "all") {
      list = list.filter((e) => employeeMatchesKpiPreset(e, kpiPreset));
    }
    return list;
  }, [employees, filters, kpiPreset]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);

  const allChecked = mergedList.length > 0 && mergedList.every((e) => selectedIds.includes(e.id));

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelectedIds((prev) => prev.filter((id) => !mergedList.some((e) => e.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...mergedList.map((e) => e.id)])));
  }, [allChecked, mergedList]);

  const toggleExpand = useCallback(
    async (id: string) => {
      const open = expandedId === id;
      setExpandedId(open ? null : id);
      if (open || !canComp || historyByEmployee[id]) return;
      setHistoryLoading((m) => ({ ...m, [id]: true }));
      try {
        const rows = await fetchEmployeeCompensationHistory(id);
        setHistoryByEmployee((m) => ({ ...m, [id]: rows }));
      } catch {
        toastHrError(new Error("history"), "Failed to load compensation history");
      } finally {
        setHistoryLoading((m) => ({ ...m, [id]: false }));
      }
    },
    [expandedId, canComp, historyByEmployee],
  );

  const openDrawer = useCallback((e: HREmployee, edit = false) => {
    setDrawerEmployee(e);
    setDrawerEdit(edit);
    setDrawerOpen(true);
  }, []);

  const exportFiltered = useCallback(() => {
    const blob = new Blob([buildEmployeeCSV(mergedList, canSeeCTC)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedList, canSeeCTC]);

  const exportSelected = useCallback(() => {
    const rows = mergedList.filter((e) => selectedIds.includes(e.id));
    const blob = new Blob([buildEmployeeCSV(rows, canSeeCTC)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedList, canSeeCTC, selectedIds]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilters(defaultFilters);
    setKpiPreset("all");
  }, []);

  const hasFilters =
    filters.department !== "all" ||
    filters.team !== "all" ||
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.shift !== "all" ||
    !!filters.search.trim() ||
    kpiPreset !== "all";

  const confirmBulkDeactivate = useCallback(async () => {
    setBusy(true);
    const { ok, failed } = await bulkDeactivateRun(selectedIds, employees);
    for (const id of ok) patchEmployee(id, { isActive: false });
    setSelectedIds([]);
    setBulkDeactOpen(false);
    setBusy(false);
    if (failed.length === 0) {
      toast.success(`${ok.length} employees deactivated`);
    } else {
      toast.error(
        `${ok.length} deactivated, ${failed.length} failed: ${failed.map((f) => f.name).join(", ")}`,
      );
    }
    void load();
  }, [bulkDeactivateRun, selectedIds, employees, patchEmployee, load]);

  const onCreated = useCallback(
    async (newId: string) => {
      await load();
      try {
        const row = await fetchHrEmployeeById(newId);
        openDrawer(row, false);
      } catch {
        toast.message("Employee created. Refresh the list if they don't appear yet.");
      }
    },
    [load, openDrawer],
  );

  const selectedEmployees = useMemo(
    () => mergedList.filter((e) => selectedIds.includes(e.id)),
    [mergedList, selectedIds],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Map(
          employees
            .filter((e) => e.departmentId && e.departmentName)
            .map((e) => [e.departmentId as string, e.departmentName as string]),
        ).entries(),
      ).map(([id, name]) => ({ id, name })),
    [employees],
  );

  const teamOptions = useMemo(
    () =>
      Array.from(
        new Map(
          employees
            .filter((e) => e.teamId && e.teamName)
            .map((e) => [
              e.teamId as string,
              {
                id: e.teamId as string,
                name: e.teamName as string,
                departmentId: e.departmentId || null,
              },
            ]),
        ).entries(),
      ).map(([, v]) => v),
    [employees],
  );

  const managerOptions = useMemo(
    () =>
      employees
        .filter((e) => e.role === "manager" || e.role === "admin" || e.role === "hr")
        .map((e) => ({ id: e.id, fullName: e.fullName })),
    [employees],
  );

  const saveBulkEmployees = useCallback(
    async (
      updates: Array<{
        id: string;
        data: {
          email?: string;
          fullName?: string;
          phone?: string | null;
          role?: "admin" | "manager" | "employee" | "hr";
          departmentId?: string | null;
          teamId?: string | null;
          managerId?: string | null;
          jobTitle?: string | null;
          shiftType?: string | null;
          currentCtc?: number | null;
          salaryComponents?: {
            basic_pct?: number;
            hra_pct?: number;
            allowance_pct?: number;
          };
          isActive?: boolean;
        };
      }>,
    ) => {
      setBulkSaving(true);
      const results = await Promise.allSettled(
        updates.map((u) => updateHrEmployee(u.id, u.data)),
      );

      let success = 0;
      let failed = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          success += 1;
          const updated = result.value;
          patchEmployee(updated.id, {
            email: updated.email,
            fullName: updated.fullName,
            phone: updated.phone,
            role: updated.role,
            departmentId: updated.departmentId,
            departmentName: updated.departmentName,
            teamId: updated.teamId,
            teamName: updated.teamName,
            managerId: updated.managerId,
            jobTitle: updated.jobTitle,
            shiftType: updated.shiftType,
            currentCtc: updated.currentCtc,
            salaryComponents: updated.salaryComponents,
            isActive: updated.isActive,
          });
        } else {
          failed += 1;
        }
      }

      setBulkSaving(false);
      if (success > 0) toast.success(`${success} employees updated`);
      if (failed > 0) toast.error(`${failed} employees failed to update`);
      if (failed === 0) {
        setBulkEditMode(false);
      }
      void load();
    },
    [patchEmployee, load],
  );

  const confirmDeactivate = useCallback(async () => {
    if (!deactTarget) return;
    setBusy(true);
    try {
      await deactivateOne(deactTarget.id);
      patchEmployee(deactTarget.id, { isActive: false });
      setDeactOpen(false);
      void load();
    } finally {
      setBusy(false);
    }
  }, [deactTarget, patchEmployee, load]);

  const confirmActivate = useCallback(async () => {
    if (!actTarget) return;
    setBusy(true);
    try {
      await activateOne(actTarget.id);
      patchEmployee(actTarget.id, { isActive: true });
      setActOpen(false);
      void load();
    } finally {
      setBusy(false);
    }
  }, [actTarget, patchEmployee, load]);

  return {
    canView,
    canEdit,
    canSeeCTC,
    canComp,
    employees,
    loading,
    error,
    load,
    progress,
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    kpiPreset,
    setKpiPreset,
    selectedIds,
    setSelectedIds,
    expandedId,
    historyByEmployee,
    historyLoading,
    drawerOpen,
    setDrawerOpen,
    drawerEmployee,
    drawerEdit,
    addOpen,
    setAddOpen,
    deactOpen,
    setDeactOpen,
    deactTarget,
    bulkDeactOpen,
    setBulkDeactOpen,
    actOpen,
    setActOpen,
    actTarget,
    busy,
    bulkEditMode,
    setBulkEditMode,
    bulkSaving,
    mergedList,
    toggleSelect,
    allChecked,
    toggleAll,
    toggleExpand,
    openDrawer,
    exportFiltered,
    exportSelected,
    clearFilters,
    hasFilters,
    confirmBulkDeactivate,
    onCreated,
    selectedEmployees,
    departmentOptions,
    teamOptions,
    managerOptions,
    saveBulkEmployees,
    confirmDeactivate,
    confirmActivate,
    setDeactTarget,
    setActTarget,
  };
}
