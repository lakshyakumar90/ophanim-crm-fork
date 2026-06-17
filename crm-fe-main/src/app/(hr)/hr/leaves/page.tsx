"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/auth/usePermission";
import { useLeaveStats } from "@/hooks/hr/useLeaveStats";
import {
  fetchApprovedLeavesForCalendar,
  fetchLeaveRequests,
  fetchLeaveTypes,
  fetchPendingLeaves,
} from "@/lib/hr-leave-api";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HrEmployeeDirectoryRow, LeaveRequestDto, LeaveTypeDto } from "@/types/hr-leaves";
import { PendingApprovalsTab } from "@/components/hr/leaves/PendingApprovalsTab";
import { AllRequestsTab } from "@/components/hr/leaves/AllRequestsTab";
import { LeaveKPICards } from "@/components/hr/leaves/LeaveKPICards";
import { CreateLeaveModal } from "@/components/hr/leaves/CreateLeaveModal";
import { HRTeamLeaveCalendar } from "@/components/hr/leaves/team-leave-calendar";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  ListChecks,
  Plus,
} from "lucide-react";

type TabKey = "overview" | "pending" | "all" | "calendar";

export default function HrLeavesPage() {
  const leaveView = usePermission("hr:leave_view");
  const hrView = usePermission("hr:view");
  const hrManage = usePermission("hr:manage");
  const leaveApprove = usePermission("hr:leave_approve");
  const leaveManage = usePermission("hr:leave_manage");

  const canView = leaveView || hrView || hrManage;
  const canApprove = leaveApprove || hrManage;
  const canManage = leaveManage || hrManage;

  const { stats, onLeaveToday, loading: statsLoading, load: loadStats } = useLeaveStats();
  const [tab, setTab] = useState<TabKey>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pending, setPending] = useState<LeaveRequestDto[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequestDto[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<LeaveRequestDto[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeDto[]>([]);
  const [employees, setEmployees] = useState<HrEmployeeDirectoryRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const refreshCore = useCallback(async () => {
    setListLoading(true);
    try {
      const [p, a, cal, lt, em] = await Promise.all([
        fetchPendingLeaves(),
        fetchLeaveRequests(),
        fetchApprovedLeavesForCalendar(),
        fetchLeaveTypes(),
        fetchHrEmployees(),
      ]);
      setPending(p);
      setAllLeaves(a);
      setCalendarLeaves(cal);
      setLeaveTypes(lt);
      setEmployees(em);
    } finally {
      setListLoading(false);
    }
  }, []);

  const refreshAdminTypes = useCallback(async () => {
    return; // Removed - no longer managing leave types
  }, []);

  // Removed refreshAdminTypes from refreshAll

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), refreshCore()]);
  }, [loadStats, refreshCore]);

  useEffect(() => {
    if (!canView) return;
    void refreshAll();
  }, [canView, refreshAll]);

  const calRows: import("@/components/hr/leaves/team-leave-calendar").HrApprovedLeaveRow[] =
    useMemo(
      () =>
        calendarLeaves.map((l) => ({
          id: l.id,
          userId: l.userId,
          employeeName: l.employeeName || "",
          leaveTypeName: l.leaveTypeName || "",
          startDate: l.startDate,
          endDate: l.endDate,
        })),
      [calendarLeaves],
    );

  if (!canView) {
    return (
      <div className="text-muted-foreground">
        You do not have permission to view HR leaves.
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-full min-h-0 lg:-m-6">
        <aside
          className={cn(
            "relative flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/30 transition-all duration-300",
            sidebarCollapsed ? "w-12" : "w-56",
          )}
        >
          <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-1.5">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                tab === "overview" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
              title="Leave overview"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed ? <span>Leave overview</span> : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("calendar")}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                tab === "calendar" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
              title="Team calendar"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed ? <span>Team calendar</span> : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("pending")}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                tab === "pending" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
              title="Pending approvals"
            >
              <ListChecks className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed ? <span>Pending approvals</span> : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                tab === "all" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
              title="All requests"
            >
              <FileText className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed ? <span>All requests</span> : null}
            </button>

          </nav>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="m-1.5 h-7 w-7 shrink-0 self-end"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? "Expand leave sidebar" : "Collapse leave sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tab !== "calendar" ? (
            <div className="shrink-0 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Leave management</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  View leave requests and manage approvals.
                </p>
              </div>
              {canManage ? (
                <Button className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create leave request
                </Button>
              ) : null}
            </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 lg:p-6">
          {tab === "overview" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
              <LeaveKPICards
                stats={stats}
                onLeaveToday={onLeaveToday}
                loading={statsLoading}
                activeTab={tab}
                onTabChange={setTab}
              />
              <div className="rounded-xl border bg-card p-4 md:p-5">
                <h2 className="text-lg font-semibold">Leave Overview</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use the metric cards above to quickly jump into pending approvals and all requests.
                </p>
              </div>
            </div>
          ) : null}

          {tab === "pending" ? (
            <div className="space-y-4 overflow-y-auto">
              <PendingApprovalsTab
                canApprove={canApprove}
                initialList={pending}
                loading={listLoading}
                onRefresh={refreshCore}
                onStatsRefresh={loadStats}
              />
            </div>
          ) : null}

          {tab === "all" ? (
            <div className="space-y-4 overflow-y-auto">
              <AllRequestsTab
                rows={allLeaves}
                loading={listLoading}
                employees={employees}
                leaveTypes={leaveTypes}
                canApprove={canApprove}
                onRefresh={refreshCore}
              />
            </div>
          ) : null}



          {tab === "calendar" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <HRTeamLeaveCalendar
                approvedLeaves={calRows}
                onAddLeave={canManage ? () => setCreateOpen(true) : undefined}
              />
            </div>
          ) : null}
          </div>
        </div>

      <CreateLeaveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        leaveTypes={leaveTypes}
        onCreated={refreshAll}
      />
    </div>
  );
}
