"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { leadsApi, usersApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth, useIsManager, useIsAdmin } from "@/providers/auth-provider";
import { toast } from "sonner";
import { formatIST } from "@/lib/date-utils";
import type { Lead } from "@/types";
import { getStatusColor, getStatusLabel } from "@/lib/lead-status-config";
import { User, FolderKanban, Copy } from "lucide-react";
import { DEFAULT_COLUMNS } from "@/components/sales/leads/leads-list-constants";

export type AssignmentFilter = "all" | "assigned" | "unassigned";

export interface UseLeadsTableOptions {
  enabled: boolean;
  assignedToUserId: string;
  status?: string;
  initialStatus?: string;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  assignmentFilter?: AssignmentFilter;
  onAssignmentFilterChange?: (value: AssignmentFilter) => void;
  onStatusChange?: (value: string) => void;
  reminderLeadIdsByPriority: string[];
  reminderLeadDetails: Lead[];
  leadsWithReminders: Set<string>;
  leadsWithOverdueReminders: Set<string>;
  duplicateLeadIds: Set<string>;
  leadProjectMap: Map<string, { id: string; name: string }>;
  onMutate?: () => void;
}

export function useLeadsTable({
  enabled,
  assignedToUserId,
  status: controlledStatus,
  initialStatus = "all",
  pageSize: controlledPageSize,
  onPageSizeChange,
  assignmentFilter: controlledAssignmentFilter,
  onAssignmentFilterChange,
  onStatusChange,
  reminderLeadIdsByPriority,
  reminderLeadDetails,
  leadsWithReminders,
  leadsWithOverdueReminders,
  duplicateLeadIds,
  leadProjectMap,
  onMutate,
}: UseLeadsTableOptions) {
  const router = useRouter();
  const { user } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();

  const [statusInternal, setStatusInternal] = useState<string>(initialStatus);
  const [assignmentFilterInternal, setAssignmentFilterInternal] =
    useState<AssignmentFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSizeInternal, setPageSizeInternal] = useState(50);

  const status =
    controlledStatus !== undefined ? controlledStatus : statusInternal;
  const setStatus = (value: string) => {
    if (onStatusChange) onStatusChange(value);
    else setStatusInternal(value);
  };
  const assignmentFilter =
    controlledAssignmentFilter !== undefined
      ? controlledAssignmentFilter
      : assignmentFilterInternal;
  const setAssignmentFilter = (value: AssignmentFilter) => {
    if (onAssignmentFilterChange) onAssignmentFilterChange(value);
    else setAssignmentFilterInternal(value);
  };
  const pageSize =
    controlledPageSize !== undefined ? controlledPageSize : pageSizeInternal;
  const setPageSize = (value: number) => {
    if (onPageSizeChange) onPageSizeChange(value);
    else setPageSizeInternal(value);
  };
  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(DEFAULT_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [leadToReassign, setLeadToReassign] = useState<Lead | null>(null);
  const [selectedReassignUserId, setSelectedReassignUserId] =
    useState<string>("");
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [selectedBulkAssignUserId, setSelectedBulkAssignUserId] =
    useState<string>("");

  const { data: usersData } = useSWR(isAdmin ? "users-list" : null, () =>
    usersApi.list({ limit: 100 }),
  );
  const users = usersData?.data || [];

  const {
    data: tableData,
    isLoading: tableLoading,
    error,
    mutate: tableMutate,
  } = useSWR(
    enabled
      ? [
          "table-leads",
          page,
          pageSize,
          status,
          assignmentFilter,
          assignedToUserId,
        ]
      : null,
    () =>
      leadsApi.list({
        page,
        limit: pageSize,
        status: status !== "all" ? status : undefined,
        assigned:
          assignmentFilter !== "all"
            ? assignmentFilter
            : assignedToUserId === "_unassigned"
              ? "unassigned"
              : undefined,
        assignedTo:
          assignedToUserId !== "all" && assignedToUserId !== "_unassigned"
            ? assignedToUserId
            : undefined,
      }),
  );

  const meta = tableData?.meta;

  const tableLeads = useMemo(() => {
    if (!enabled) return [];

    const reminderIndex = new Map<string, number>(
      reminderLeadIdsByPriority.map((id, i) => [id, i]),
    );
    const reminderSet = new Set(reminderLeadIdsByPriority);
    const baseLeads = [...(tableData?.data || [])];
    const baseMap = new Map(baseLeads.map((l: Lead) => [l.id, l]));

    const filteredReminderLeads = [...(reminderLeadDetails || [])].filter(
      (lead: Lead) => {
        if (status !== "all" && lead.status !== status) return false;
        if (assignmentFilter === "assigned" && !lead.assignedTo) return false;
        if (assignmentFilter === "unassigned" && lead.assignedTo) return false;
        if (
          assignedToUserId !== "all" &&
          assignedToUserId !== "_unassigned" &&
          lead.assignedTo !== assignedToUserId
        ) {
          return false;
        }
        if (assignedToUserId === "_unassigned" && lead.assignedTo) return false;
        return true;
      },
    );
    filteredReminderLeads.sort(
      (a: Lead, b: Lead) =>
        (reminderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (reminderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );

    const nonReminderLeads = baseLeads.filter(
      (lead: Lead) => !reminderSet.has(lead.id),
    );

    const merged: Lead[] = [];
    const seen = new Set<string>();
    for (const lead of [
      ...filteredReminderLeads,
      ...baseLeads,
      ...nonReminderLeads,
    ]) {
      if (seen.has(lead.id)) continue;
      seen.add(lead.id);
      merged.push(baseMap.get(lead.id) || lead);
      if (merged.length >= pageSize) break;
    }

    return merged;
  }, [
    enabled,
    tableData?.data,
    pageSize,
    status,
    assignmentFilter,
    assignedToUserId,
    reminderLeadIdsByPriority,
    reminderLeadDetails,
  ]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const openReassignDialog = (lead: Lead) => {
    setLeadToReassign(lead);
    setSelectedReassignUserId(lead.assignedTo || "");
    setIsReassignOpen(true);
  };

  const handleReassign = async () => {
    if (!leadToReassign || !selectedReassignUserId) return;
    try {
      await leadsApi.assign(leadToReassign.id, selectedReassignUserId);
      toast.success("Lead reassigned successfully");
      setIsReassignOpen(false);
      setLeadToReassign(null);
      setSelectedReassignUserId("");
      await tableMutate();
      onMutate?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || "Failed to reassign");
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedBulkAssignUserId || selectedIds.length === 0) return;
    try {
      await leadsApi.bulkAssign(selectedIds, selectedBulkAssignUserId);
      toast.success(`${selectedIds.length} lead(s) assigned successfully`);
      setIsBulkAssignOpen(false);
      setSelectedBulkAssignUserId("");
      clearSelection();
      await tableMutate();
      onMutate?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(
        err.response?.data?.error?.message || "Failed to assign leads",
      );
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === tableLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tableLeads.map((l: Lead) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const renderCell = useCallback(
    (lead: Lead, key: string) => {
      switch (key) {
        case "leadName": {
          const linkedProject =
            lead.status === "won" && (isAdmin || isManager)
              ? leadProjectMap.get(lead.id)
              : null;
          const isDuplicate = duplicateLeadIds.has(lead.id);
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{lead.leadName}</span>
              {linkedProject && (
                <Link
                  href={`/projects/${linkedProject.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 hover:bg-blue-100 transition-colors w-fit"
                >
                  <FolderKanban className="h-3 w-3" />
                  {linkedProject.name}
                </Link>
              )}
              {isDuplicate && (
                <Link
                  href="/sales/duplicate-leads"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors w-fit"
                >
                  <Copy className="h-3 w-3" />
                  Duplicate
                </Link>
              )}
            </div>
          );
        }
        case "assignedTo":
          return (
            <div className="flex items-center gap-2">
              {lead.assignee ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={lead.assignee.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {lead.assignee.fullName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{lead.assignee.fullName}</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0"
                  >
                    Assigned
                  </Badge>
                </>
              ) : (
                <>
                  <User className="h-5 w-5 text-muted-foreground" />
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0"
                  >
                    Unassigned
                  </Badge>
                </>
              )}
            </div>
          );
        case "status":
          return (
            <Badge className={getStatusColor(lead.status)} variant="secondary">
              {getStatusLabel(lead.status)}
            </Badge>
          );
        case "createdAt":
          return lead[key] ? formatIST(lead[key]!, "MMM d, yyyy") : "-";
        case "country":
          return <span>{lead.country || "-"}</span>;
        case "businessName":
          return <span>{lead.businessName || "-"}</span>;
        case "timezone":
          return <span>{lead.timezone || "-"}</span>;
        default:
          return String((lead as unknown as Record<string, unknown>)[key] ?? "-");
      }
    },
    [duplicateLeadIds, isAdmin, isManager, leadProjectMap],
  );

  return {
    router,
    user,
    isAdmin,
    isManager,
    status,
    setStatus,
    assignmentFilter,
    setAssignmentFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    visibleColumns,
    toggleColumn,
    selectedIds,
    setSelectedIds,
    isReassignOpen,
    setIsReassignOpen,
    leadToReassign,
    selectedReassignUserId,
    setSelectedReassignUserId,
    isBulkAssignOpen,
    setIsBulkAssignOpen,
    selectedBulkAssignUserId,
    setSelectedBulkAssignUserId,
    users,
    tableData,
    tableLoading,
    error,
    tableMutate,
    meta,
    tableLeads,
    openReassignDialog,
    handleReassign,
    handleBulkAssign,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    renderCell,
    leadsWithReminders,
    leadsWithOverdueReminders,
  };
}
