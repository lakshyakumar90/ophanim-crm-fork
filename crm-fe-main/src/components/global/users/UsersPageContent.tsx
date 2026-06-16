"use client";

import { BulkEditTable } from "@/components/hr/employees/BulkEditTable";
import { CreateUserSheet } from "@/components/global/users/CreateUserSheet";
import { EditUserSheet } from "@/components/global/users/EditUserSheet";
import { UserDetailSheet } from "@/components/global/users/UserDetailSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { useUsersPage } from "@/hooks/core/useUsersPage";
import { JOB_TITLES } from "./users.constants";
import { UsersAccessDenied } from "./UsersAccessDenied";
import { UsersBulkSelectionBar } from "./UsersBulkSelectionBar";
import { UsersFilters } from "./UsersFilters";
import { UsersPageHeader } from "./UsersPageHeader";
import { UsersTable } from "./UsersTable";

export function UsersPageContent() {
  const sheet = useSheetQuery();
  const {
    isAdmin,
    search,
    setSearch,
    jobTitleFilter,
    setJobTitleFilter,
    selectedIds,
    setSelectedIds,
    bulkEditMode,
    setBulkEditMode,
    bulkSaving,
    bulkEditRef,
    users,
    teams,
    isLoading,
    selectedUsers,
    managerOptions,
    departmentOptions,
    allChecked,
    toggleAll,
    toggleSelect,
    saveBulkUsers,
    scrollToBulkTable,
    openBulkEdit,
    refreshUsers,
  } = useUsersPage();

  if (!isAdmin) {
    return <UsersAccessDenied />;
  }

  return (
    <>
    <div className="space-y-6">
      <UsersPageHeader onAddUser={sheet.openCreate} />

      <UsersFilters
        search={search}
        onSearchChange={setSearch}
        jobTitleFilter={jobTitleFilter}
        onJobTitleFilterChange={setJobTitleFilter}
      />

      <UsersBulkSelectionBar
        selectedCount={selectedIds.length}
        bulkEditMode={bulkEditMode}
        onOpenBulkEdit={openBulkEdit}
        onScrollToBulkTable={scrollToBulkTable}
        onExitBulkEdit={() => setBulkEditMode(false)}
        onClearSelection={() => setSelectedIds([])}
      />

      <UsersTable
        users={users}
        isLoading={isLoading}
        selectedIds={selectedIds}
        allChecked={allChecked}
        onToggleAll={toggleAll}
        onToggleSelect={toggleSelect}
        onViewDetails={sheet.openDetail}
        onEditUser={sheet.openEdit}
      />

      {bulkEditMode && selectedUsers.length > 0 ? (
        <div ref={bulkEditRef}>
          <BulkEditTable
            title="Bulk Edit Users"
            description="Google Sheets-style tabular editing for selected users. Drag the fill handle to copy values downward."
            employees={selectedUsers}
            departmentOptions={departmentOptions.map(([id, name]) => ({
              id: String(id),
              name: String(name),
            }))}
            teamOptions={(Array.isArray(teams) ? teams : []).map(
              (team: { id: string; name: string; departmentId?: string | null }) => ({
                id: team.id,
                name: team.name,
                departmentId: team.departmentId || null,
              }),
            )}
            managerOptions={managerOptions.map(
              (manager: { id: string; fullName: string }) => ({
                id: manager.id,
                fullName: manager.fullName,
              }),
            )}
            roleOptions={[
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
              { value: "employee", label: "Employee" },
            ]}
            shiftOptions={[
              { value: "day_shift", label: "Day Shift" },
              { value: "night_shift", label: "Night Shift" },
            ]}
            jobTitleOptions={JOB_TITLES}
            saving={bulkSaving}
            onSave={saveBulkUsers}
            onExit={() => setBulkEditMode(false)}
            onClearSelection={() => setSelectedIds([])}
          />
        </div>
      ) : null}

      {users.length > 0 ? (
        <div className="flex items-center justify-end">
          <p className="text-sm text-muted-foreground">Showing all {users.length} users</p>
        </div>
      ) : null}
    </div>

    <CreateUserSheet
      open={sheet.createOpen}
      onOpenChange={(open) => (open ? sheet.openCreate() : sheet.closeCreate())}
      onCreated={() => refreshUsers()}
    />

    <UserDetailSheet
      userId={sheet.selectedId}
      open={Boolean(sheet.selectedId)}
      onOpenChange={(open) => !open && sheet.closeDetail()}
      onEdit={(id) => {
        sheet.closeDetail();
        sheet.openEdit(id);
      }}
    />

    <EditUserSheet
      userId={sheet.editId}
      open={Boolean(sheet.editId)}
      onOpenChange={(open) => !open && sheet.closeEdit()}
      onUpdated={() => {
        refreshUsers();
        if (sheet.editId) {
          const id = sheet.editId;
          sheet.closeEdit();
          sheet.openDetail(id);
        }
      }}
    />
    </>
  );
}
