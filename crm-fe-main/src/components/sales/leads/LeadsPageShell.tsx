"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { leadsApi, csvApi } from "@/lib/api";
import { invoicesApi } from "@/lib/api/modules/finance";
import { projectsApi } from "@/lib/projects-api";
import { UserSelector } from "@/components/shared/user-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth, useIsManager, useIsAdmin } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Upload,
  Download,
  LayoutGrid,
  List,
  Users,
  Bell,
  UserPlus,
} from "lucide-react";
import { ImportLeadsDialog } from "@/components/sales/leads/import-leads-dialog";
import { ExportLeadsDialog } from "@/components/sales/leads/export-leads-dialog";
import { BulkEditLeadsDialog } from "@/components/sales/leads/bulk-edit-leads-dialog";
import { LeadsColumnPicker } from "@/components/sales/leads/LeadsColumnPicker";
import { LeadsFiltersToolbar } from "@/components/sales/leads/LeadsFiltersToolbar";
import { LeadsTableView } from "@/components/sales/leads/LeadsTableView";
import { LeadsKanbanBoard } from "@/components/sales/leads/LeadsKanbanBoard";
import { useLeadsTable } from "@/hooks/sales/useLeadsTable";
import { useLeadsKanban } from "@/hooks/sales/useLeadsKanban";
import {
  getReminderLeadId,
  getReminderAt,
} from "@/components/sales/leads/leads-reminder-utils";
import type { Lead } from "@/types";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { ListPageLayout } from "@/components/shared/list-page-layout";
import { BulkActionsBar } from "@/components/shared/bulk-actions-bar";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { LeadDetailSheet } from "@/components/sales/leads/LeadDetailSheet";

export function LeadsPageShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheet = useSheetQuery();
  const { user, can } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();

  const canCreateLeads = Boolean(user && (isAdmin || can("leads:create")));
  const canImportLeads = Boolean(user && (isAdmin || can("leads:import")));
  const canExportLeads = Boolean(user && (isAdmin || can("leads:export")));

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">(
    isAdmin || isManager ? "table" : "kanban",
  );
  const [assignedToUserId, setAssignedToUserId] = useState<string>("all");
  const [managerDefaultSet, setManagerDefaultSet] = useState(false);
  const [kanbanTeamId, setKanbanTeamId] = useState<string>("all");
  const [tablePageSize, setTablePageSize] = useState(50);
  const [tableStatus, setTableStatus] = useState(
    searchParams.get("status") || "all",
  );
  const [tableAssignmentFilter, setTableAssignmentFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");

  useEffect(() => {
    if (user && isManager && !isAdmin && !managerDefaultSet) {
      setAssignedToUserId(user.id);
      setManagerDefaultSet(true);
    }
  }, [user, isManager, isAdmin, managerDefaultSet]);

  const isKanbanView = viewMode === "kanban";

  const { data: userStatsData } = useSWR(
    isAdmin || isManager ? "leads-user-stats" : null,
    () => leadsApi.getStatsByUser(),
  );
  const userStats = userStatsData || { users: [], unassignedCount: 0 };

  const { data: remindersData } = useSWR(["pending-reminders"], () =>
    leadsApi.getAllReminders({ status: "pending", limit: 500 }),
  );

  const { data: projectsForLeads } = useSWR(
    isAdmin || isManager ? "all-projects-for-leads" : null,
    () => projectsApi.list(),
  );

  const leadProjectMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    const projectList = Array.isArray(projectsForLeads) ? projectsForLeads : [];
    projectList.forEach((p: { leadId?: string; id: string; name: string }) => {
      if (p.leadId) map.set(p.leadId, { id: p.id, name: p.name });
    });
    return map;
  }, [projectsForLeads]);

  const { data: invoicesForLeads } = useSWR(
    isAdmin || isManager ? "all-invoices-for-leads" : null,
    () => invoicesApi.list({ limit: 500 }),
  );

  const leadInvoiceMap = useMemo(() => {
    const map = new Map<string, { id: string; clientName: string }>();
    const invoiceList = Array.isArray(invoicesForLeads)
      ? invoicesForLeads
      : (invoicesForLeads as { data?: unknown[] })?.data || [];
    (invoiceList as Array<{ lead_id?: string; leadId?: string; id: string; client_name?: string; clientName?: string }>).forEach(
      (inv) => {
        const leadId = inv.lead_id || inv.leadId;
        if (leadId) {
          map.set(leadId, {
            id: inv.id,
            clientName: inv.client_name || inv.clientName || "Invoice",
          });
        }
      },
    );
    return map;
  }, [invoicesForLeads]);

  const { data: duplicatesData } = useSWR(
    user ? "duplicate-leads" : null,
    async () => {
      const res = await csvApi.getDuplicateLeads();
      return (res.data?.data ?? res.data) as {
        groups: { leads: { id: string }[] }[];
      };
    },
    { revalidateOnFocus: false },
  );

  const duplicateLeadIds = useMemo(() => {
    const groups = duplicatesData?.groups ?? [];
    const ids = new Set<string>();
    groups.forEach((g) => g.leads.forEach((l) => ids.add(l.id)));
    return ids;
  }, [duplicatesData]);

  const pendingReminders = useMemo((): unknown[] => {
    if (Array.isArray(remindersData)) return remindersData;
    return remindersData?.data || [];
  }, [remindersData]);

  const reminderLeadIdsByPriority = useMemo(() => {
    const sorted = [...pendingReminders].sort((a, b) => {
      const aAt = getReminderAt(a);
      const bAt = getReminderAt(b);
      const aOverdue = aAt ? new Date(aAt).getTime() < Date.now() : false;
      const bOverdue = bAt ? new Date(bAt).getTime() < Date.now() : false;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const aTs = aAt ? new Date(aAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTs = bAt ? new Date(bAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    });
    const uniqueIds: string[] = [];
    const seen = new Set<string>();
    for (const reminder of sorted) {
      const rid = getReminderLeadId(reminder);
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);
      uniqueIds.push(rid);
    }
    return uniqueIds;
  }, [pendingReminders]);

  const reminderLeadPriorityIndex = useMemo(
    () =>
      new Map<string, number>(
        reminderLeadIdsByPriority.map((id, i) => [id, i]),
      ),
    [reminderLeadIdsByPriority],
  );

  const leadsWithReminders = useMemo((): Set<string> => {
    const ids = pendingReminders
      .map((r: unknown) => getReminderLeadId(r))
      .filter((id): id is string => Boolean(id));
    return new Set(ids);
  }, [pendingReminders]);

  const leadsWithOverdueReminders = useMemo((): Set<string> => {
    const ids = pendingReminders
      .filter((r: unknown) => {
        const reminderAt = getReminderAt(r);
        return reminderAt
          ? new Date(reminderAt).getTime() < Date.now()
          : false;
      })
      .map((r: unknown) => getReminderLeadId(r))
      .filter((id): id is string => Boolean(id));
    return new Set(ids);
  }, [pendingReminders]);

  const activeRemindersCount = pendingReminders.length;
  const overdueRemindersCount = pendingReminders.filter((r: unknown) => {
    const reminderAt = getReminderAt(r);
    return reminderAt ? new Date(reminderAt).getTime() < Date.now() : false;
  }).length;

  const reminderLeadFetchIds = reminderLeadIdsByPriority.slice(
    0,
    isKanbanView ? 200 : Math.max(tablePageSize, 50),
  );

  const { data: reminderLeadDetails = [] } = useSWR(
    reminderLeadFetchIds.length > 0 &&
      (!isKanbanView || kanbanTeamId === "all")
      ? [
          "reminder-leads",
          reminderLeadFetchIds.join(","),
          isKanbanView ? "kanban" : "table",
          kanbanTeamId,
          tableStatus,
          tableAssignmentFilter,
          assignedToUserId,
        ]
      : null,
    async () => {
      const loaded = await Promise.all(
        reminderLeadFetchIds.map(async (leadId) => {
          try {
            return await leadsApi.get(leadId);
          } catch {
            return null;
          }
        }),
      );
      return loaded.filter(Boolean) as Lead[];
    },
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      globalMutate("users-list"),
      globalMutate("leads-user-stats"),
      globalMutate("teams-list"),
      globalMutate(["pending-reminders"]),
      globalMutate((key) => Array.isArray(key) && key[0] === "reminder-leads"),
    ]);
  }, []);

  const table = useLeadsTable({
    enabled: !isKanbanView,
    assignedToUserId,
    status: tableStatus,
    initialStatus: searchParams.get("status") || "all",
    reminderLeadIdsByPriority,
    reminderLeadDetails,
    leadsWithReminders,
    leadsWithOverdueReminders,
    duplicateLeadIds,
    leadProjectMap,
    leadInvoiceMap,
    onMutate: refreshAll,
    pageSize: tablePageSize,
    onPageSizeChange: setTablePageSize,
    assignmentFilter: tableAssignmentFilter,
    onAssignmentFilterChange: setTableAssignmentFilter,
    onStatusChange: setTableStatus,
  });

  const kanban = useLeadsKanban({
    enabled: isKanbanView,
    assignedToUserId,
    kanbanTeamId,
    onKanbanTeamIdChange: setKanbanTeamId,
    reminderLeadDetails,
    reminderLeadPriorityIndex,
    leadsWithReminders,
    leadsWithOverdueReminders,
    onMutate: refreshAll,
  });

  const refreshLeadsData = useCallback(async () => {
    const refreshers: Promise<unknown>[] = [refreshAll()];
    if (isKanbanView) {
      refreshers.push(kanban.kanbanMutate());
    } else {
      refreshers.push(table.tableMutate());
    }
    await Promise.all(refreshers);
  }, [isKanbanView, kanban, table, refreshAll]);

  useHeaderRefresh({ onRefresh: refreshLeadsData });

  const mutate = isKanbanView ? kanban.kanbanMutate : table.tableMutate;

  return (
    <>
      <ImportLeadsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={() => mutate()}
      />
      <ExportLeadsDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        onSuccess={() => mutate()}
      />
      <BulkEditLeadsDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedIds={table.selectedIds}
        onSuccess={() => {
          table.clearSelection();
          mutate();
        }}
      />

      <ListPageLayout
        title="Leads"
        description="Manage your sales leads"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Leads" },
        ]}
        icon={<UserPlus className="h-4 w-4" />}
        actions={
          <div className="flex gap-2">
            {viewMode === "table" && (
              <LeadsColumnPicker
                visibleColumns={table.visibleColumns}
                onToggleColumn={table.toggleColumn}
              />
            )}

            {(canImportLeads || canExportLeads || canCreateLeads) && (
              <>
                {canImportLeads && (
                  <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                )}
                {canExportLeads && (
                  <Button variant="outline" onClick={() => setIsExportOpen(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
                {canCreateLeads && (
                  <Button
                    onClick={() => router.push(`/sales/leads/new`)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lead
                  </Button>
                )}
              </>
            )}
          </div>
        }
        filters={
          <>
            {activeRemindersCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-200 px-2.5 py-1 text-xs font-medium text-red-700">
                <Bell className="h-3.5 w-3.5" />
                <span>
                  {activeRemindersCount} active reminder
                  {activeRemindersCount > 1 ? "s" : ""}
                  {overdueRemindersCount > 0 &&
                    ` (${overdueRemindersCount} overdue)`}
                </span>
              </div>
            )}

            {(isAdmin || isManager) && (
              <div className="flex border rounded-lg overflow-hidden h-fit w-fit">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="rounded-none"
                >
                  <List className="w-4 h-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className="rounded-none"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Kanban
                </Button>
              </div>
            )}

            <LeadsFiltersToolbar
              viewMode={viewMode}
              isAdmin={isAdmin}
              isManager={isManager}
              assignedToUserId={assignedToUserId}
              onAssignedToUserIdChange={setAssignedToUserId}
              assignmentFilter={table.assignmentFilter}
              onAssignmentFilterChange={table.setAssignmentFilter}
              status={table.status}
              onStatusChange={table.setStatus}
              onPageReset={() => table.setPage(1)}
              userStats={userStats}
              kanbanTeamId={kanban.kanbanTeamId}
              onKanbanTeamIdChange={kanban.setKanbanTeamId}
              teams={kanban.teams}
              kanbanTotalLeads={isKanbanView ? kanban.kanbanTotalLeads : undefined}
            />
          </>
        }
      >
        {viewMode === "kanban" && (
          <LeadsKanbanBoard
            onDragEnd={kanban.handleDragEnd}
            getLeadsByStatus={kanban.getLeadsByStatus}
            getTotalCountByStatus={kanban.getTotalCountByStatus}
            loadMoreForStatus={kanban.loadMoreForStatus}
            isInitialKanbanLoading={kanban.isInitialKanbanLoading}
            kanbanValidating={kanban.kanbanValidating}
            updatingLeadId={kanban.updatingLeadId}
            leadsWithReminders={leadsWithReminders}
            leadsWithOverdueReminders={leadsWithOverdueReminders}
            duplicateLeadIds={duplicateLeadIds}
          />
        )}

        {viewMode === "table" && (
          <LeadsTableView
            router={table.router}
            isAdmin={table.isAdmin}
            userId={table.user?.id}
            visibleColumns={table.visibleColumns}
            tableLeads={table.tableLeads}
            selectedIds={table.selectedIds}
            isLoading={table.tableLoading}
            error={table.error}
            meta={table.meta}
            pageSize={table.pageSize}
            onPageSizeChange={table.setPageSize}
            onPageChange={table.setPage}
            toggleSelectAll={table.toggleSelectAll}
            toggleSelect={table.toggleSelect}
            renderCell={table.renderCell}
            openReassignDialog={table.openReassignDialog}
            leadsWithReminders={leadsWithReminders}
            leadsWithOverdueReminders={leadsWithOverdueReminders}
            onOpenDetail={sheet.openDetail}
          />
        )}
      </ListPageLayout>

      <LeadDetailSheet
        leadId={sheet.selectedId}
        open={Boolean(sheet.selectedId)}
        onOpenChange={(open) => !open && sheet.closeDetail()}
      />

      {isAdmin && viewMode === "table" && (
        <BulkActionsBar
          count={table.selectedIds.length}
          label={`${table.selectedIds.length} lead(s) selected`}
          onClear={table.clearSelection}
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() => table.setIsBulkAssignOpen(true)}
          >
            <Users className="w-3 h-3 mr-1" />
            Assign Selected
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsBulkEditOpen(true)}>
            <Pencil className="w-3 h-3 mr-1" />
            Edit Selected
          </Button>
        </BulkActionsBar>
      )}

      <Dialog open={table.isReassignOpen} onOpenChange={table.setIsReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Lead</DialogTitle>
            <DialogDescription>
              Assign <strong>{table.leadToReassign?.leadName}</strong> to another
              team member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelector
              users={table.users}
              value={table.selectedReassignUserId}
              onValueChange={table.setSelectedReassignUserId}
              placeholder="Select team member..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => table.setIsReassignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={table.handleReassign}
              disabled={!table.selectedReassignUserId || !table.leadToReassign}
            >
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={table.isBulkAssignOpen}
        onOpenChange={table.setIsBulkAssignOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Leads</DialogTitle>
            <DialogDescription>
              Assign <strong>{table.selectedIds.length} lead(s)</strong> to a team
              member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelector
              users={table.users}
              value={table.selectedBulkAssignUserId}
              onValueChange={table.setSelectedBulkAssignUserId}
              placeholder="Select team member..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => table.setIsBulkAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={table.handleBulkAssign}
              disabled={
                !table.selectedBulkAssignUserId || table.selectedIds.length === 0
              }
            >
              Assign {table.selectedIds.length} Lead(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={kanban.isNalDialogOpen}
        onOpenChange={(open) => {
          if (!open) kanban.handleNalCancel();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Not A Lead - Reason Required</DialogTitle>
            <DialogDescription>
              Please provide a reason for marking this lead as &quot;Not A
              Lead&quot;. This cannot be left empty.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Textarea
              placeholder="Enter reason (e.g., wrong number, spam, duplicate, etc.)"
              value={kanban.nalReason}
              onChange={(e) => kanban.setNalReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {kanban.nalReason.length > 0 &&
              kanban.nalReason.trim().length < 3 && (
                <p className="text-sm text-red-500">
                  Reason must be at least 3 characters
                </p>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={kanban.handleNalCancel}>
              Cancel
            </Button>
            <Button
              onClick={kanban.handleNalConfirm}
              disabled={kanban.nalReason.trim().length < 3}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
