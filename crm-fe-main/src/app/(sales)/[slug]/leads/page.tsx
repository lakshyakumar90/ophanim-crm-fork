"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { leadsApi, usersApi } from "@/lib/api";
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
import { useIsManager, useIsAdmin } from "@/providers/auth-provider";
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
];

export default function LeadsPage() {
  const router = useRouter();
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const isManager = useIsManager();
  const isAdmin = useIsAdmin();

  const [status, setStatus] = useState<string>(
    searchParams.get("status") || "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default to 50 for bulk operations
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

  // User filter state (Admin/Manager, table view only)
  const [assignedToUserId, setAssignedToUserId] = useState<string>("all");

  // Fetch users for assignment (Admin only)
  const { data: usersData } = useSWR(isAdmin ? "users-list" : null, () =>
    usersApi.list({ limit: 100 }).then((res) => res.data),
  );
  const users = usersData?.data || [];

  // Fetch user stats for filtering (Admin/Manager with team)
  const { data: userStatsData } = useSWR(
    (isAdmin || isManager) && viewMode === "table" ? "leads-user-stats" : null,
    () => leadsApi.getStatsByUser().then((res) => res.data?.data),
  );
  const userStats = userStatsData || { users: [], unassignedCount: 0 };

  const { data, isLoading, error, mutate } = useSWR(
    [
      "leads",
      page,
      pageSize,
      status,
      viewMode,
      assignmentFilter,
      assignedToUserId,
    ],
    () =>
      leadsApi
        .list({
          page,
          limit: viewMode === "kanban" ? 500 : pageSize, // Use pageSize for table view
          status: status !== "all" ? status : undefined,
          assigned:
            viewMode === "table" && assignmentFilter !== "all"
              ? assignmentFilter
              : viewMode === "table" && assignedToUserId === "_unassigned"
                ? "unassigned"
                : undefined,
          assignedTo:
            viewMode === "table" &&
            assignedToUserId !== "all" &&
            assignedToUserId !== "_unassigned"
              ? assignedToUserId
              : undefined,
        })
        .then((res) => res.data),
  );

  // Fetch today's reminders to highlight leads
  const { data: remindersData } = useSWR(
    ["today-reminders", new Date().toISOString().split("T")[0]],
    () =>
      leadsApi
        .getAllReminders({
          date: new Date().toISOString().split("T")[0],
          status: "pending",
          limit: 100,
        })
        .then((res) => res.data),
  );

  const leadsWithReminders = new Set(
    (remindersData?.data || []).map((r: any) => r.leadId),
  );

  // Create a map of leadId -> hasOverdue for styling
  const leadsWithOverdueReminders = new Set(
    (remindersData?.data || [])
      .filter((r: any) => new Date(r.reminderAt).getTime() < Date.now())
      .map((r: any) => r.leadId),
  );

  const leads = data?.data || [];
  const meta = data?.meta;

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
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l: Lead) => l.id));
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

  // Group leads by status for Kanban view (with pagination limits)
  const getLeadsByStatus = (statusValue: LeadStatus) => {
    const allForStatus = leads.filter(
      (lead: Lead) => lead.status === statusValue,
    );
    const limit = statusLimits[statusValue] || 100;
    return allForStatus.slice(0, limit);
  };

  // Get total count for a status
  const getTotalCountByStatus = (statusValue: LeadStatus) => {
    return leads.filter((lead: Lead) => lead.status === statusValue).length;
  };

  // Load more leads for a status
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

    // Optimistic update
    setUpdatingLeadId(leadId);

    // Create optimistic data
    const optimisticLeads = leads.map((lead: Lead) =>
      lead.id === leadId ? { ...lead, status: newStatus } : lead,
    );

    // Update the cache optimistically
    mutate(
      {
        ...data,
        data: optimisticLeads,
      },
      false, // Don't revalidate yet
    );

    try {
      // Call API to update the status
      await leadsApi.updateStatus(leadId, newStatus);
      toast.success(`Lead moved to ${getStatusLabel(newStatus)}`);
      // Revalidate to get the latest data
      mutate();
    } catch (error) {
      // Revert on error
      toast.error("Failed to update lead status");
      mutate(); // Revalidate to get the correct data
    } finally {
      setUpdatingLeadId(null);
    }
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
                onClick={() => router.push(`/${slug}/leads/new`)}
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
                      {user.fullName} ({user.leadCount})
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
                          {isLoading ? (
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
                                          ? "border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10 hover:border-red-400"
                                          : leadsWithReminders.has(lead.id)
                                            ? "border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-400"
                                            : "hover:border-primary/50"
                                      }`}
                                    >
                                      <CardContent className="p-3 space-y-1">
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <Link
                                              href={`/${slug}/leads/${lead.id}`}
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
                                                        : "text-amber-500"
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
                          {!isLoading && statusLeads.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              Drop leads here
                            </div>
                          )}
                          {/* Load More Button */}
                          {!isLoading &&
                            getTotalCountByStatus(statusValue) >
                              statusLeads.length && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => loadMoreForStatus(statusValue)}
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
                              leads.length > 0 &&
                              selectedIds.length === leads.length
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
                    {leads.map((lead: Lead) => (
                      <TableRow
                        key={lead.id}
                        className={`cursor-pointer hover:bg-muted ${
                          selectedIds.includes(lead.id)
                            ? "bg-primary/5"
                            : leadsWithOverdueReminders.has(lead.id)
                              ? "bg-red-50/50 hover:bg-red-100/50 border-l-2 border-l-red-500"
                              : leadsWithReminders.has(lead.id)
                                ? "bg-amber-50/50 hover:bg-amber-100/50 border-l-2 border-l-amber-500"
                                : ""
                        }`}
                        onClick={() => router.push(`/${slug}/leads/${lead.id}`)}
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
                                  router.push(`/${slug}/leads/${lead.id}`)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/${slug}/leads/${lead.id}/edit`)
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
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

          {/* Pagination */}
          {meta && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1} to{" "}
                  {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
                </p>
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
    </div>
  );
}
