"use client";

import { useEmployeesPage } from "@/hooks/hr/useEmployeesPage";
import { EmployeeKPICards } from "@/components/hr/employees/EmployeeKPICards";
import { EmployeeSearchFilters } from "@/components/hr/employees/EmployeeSearchFilters";
import { EmployeeTable } from "@/components/hr/employees/EmployeeTable";
import { BulkEditTable } from "@/components/hr/employees/BulkEditTable";
import { BulkActionsBar } from "@/components/hr/employees/BulkActionsBar";
import {
  ActivateConfirmDialog,
  DeactivateConfirmDialog,
} from "@/components/hr/employees/DeactivateConfirmDialog";
import { AddEmployeeSheet } from "@/components/hr/employees/AddEmployeeSheet";
import { EmployeeDetailDrawer } from "@/components/hr/employees/detail/EmployeeDetailDrawer";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export function EmployeesPageContent() {
  const {
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
  } = useEmployeesPage();

  if (!canView) {
    return <div className="p-6 text-muted-foreground">You do not have permission to view employees.</div>;
  }

  return (
    <ListPageLayout
      title="Employees"
      description={`${employees.length} total employees`}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Employees" },
      ]}
    >
      <div className="space-y-6">
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
        <AddEmployeeSheet open={addOpen} onOpenChange={setAddOpen} onCreated={(id) => void onCreated(id)} />
      ) : null}

      <DeactivateConfirmDialog
        open={deactOpen}
        onOpenChange={setDeactOpen}
        mode="single"
        name={deactTarget?.fullName}
        onConfirm={() => void confirmDeactivate()}
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
        onConfirm={() => void confirmActivate()}
        busy={busy}
      />
      </div>
    </ListPageLayout>
  );
}
