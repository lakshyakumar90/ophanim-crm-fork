"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { leadsApi, usersApi, teamsApi } from "@/lib/api";
import { UserSelector } from "@/components/shared/user-selector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  MoreHorizontal,
  Upload,
  Download,
  X,
  LayoutGrid,
  List,
  User,
  Users,
  Bell,
} from "lucide-react";
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog";
import { ExportLeadsDialog } from "@/components/leads/export-leads-dialog";
import { BulkEditLeadsDialog } from "@/components/leads/bulk-edit-leads-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { formatIST } from "@/lib/date-utils";
import type { Lead, LeadStatus } from "@/types";
import {
  getAllStatuses,
  getStatusColor,
  getStatusLabel,
} from "@/lib/lead-status-config";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const ALL_COLUMNS = [
  { key: "leadName", label: "Lead Name" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "businessName", label: "Business Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "website", label: "Website" },
  { key: "country", label: "Country" },
  { key: "timezone", label: "Timezone" },
  { key: "createdAt", label: "Created" },
  { key: "leadType", label: "Lead Type" },
  { key: "nalReason", label: "NAL Reason" },
  { key: "clientResponse", label: "Client Response" },
];

const DEFAULT_COLUMNS = [
  "leadName",
  "email",
  "phone",
  "companyName",
  "status",
  "createdAt",
];

// Kanban status columns - the statuses to show
const KANBAN_STATUSES: LeadStatus[] = [
  "fresh_lead",
  "hot_lead",
  "cold_lead",
  "did_not_pick",
  "follow_up",
  "meeting_scheduled",
  "proposal_sent",
  "future_lead",
  "not_interested",
  "not_a_lead",
];

export default function LeadsPage() {
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();

  const [status, setStatus] = useState<string>(
    searchParams.get("status") || "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(DEFAULT_COLUMNS);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  // Kanban pagination - limit leads per status column
  const [statusLimits, setStatusLimits] = useState<Record<string, number>>(
    Object.fromEntries(KANBAN_STATUSES.map((s) => [s, 100])),
  );
  // Admins and managers can choose view mode, employees see Kanban only
  const [viewMode, setViewMode] = useState<"table" | "kanban">(
    isAdmin || isManager ? "table" : "kanban",
  );

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  // Track updating state for optimistic UI
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  // NAL reason dialog state
  const [isNalDialogOpen, setIsNalDialogOpen] = useState(false);
  const [nalReason, setNalReason] = useState("");
  const [pendingNalMove, setPendingNalMove] = useState<{
    leadId: string;
    newStatus: LeadStatus;
  } | null>(null);

  // Reassign state (for single lead reassign from table)
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [leadToReassign, setLeadToReassign] = useState<Lead | null>(null);
  const [selectedReassignUserId, setSelectedReassignUserId] =
    useState<string>("");

  // Bulk assign state
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [selectedBulkAssignUserId, setSelectedBulkAssignUserId] =
    useState<string>("");

  // Assignment filter state (Admin only, table view only)
  const [assignmentFilter, setAssignmentFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");

  // User filter state (Admin/Manager, both views)
  // Manager defaults to their own leads; Admin defaults to all
  const [assignedToUserId, setAssignedToUserId] = useState<string>("all");
  const [managerDefaultSet, setManagerDefaultSet] = useState(false);

  // Set manager default to see only their own leads
  useEffect(() => {
    if (user && isManager && !isAdmin && !managerDefaultSet) {
      setAssignedToUserId(user.id);
      setManagerDefaultSet(true);
    }
  }, [user, isManager, isAdmin, managerDefaultSet]);

  // Team filter state (Admin only, Kanban view)
  const [kanbanTeamId, setKanbanTeamId] = useState<string>("all");

  // Fetch users for assignment (Admin only)
  const { data: usersData } = useSWR(isAdmin ? "users-list" : null, () =>
    usersApi.list({ limit: 100 }),
  );
  const users = usersData?.data || [];

  // Fetch user stats for filtering (Admin/Manager with team)
  const { data: userStatsData } = useSWR(
    isAdmin || isManager ? "leads-user-stats" : null,
    () => leadsApi.getStatsByUser(),
  );
  const userStats = userStatsData || { users: [], unassignedCount: 0 };

  // Fetch teams for filtering (Admin only)
  const { data: teamsData } = useSWR(isAdmin ? "teams-list" : null, () =>
    teamsApi.list(),
  );
  const teams = teamsData || [];

  const isKanbanView = viewMode === "kanban";

  // ─── KANBAN: Per-status fetching (100 leads per column) ───
  const kanbanFilterParams = useMemo(
    () => ({
      assignedTo:
        assignedToUserId !== "all" && assignedToUserId !== "_unassigned"
          ? assignedToUserId
          : undefined,
      assigned:
        assignedToUserId === "_unassigned"
          ? ("unassigned" as const)
          : undefined,
      teamId: kanbanTeamId !== "all" ? kanbanTeamId : undefined,
    }),
    [assignedToUserId, kanbanTeamId],
  );

  const {
    data: kanbanData,
    isLoading: kanbanLoading,
    isValidating: kanbanValidating,
    mutate: kanbanMutate,
  } = useSWR(
    isKanbanView
      ? [
          "kanban-leads",
          assignedToUserId,
          kanbanTeamId,
          JSON.stringify(statusLimits),
        ]
      : null,
    async () => {
      const results = await Promise.all(
        KANBAN_STATUSES.map(async (statusValue) => {
          const limit = statusLimits[statusValue] || 100;
          const res = await leadsApi.list({
            limit,
            page: 1,
            status: statusValue,
            ...kanbanFilterParams,
          });
          return {
            status: statusValue,
            leads: (res.data || []) as Lead[],
            total: res.meta?.total || 0,
          };
        }),
      );
      return results;
    },
    {
      keepPreviousData: true,
    },
  );

  // ─── TABLE: Standard paginated fetch ───
  const {
    data: tableData,
    isLoading: tableLoading,
    error,
    mutate: tableMutate,
  } = useSWR(
    !isKanbanView
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

  // ─── Unified data accessors ───
  const leads = isKanbanView
    ? kanbanData?.flatMap((s) => s.leads) || []
    : tableData?.data || [];
  const meta = isKanbanView ? null : tableData?.meta;
  const isLoading = isKanbanView ? kanbanLoading : tableLoading;
  const isInitialKanbanLoading = isKanbanView && kanbanLoading && !kanbanData;
  const mutate = isKanbanView ? kanbanMutate : tableMutate;

  // Kanban total lead count (sum of all status totals)
  const kanbanTotalLeads =
    kanbanData?.reduce((sum, s) => sum + s.total, 0) || 0;

  // Fetch all pending reminders to highlight leads
  const { data: remindersData } = useSWR(["pending-reminders"], () =>
    leadsApi.getAllReminders({
      status: "pending",
      limit: 500,
    }),
  );

  const pendingReminders = useMemo(() => {
    if (Array.isArray(remindersData)) return remindersData;
    return remindersData?.data || [];
  }, [remindersData]);

  const getReminderLeadId = (reminder: any): string | undefined =>
    reminder?.leadId || reminder?.lead_id || reminder?.lead?.id || reminder?.leads?.id;

  const getReminderAt = (reminder: any): string | undefined =>
    reminder?.reminderAt || reminder?.reminder_at;

  const reminderLeadIdsByPriority = useMemo(() => {
    const sorted = [...pendingReminders].sort((a: any, b: any) => {
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
      const id = getReminderLeadId(reminder);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      uniqueIds.push(id);
    }
    return uniqueIds;
  }, [pendingReminders]);
  const reminderLeadPriorityIndex = useMemo(
    () => new Map<string, number>(reminderLeadIdsByPriority.map((id, i) => [id, i])),
    [reminderLeadIdsByPriority],
  );

  const leadsWithReminders = new Set(
    pendingReminders
      .map((r: any) => getReminderLeadId(r))
      .filter((id: string | undefined): id is string => Boolean(id)),
  );

  // Create a map of leadId -> hasOverdue for styling
  const leadsWithOverdueReminders = new Set(
    pendingReminders
      .filter((r: any) => {
        const reminderAt = getReminderAt(r);
        return reminderAt
          ? new Date(reminderAt).getTime() < Date.now()
          : false;
      })
      .map((r: any) => getReminderLeadId(r))
      .filter((id: string | undefined): id is string => Boolean(id)),
  );
  const activeRemindersCount = pendingReminders.length;
  const overdueRemindersCount = pendingReminders.filter((r: any) => {
    const reminderAt = getReminderAt(r);
    return reminderAt ? new Date(reminderAt).getTime() < Date.now() : false;
  }).length;

  const reminderLeadFetchIds = reminderLeadIdsByPriority.slice(
    0,
    isKanbanView ? 200 : Math.max(pageSize, 50),
  );
  const { data: reminderLeadDetails = [] } = useSWR(
    reminderLeadFetchIds.length > 0 && (!isKanbanView || kanbanTeamId === "all")
      ? [
          "reminder-leads",
          reminderLeadFetchIds.join(","),
          isKanbanView ? "kanban" : "table",
          kanbanTeamId,
          status,
          assignmentFilter,
          assignedToUserId,
        ]
      : null,
    async () => {
      const loaded = await Promise.all(
        reminderLeadFetchIds.map(async (id) => {
          try {
            return await leadsApi.get(id);
          } catch {
            return null;
          }
        }),
      );
      return loaded.filter(Boolean) as Lead[];
    },
  );

  const refreshLeadsData = useCallback(async () => {
    const refreshers: Promise<unknown>[] = [
      globalMutate("users-list"),
      globalMutate("leads-user-stats"),
      globalMutate("teams-list"),
      globalMutate(["pending-reminders"]),
    ];

    if (isKanbanView) {
      refreshers.push(kanbanMutate());
    } else {
      refreshers.push(tableMutate());
    }

    if (reminderLeadFetchIds.length > 0 && (!isKanbanView || kanbanTeamId === "all")) {
      refreshers.push(
        globalMutate((key) => Array.isArray(key) && key[0] === "reminder-leads"),
      );
    }

    await Promise.all(refreshers);
  }, [
    isKanbanView,
    kanbanMutate,
    kanbanTeamId,
    reminderLeadFetchIds.length,
    tableMutate,
  ]);

  useHeaderRefresh({
    onRefresh: refreshLeadsData,
  });

  const tableLeads = useMemo(() => {
    if (isKanbanView) return leads;

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

    const nonReminderLeads = baseLeads.filter((lead: Lead) => !reminderSet.has(lead.id));

    const merged: Lead[] = [];
    const seen = new Set<string>();
    for (const lead of [...filteredReminderLeads, ...baseLeads, ...nonReminderLeads]) {
      if (seen.has(lead.id)) continue;
      seen.add(lead.id);
      merged.push(baseMap.get(lead.id) || lead);
      if (merged.length >= pageSize) break;
    }

    return merged;
  }, [
    isKanbanView,
    leads,
    tableData?.data,
    pageSize,
    status,
    assignmentFilter,
    assignedToUserId,
    reminderLeadIdsByPriority,
    reminderLeadDetails,
    leadsWithOverdueReminders,
    leadsWithReminders,
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
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Failed to reassign");
    }
  };

  // Bulk assign handler
  const handleBulkAssign = async () => {
    if (!selectedBulkAssignUserId || selectedIds.length === 0) return;
    try {
      await leadsApi.bulkAssign(selectedIds, selectedBulkAssignUserId);
      toast.success(`${selectedIds.length} lead(s) assigned successfully`);
      setIsBulkAssignOpen(false);
      setSelectedBulkAssignUserId("");
      clearSelection();
      mutate();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to assign leads",
      );
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    const visibleLeads = viewMode === "table" ? tableLeads : leads;
    if (selectedIds.length === visibleLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleLeads.map((l: Lead) => l.id));
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

  const renderCell = (lead: Lead, key: string) => {
    switch (key) {
      case "leadName":
        return <span className="font-medium">{lead.leadName}</span>;
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
        // @ts-ignore
        return lead[key] || "-";
    }
  };

  // Get leads for a Kanban status column (sorted by reminder priority)
  const getLeadsByStatus = (statusValue: LeadStatus) => {
    let statusLeads: Lead[];
    if (isKanbanView && kanbanData) {
      const entry = kanbanData.find((s) => s.status === statusValue);
      const baseStatusLeads = [...(entry?.leads || [])];
      if (kanbanTeamId !== "all") {
        statusLeads = baseStatusLeads;
      } else {
        const reminderStatusLeads = reminderLeadDetails
          .filter((lead: Lead) => {
            if (lead.status !== statusValue) return false;
            if (
              assignedToUserId !== "all" &&
              assignedToUserId !== "_unassigned" &&
              lead.assignedTo !== assignedToUserId
            ) {
              return false;
            }
            if (assignedToUserId === "_unassigned" && lead.assignedTo) return false;
            return true;
          })
          .sort(
            (a: Lead, b: Lead) =>
              (reminderLeadPriorityIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (reminderLeadPriorityIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER),
          );
        const merged = new Map<string, Lead>();
        for (const lead of [...reminderStatusLeads, ...baseStatusLeads]) {
          if (!merged.has(lead.id)) merged.set(lead.id, lead);
        }
        statusLeads = [...merged.values()];
      }
    } else {
      statusLeads = leads.filter((lead: Lead) => lead.status === statusValue);
    }
    // Sort by reminder priority: overdue → upcoming → none
    statusLeads.sort((a: Lead, b: Lead) => {
      const aOverdue = leadsWithOverdueReminders.has(a.id) ? 0 : 1;
      const bOverdue = leadsWithOverdueReminders.has(b.id) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      const aReminder = leadsWithReminders.has(a.id) ? 0 : 1;
      const bReminder = leadsWithReminders.has(b.id) ? 0 : 1;
      return aReminder - bReminder;
    });
    return statusLeads;
  };

  // Get total count for a status (from API meta for Kanban, or client count for table)
  const getTotalCountByStatus = (statusValue: LeadStatus) => {
    if (isKanbanView && kanbanData) {
      const entry = kanbanData.find((s) => s.status === statusValue);
      return entry?.total || 0;
    }
    return leads.filter((lead: Lead) => lead.status === statusValue).length;
  };

  // Load more leads for a specific status column (increases limit, triggers refetch)
  const loadMoreForStatus = (statusValue: LeadStatus) => {
    setStatusLimits((prev) => ({
      ...prev,
      [statusValue]: (prev[statusValue] || 100) + 100,
    }));
  };

  // Handle drag end - update lead status
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same column at the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Get the new status from the destination column
    const newStatus = destination.droppableId as LeadStatus;
    const leadId = draggableId;

    // Find the lead being moved
    const leadToUpdate = leads.find((l: Lead) => l.id === leadId);
    if (!leadToUpdate) return;

    // Same column, different position - no status change needed
    if (destination.droppableId === source.droppableId) {
      return;
    }

    // If moving to NAL, show the NAL reason dialog instead of moving immediately
    if (newStatus === "not_a_lead") {
      setPendingNalMove({ leadId, newStatus });
      setNalReason("");
      setIsNalDialogOpen(true);
      return;
    }

    // For all other statuses, proceed normally
    await performStatusUpdate(leadId, newStatus);
  };

  // Perform the actual status update (used by both normal drag and NAL confirm)
  const performStatusUpdate = async (
    leadId: string,
    newStatus: LeadStatus,
    reason?: string,
  ) => {
    setUpdatingLeadId(leadId);

    // Optimistic update for Kanban per-status data
    if (isKanbanView && kanbanData) {
      let leadToMove: Lead | null = null;
      const optimistic = kanbanData.map((entry) => {
        const found = entry.leads.find((l: Lead) => l.id === leadId);
        if (found) leadToMove = found;
        return {
          ...entry,
          leads: entry.leads.filter((l: Lead) => l.id !== leadId),
          total: found ? entry.total - 1 : entry.total,
        };
      });
      if (leadToMove) {
        const destIdx = optimistic.findIndex((e) => e.status === newStatus);
        if (destIdx >= 0) {
          optimistic[destIdx] = {
            ...optimistic[destIdx],
            leads: [
              { ...(leadToMove as Lead), status: newStatus },
              ...optimistic[destIdx].leads,
            ],
            total: optimistic[destIdx].total + 1,
          };
        }
      }
      kanbanMutate(optimistic, false);
    } else if (tableData) {
      const optimisticLeads = (tableData.data || []).map((lead: Lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead,
      );
      tableMutate({ ...tableData, data: optimisticLeads }, false);
    }

    try {
      await leadsApi.updateStatus(leadId, newStatus, reason);
      toast.success(`Lead moved to ${getStatusLabel(newStatus)}`);
      if (isKanbanView) kanbanMutate();
      else tableMutate();
    } catch (error) {
      toast.error("Failed to update lead status");
      if (isKanbanView) kanbanMutate();
      else tableMutate();
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Handle NAL reason dialog confirmation
  const handleNalConfirm = async () => {
    if (!pendingNalMove || nalReason.trim().length < 3) {
      toast.error("Reason must be at least 3 characters");
      return;
    }
    setIsNalDialogOpen(false);
    await performStatusUpdate(
      pendingNalMove.leadId,
      pendingNalMove.newStatus,
      nalReason.trim(),
    );
    setPendingNalMove(null);
    setNalReason("");
  };

  // Handle NAL reason dialog cancel
  const handleNalCancel = () => {
    setIsNalDialogOpen(false);
    setPendingNalMove(null);
    setNalReason("");
  };

  return (
    <div className="space-y-6">
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

      {/* Bulk Edit Dialog */}
      <BulkEditLeadsDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          clearSelection();
          mutate();
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Manage your sales leads</p>
          {activeRemindersCount > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-200 px-2.5 py-1 text-xs font-medium text-red-700">
              <Bell className="h-3.5 w-3.5" />
              <span>
                {activeRemindersCount} active reminder
                {activeRemindersCount > 1 ? "s" : ""}
                {overdueRemindersCount > 0 &&
                  ` (${overdueRemindersCount} overdue)`}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {/* View Toggle - Admin and Manager */}
          {(isAdmin || isManager) && (
            <div className="flex border rounded-lg overflow-hidden h-fit">
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

          {viewMode === "table" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[200px] h-[300px] overflow-y-auto"
              >
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isManager && (
            <>
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={() => setIsExportOpen(true)}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => router.push(`/sales/leads/new`)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar - shows when items selected (Admin only) */}
      {isAdmin && selectedIds.length > 0 && viewMode === "table" && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.length} lead(s) selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-7"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBulkAssignOpen(true)}
              >
                <Users className="w-3 h-3 mr-1" />
                Assign Selected
              </Button>
              <Button size="sm" onClick={() => setIsBulkEditOpen(true)}>
                <Pencil className="w-3 h-3 mr-1" />
                Edit Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters for Table View */}
      {viewMode === "table" && (
        <div className="p-4 flex items-center justify-end">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* User Filter - Admin/Manager with team */}
            {(isAdmin || (isManager && userStats.users.length > 0)) && (
              <Select
                value={assignedToUserId}
                onValueChange={(v) => {
                  setAssignedToUserId(v);
                  setAssignmentFilter("all"); // Reset assignment filter when selecting user
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filter by User" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Users</SelectItem>
                  {isAdmin && userStats.unassignedCount > 0 && (
                    <SelectItem value="_unassigned">
                      Unassigned ({userStats.unassignedCount})
                    </SelectItem>
                  )}
                  {userStats.users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName} ({user.leadCount ?? user.total ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Assignment Filter - Admin only */}
            {isAdmin && (
              <Select
                value={assignmentFilter}
                onValueChange={(v: "all" | "assigned" | "unassigned") => {
                  setAssignmentFilter(v);
                  setAssignedToUserId("all"); // Reset user filter when changing assignment
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {getAllStatuses().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Kanban View with Drag and Drop */}
      {viewMode === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Kanban Filters & Pagination */}
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 bg-muted/30 rounded-lg">
            <div className="flex flex-wrap gap-3 items-center">
              {/* User Filter for Admin/Manager */}
              {(isAdmin || isManager) && (
                <Select
                  value={assignedToUserId}
                  onValueChange={(v) => {
                    setAssignedToUserId(v);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <User className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by User" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Users</SelectItem>
                    {isAdmin && userStats.unassignedCount > 0 && (
                      <SelectItem value="_unassigned">
                        Unassigned ({userStats.unassignedCount})
                      </SelectItem>
                    )}
                    {userStats.users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} ({user.leadCount ?? user.total ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Team Filter for Admin */}
              {isAdmin && (
                <Select
                  value={kanbanTeamId}
                  onValueChange={(v) => {
                    setKanbanTeamId(v);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by Team" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Lead Count Display */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Total: {kanbanTotalLeads} leads
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: "1600px" }}>
              {KANBAN_STATUSES.map((statusValue) => {
                const statusLeads = getLeadsByStatus(statusValue);
                const statusConfig = getAllStatuses().find(
                  (s) => s.value === statusValue,
                );
                return (
                  <div
                    key={statusValue}
                    className="flex-1 min-w-[200px] flex flex-col"
                  >
                    {/* Column Header */}
                    <div
                      className={`rounded-lg p-3 mb-3 ${getStatusColor(
                        statusValue,
                      )}`}
                    >
                      <div className="font-semibold text-center">
                        {statusConfig?.label || getStatusLabel(statusValue)}
                      </div>
                      <div className="text-center text-sm opacity-80">
                        ({statusLeads.length}
                        {getTotalCountByStatus(statusValue) >
                          statusLeads.length && (
                          <span> / {getTotalCountByStatus(statusValue)}</span>
                        )}
                        )
                      </div>
                    </div>

                    {/* Droppable Lead Cards Area */}
                    <Droppable droppableId={statusValue}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-2 flex-1 min-h-[200px] p-2 rounded-lg transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-primary/10 border-2 border-dashed border-primary/30"
                              : "bg-muted/30"
                          }`}
                        >
                          {isInitialKanbanLoading ? (
                            <>
                              <Skeleton className="h-24" />
                              <Skeleton className="h-24" />
                            </>
                          ) : (
                            statusLeads.map((lead: Lead, index: number) => (
                              <Draggable
                                key={lead.id}
                                draggableId={lead.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`${
                                      snapshot.isDragging ? "opacity-90" : ""
                                    } ${
                                      updatingLeadId === lead.id
                                        ? "opacity-50 pointer-events-none"
                                        : ""
                                    }`}
                                  >
                                    <Card
                                      {...provided.dragHandleProps}
                                      className={`cursor-grab hover:shadow-md transition-all ${
                                        snapshot.isDragging
                                          ? "shadow-lg rotate-2 scale-105"
                                          : ""
                                      } ${
                                        leadsWithOverdueReminders.has(lead.id)
                                          ? "border-l-4 border-l-red-500 bg-red-200 dark:bg-red-950/10 hover:border-red-400"
                                          : leadsWithReminders.has(lead.id)
                                            ? "border-l-4 border-l-green-500 bg-green-200 dark:bg-green-950/10 hover:border-green-400"
                                            : "hover:border-primary/50"
                                      }`}
                                    >
                                      <CardContent className="p-3 space-y-1">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <Link
                                              href={`/sales/leads/${lead.id}`}
                                              className="block"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <div className="font-semibold text-sm truncate hover:text-primary flex items-center gap-1">
                                                {lead.leadName}
                                                {leadsWithReminders.has(
                                                  lead.id,
                                                ) && (
                                                  <Bell
                                                    className={`h-3 w-3 shrink-0 ${
                                                      leadsWithOverdueReminders.has(
                                                        lead.id,
                                                      )
                                                        ? "text-red-500"
                                                        : "text-green-500"
                                                    }`}
                                                  />
                                                )}
                                              </div>
                                            </Link>
                                            {lead.businessName && (
                                              <div className="text-xs text-muted-foreground truncate">
                                                🏢 {lead.businessName}
                                              </div>
                                            )}
                                            {lead.email && (
                                              <div className="text-xs text-muted-foreground truncate">
                                                ✉️ {lead.email}
                                              </div>
                                            )}
                                            {lead.phone && (
                                              <div className="text-xs text-muted-foreground truncate">
                                                📞 {lead.phone}
                                              </div>
                                            )}
                                          </div>
                                          {/* Assignee Avatar */}
                                          <div className="flex flex-col items-end gap-1 shrink-0">
                                            {lead.assignee && (
                                              <Avatar
                                                className="h-6 w-6 border-2 border-background"
                                                title={lead.assignee.fullName}
                                              >
                                                <AvatarImage
                                                  src={
                                                    lead.assignee.avatarUrl ||
                                                    undefined
                                                  }
                                                />
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                  {lead.assignee.fullName
                                                    ?.substring(0, 2)
                                                    .toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                          {!isInitialKanbanLoading && statusLeads.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              Drop leads here
                            </div>
                          )}
                          {/* Load More Button */}
                          {!isInitialKanbanLoading &&
                            getTotalCountByStatus(statusValue) >
                              statusLeads.length && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => loadMoreForStatus(statusValue)}
                                disabled={kanbanValidating}
                              >
                                Load More (
                                {getTotalCountByStatus(statusValue) -
                                  statusLeads.length}{" "}
                                remaining)
                              </Button>
                            )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <>
          {/* Pagination */}
          {meta && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1); // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="w-fit h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1} to{" "}
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
                </p>
              </div>
              {meta.totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <Card>
            <CardContent className="p-0 overflow-auto">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">
                  Failed to load leads
                </div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No leads found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Checkbox column for Admin */}
                      {isAdmin && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              tableLeads.length > 0 &&
                              selectedIds.length === tableLeads.length
                            }
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                      )}
                      {ALL_COLUMNS.filter((col) =>
                        visibleColumns.includes(col.key),
                      ).map((col) => (
                        <TableHead key={col.key} className="whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableLeads.map((lead: Lead) => (
                      <TableRow
                        key={lead.id}
                        className={`cursor-pointer hover:bg-muted ${
                          selectedIds.includes(lead.id)
                            ? "bg-primary/5"
                            : leadsWithOverdueReminders.has(lead.id)
                              ? "bg-red-200/60 hover:bg-red-200 border-l-2 border-l-red-500"
                              : leadsWithReminders.has(lead.id)
                                ? "bg-green-200/60 hover:bg-green-200 border-l-2 border-l-green-500"
                                : ""
                        }`}
                        onClick={() => router.push(`/sales/leads/${lead.id}`)}
                      >
                        {/* Checkbox cell for Admin */}
                        {isAdmin && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(lead.id)}
                              onCheckedChange={() => toggleSelect(lead.id)}
                              aria-label={`Select ${lead.leadName}`}
                            />
                          </TableCell>
                        )}
                        {ALL_COLUMNS.filter((col) =>
                          visibleColumns.includes(col.key),
                        ).map((col) => (
                          <TableCell key={`${lead.id}-${col.key}`}>
                            {renderCell(lead, col.key)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <DropdownMenu>
                            {/* Existing menu content */}
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/sales/leads/${lead.id}`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {(isAdmin || lead.assignedTo === user?.id) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/sales/leads/${lead.id}/edit`)
                                  }
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => openReassignDialog(lead)}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Reassign
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Reassign Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Lead</DialogTitle>
            <DialogDescription>
              Assign <strong>{leadToReassign?.leadName}</strong> to another team
              member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelector
              users={users}
              value={selectedReassignUserId}
              onValueChange={setSelectedReassignUserId}
              placeholder="Select team member..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedReassignUserId || !leadToReassign}
            >
              Confirm Reassignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Leads</DialogTitle>
            <DialogDescription>
              Assign <strong>{selectedIds.length} lead(s)</strong> to a team
              member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UserSelector
              users={users}
              value={selectedBulkAssignUserId}
              onValueChange={setSelectedBulkAssignUserId}
              placeholder="Select team member..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!selectedBulkAssignUserId || selectedIds.length === 0}
            >
              Assign {selectedIds.length} Lead(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NAL Reason Dialog */}
      <Dialog
        open={isNalDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleNalCancel();
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
              value={nalReason}
              onChange={(e) => setNalReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {nalReason.length > 0 && nalReason.trim().length < 3 && (
              <p className="text-sm text-red-500">
                Reason must be at least 3 characters
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleNalCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleNalConfirm}
              disabled={nalReason.trim().length < 3}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
