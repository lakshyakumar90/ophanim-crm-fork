"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HrEmployeeDirectoryRow, LeaveBalanceDto, LeaveTypeDto } from "@/types/hr-leaves";
import { fetchLeaveBalances } from "@/lib/hr-leave-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

function normName(e: HrEmployeeDirectoryRow) {
  return e.fullName ?? e.full_name ?? e.email ?? e.id;
}

function Ring({ used, total }: { used: number; total: number }) {
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remainPct = Math.max(0, 100 - usedPct);
  const color =
    remainPct > 50 ? "text-emerald-600" : remainPct >= 20 ? "text-amber-600" : "text-red-600";
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-muted/30"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={color}
          strokeDasharray={`${remainPct}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {Math.round(remainPct)}%
      </div>
    </div>
  );
}

export function LeaveBalancesTab({
  employees,
  leaveTypes,
  canExport,
}: {
  employees: HrEmployeeDirectoryRow[];
  leaveTypes: LeaveTypeDto[];
  canExport: boolean;
}) {
  const { user } = useAuth();
  const [userId, setUserId] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("_all_depts");
  const [teamFilter, setTeamFilter] = useState("_all_teams");
  const [jobRoleFilter, setJobRoleFilter] = useState("_all_roles");
  const [balances, setBalances] = useState<LeaveBalanceDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize userId with current user's ID on mount
  useEffect(() => {
    if (user?.id && !userId) {
      setUserId(user.id);
    }
  }, [user?.id, userId]);

  useEffect(() => {
    if (!userId) {
      setBalances([]);
      return;
    }
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const b = await fetchLeaveBalances(userId);
        if (!c) setBalances(b);
      } catch {
        if (!c) setBalances([]);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [userId]);

  // Get unique departments, teams, and job roles from employees
  const filterOptions = useMemo(() => {
    const depts = new Set<string>();
    const teams = new Set<string>();
    const roles = new Set<string>();
    
    employees.forEach((e) => {
      if (e.departmentName || e.department_name) {
        depts.add(e.departmentName || e.department_name || "");
      }
      if (e.team_id || e.teamId) {
        teams.add(e.team_id || e.teamId || "");
      }
      if (e.jobTitle || e.job_title) {
        roles.add(e.jobTitle || e.job_title || "");
      }
    });
    
    return {
      departments: Array.from(depts).sort(),
      teams: Array.from(teams).sort(),
      jobRoles: Array.from(roles).sort(),
    };
  }, [employees]);

  // Filter employees based on selected filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (departmentFilter !== "_all_depts" && (e.departmentName || e.department_name) !== departmentFilter) {
        return false;
      }
      if (teamFilter !== "_all_teams" && (e.teamId || e.team_id) !== teamFilter) {
        return false;
      }
      if (jobRoleFilter !== "_all_roles" && (e.jobTitle || e.job_title) !== jobRoleFilter) {
        return false;
      }
      return true;
    });
  }, [employees, departmentFilter, teamFilter, jobRoleFilter]);

  const summary = useMemo(() => {
    // Get IDs of active leave types
    const activeLeaveTypeIds = new Set(leaveTypes.filter((lt) => lt.isActive).map((lt) => lt.id));
    
    // Filter balances to only include active leave types
    const filteredBalances = balances.filter((b) => activeLeaveTypeIds.has(b.leaveTypeId));
    
    const effectiveBalances =
      filteredBalances.length > 0
        ? filteredBalances
        : leaveTypes
            .filter((lt) => lt.isActive)
            .map((lt) => ({
              id: `virtual-${userId}-${lt.id}`,
              userId,
              leaveTypeId: lt.id,
              leaveTypeName: lt.name,
              year: new Date().getFullYear(),
              totalDays: lt.daysAllowed,
              usedDays: 0,
              remainingDays: lt.daysAllowed,
            } as LeaveBalanceDto));

    let ent = 0;
    let used = 0;
    let rem = 0;
    for (const b of effectiveBalances) {
      ent += b.totalDays;
      used += b.usedDays;
      rem += b.remainingDays;
    }
    return { ent, used, rem, effectiveBalances };
  }, [balances, leaveTypes, userId]);

  const exportCsv = () => {
    if (!summary.effectiveBalances.length || !userId) return;
    const emp = employees.find((e) => e.id === userId);
    const name = normName(emp!);
    const lines = [
      ["Employee", name],
      ["Leave type", "Total", "Used", "Remaining", "Year"],
      ...summary.effectiveBalances.map((b) => [
        b.leaveTypeName || "",
        String(b.totalDays),
        String(b.usedDays),
        String(b.remainingDays),
        String(b.year),
      ]),
    ];
    const csv = lines.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-balances-${userId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Filters</h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="dept-filter" className="text-xs">
              Department
            </Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger id="dept-filter" className="h-9">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="_all_depts">All departments</SelectItem>
                {filterOptions.departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="team-filter" className="text-xs">
              Team
            </Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger id="team-filter" className="h-9">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="_all_teams">All teams</SelectItem>
                {filterOptions.teams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role-filter" className="text-xs">
              Job Role
            </Label>
            <Select value={jobRoleFilter} onValueChange={setJobRoleFilter}>
              <SelectTrigger id="role-filter" className="h-9">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="_all_roles">All roles</SelectItem>
                {filterOptions.jobRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="space-y-2 min-w-60">
          <Label htmlFor="emp-select">Employee</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="emp-select">
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {filteredEmployees.map((e) => {
                const isCurrentUser = e.id === user?.id;
                return (
                  <SelectItem key={e.id} value={e.id}>
                    {normName(e)} {isCurrentUser ? "(You)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {canExport && summary.effectiveBalances.length > 0 ? (
          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export balances
          </Button>
        ) : null}
      </div>

      {!userId ? (
        <p className="text-center text-muted-foreground py-12">
          Select an employee to view their leave balance.
        </p>
      ) : loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.effectiveBalances.map((b) => (
              <div
                key={b.id}
                className="flex gap-4 items-center rounded-lg border border-border bg-background px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Ring used={b.usedDays} total={b.totalDays || 1} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{b.leaveTypeName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Used: {b.usedDays} d | Remaining: {b.remainingDays} d
                  </p>
                  <p className="text-xs text-muted-foreground">Year {b.year}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
            <span className="text-muted-foreground">Total entitlement: </span>
            <strong>{summary.ent}</strong> days
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">Used: </span>
            <strong>{summary.used}</strong>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">Remaining: </span>
            <strong>{summary.rem}</strong>
          </div>
        </>
      )}
    </div>
  );
}
