"use client";

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
import type { HREmployee } from "@/types/hr.types";
import {
  fetchEmployeeCompensationHistory,
  fetchHrEmployeeById,
  updateHrEmployee,
} from "@/lib/hr-employee-api";
import type { CompensationHistory } from "@/types/hr.types";
import { toastHrError } from "@/lib/hr-error-toast";
import { toast } from "sonner";

import { EmployeeKPICards } from "@/components/hr/employees/EmployeeKPICards";
import {
  EmployeeSearchFilters,
  filterEmployeesList,
  type EmployeeTableFilters,
} from "@/components/hr/employees/EmployeeSearchFilters";
import { EmployeeTable } from "@/components/hr/employees/EmployeeTable";
import { BulkEditTable } from "@/components/hr/employees/BulkEditTable";
import { BulkActionsBar } from "@/components/hr/employees/BulkActionsBar";
import {
  ActivateConfirmDialog,
  DeactivateConfirmDialog,
} from "@/components/hr/employees/DeactivateConfirmDialog";
import { AddEmployeeModal } from "@/components/hr/employees/AddEmployeeModal";
import { EmployeeDetailDrawer } from "@/components/hr/employees/detail/EmployeeDetailDrawer";

const defaultFilters: EmployeeTableFilters = {
  search: "",
  department: "all",
  team: "all",
  role: "all",
  status: "all",
  shift: "all",
};

export default function HREmployeesPage() {
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

  const { employees, setEmployees, loading, error, load, patchEmployee } = useEmployees();
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

  const openDrawer = (e: HREmployee, edit = false) => {
    setDrawerEmployee(e);
    setDrawerEdit(edit);
    setDrawerOpen(true);
  };

  const exportFiltered = () => {
    const blob = new Blob([buildEmployeeCSV(mergedList, canSeeCTC)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSelected = () => {
    const rows = mergedList.filter((e) => selectedIds.includes(e.id));
    const blob = new Blob([buildEmployeeCSV(rows, canSeeCTC)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(defaultFilters);
    setKpiPreset("all");
  };

  const hasFilters =
    filters.department !== "all" ||
    filters.team !== "all" ||
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.shift !== "all" ||
    !!filters.search.trim() ||
    kpiPreset !== "all";

  const confirmBulkDeactivate = async () => {
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
  };

  const onCreated = async (newId: string) => {
    await load();
    try {
      const row = await fetchHrEmployeeById(newId);
      openDrawer(row, false);
    } catch {
      toast.message("Employee created. Refresh the list if they don’t appear yet.");
    }
  };

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
            .map((e) => [e.teamId as string, { id: e.teamId as string, name: e.teamName as string, departmentId: e.departmentId || null }]),
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

  const saveBulkEmployees = async (
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
  };

  if (!canView) {
    return <div className="p-6 text-muted-foreground">You do not have permission to view employees.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-400 mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">{employees.length} total employees</p>
      </div>

      {error ? (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-md p-3">{error}</div>
      ) : null}

      <EmployeeKPICards
        employees={employees}
        loading={loading}
        activePreset={kpiPreset}
        onPresetChange={setKpiPreset}
      />

      <EmployeeSearchFilters
        employees={employees}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        filters={filters}
        onFiltersChange={setFilters}
        onExport={exportFiltered}
        onAddClick={() => setAddOpen(true)}
        showAdd={canEdit}
      />

      <BulkActionsBar
        count={selectedIds.length}
        onExportSelected={exportSelected}
        onDeactivateSelected={() => setBulkDeactOpen(true)}
        onClear={() => setSelectedIds([])}
        canDeactivate={canEdit}
      />

      {selectedIds.length > 0 && canEdit ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} selected. Switch to bulk edit for spreadsheet-style updates.
          </p>
          <div className="flex items-center gap-2">
            {bulkEditMode ? (
              <>
                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setBulkEditMode(false)}
                >
                  Exit bulk edit
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setBulkEditMode(true)}
              >
                Bulk Edit Table
              </button>
            )}
          </div>
        </div>
      ) : null}

      {bulkEditMode && selectedEmployees.length > 0 && canEdit ? (
        <BulkEditTable
          employees={selectedEmployees}
          departmentOptions={departmentOptions}
          teamOptions={teamOptions}
          managerOptions={managerOptions}
          saving={bulkSaving}
          onSave={saveBulkEmployees}
        />
      ) : null}

      <EmployeeTable
        rows={mergedList}
        loading={loading}
        expandedId={expandedId}
        onToggleExpand={toggleExpand}
        historyByEmployee={historyByEmployee}
        historyLoading={historyLoading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        allChecked={allChecked}
        onToggleAll={toggleAll}
        canFetchCompHistory={canComp}
        canSeeCTC={canSeeCTC}
        canEdit={canEdit}
        onView={(e) => openDrawer(e, false)}
        onEdit={(e) => openDrawer(e, true)}
        onDeactivate={(e) => {
          setDeactTarget(e);
          setDeactOpen(true);
        }}
        onActivate={(e) => {
          setActTarget(e);
          setActOpen(true);
        }}
        onClearFilters={clearFilters}
        hasFilters={hasFilters}
      />

      {progress ? (
        <p className="text-sm text-muted-foreground">
          Deactivating {progress.current} of {progress.total}…
        </p>
      ) : null}

      <EmployeeDetailDrawer
        employee={drawerEmployee}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        allEmployees={employees}
        initialEditMode={drawerEdit}
        onUpdated={() => void load()}
      />

      {canEdit ? (
        <AddEmployeeModal open={addOpen} onOpenChange={setAddOpen} onCreated={(id) => void onCreated(id)} />
      ) : null}

      <DeactivateConfirmDialog
        open={deactOpen}
        onOpenChange={setDeactOpen}
        mode="single"
        name={deactTarget?.fullName}
        onConfirm={async () => {
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
        }}
        busy={busy}
      />

      <DeactivateConfirmDialog
        open={bulkDeactOpen}
        onOpenChange={setBulkDeactOpen}
        mode="bulk"
        count={selectedIds.length}
        onConfirm={() => void confirmBulkDeactivate()}
        busy={busy}
      />

      <ActivateConfirmDialog
        open={actOpen}
        onOpenChange={setActOpen}
        name={actTarget?.fullName || ""}
        onConfirm={async () => {
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
        }}
        busy={busy}
      />
    </div>
  );
}
