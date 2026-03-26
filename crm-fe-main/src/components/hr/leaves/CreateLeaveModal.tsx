"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HrEmployeeDirectoryRow, LeaveTypeDto } from "@/types/hr-leaves";
import { createLeaveOnBehalf, fetchLeaveBalances } from "@/lib/hr-leave-api";
import { countWorkingDays } from "@/lib/hr-leave-utils";
import { toast } from "sonner";
import { AxiosError } from "axios";

function normName(e: HrEmployeeDirectoryRow) {
  return e.fullName ?? e.full_name ?? "";
}

function empDeptName(e: HrEmployeeDirectoryRow) {
  return e.departmentName ?? e.department_name ?? "";
}

function empDeptId(e: HrEmployeeDirectoryRow) {
  return e.departmentId ?? e.department_id ?? "";
}

function empTeamId(e: HrEmployeeDirectoryRow) {
  return e.teamId ?? e.team_id ?? "";
}

function empTeamName(e: HrEmployeeDirectoryRow) {
  return e.teamName ?? e.team_name ?? "";
}

export function CreateLeaveModal({
  open,
  onOpenChange,
  employees,
  leaveTypes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: HrEmployeeDirectoryRow[];
  leaveTypes: LeaveTypeDto[];
  onCreated: () => Promise<void>;
}) {
  const [targetUserId, setTargetUserId] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [balances, setBalances] = useState<Awaited<ReturnType<typeof fetchLeaveBalances>>>([]);
  const [loadingBal, setLoadingBal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTargetUserId("");
      setDepartmentFilter("all");
      setTeamFilter("all");
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setBalances([]);
    }
  }, [open]);

  useEffect(() => {
    if (!targetUserId) {
      setBalances([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBal(true);
      try {
        const b = await fetchLeaveBalances(targetUserId);
        if (!cancelled) setBalances(b);
      } catch {
        if (!cancelled) setBalances([]);
      } finally {
        if (!cancelled) setLoadingBal(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return countWorkingDays(startDate, endDate);
  }, [startDate, endDate]);

  const remainingForType = useMemo(() => {
    const row = balances.find((b) => b.leaveTypeId === leaveTypeId);
    return row?.remainingDays ?? null;
  }, [balances, leaveTypeId]);

  const selectedEmp = employees.find((e) => e.id === targetUserId);
  const selectedLt = leaveTypes.find((t) => t.id === leaveTypeId);

  const departments = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string }> = [];
    for (const e of employees) {
      const id = empDeptId(e);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({ id, name: empDeptName(e) || id });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const teams = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string }> = [];
    for (const e of employees) {
      if (departmentFilter !== "all" && empDeptId(e) !== departmentFilter) continue;
      const id = empTeamId(e);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({ id, name: empTeamName(e) || id });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, departmentFilter]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (departmentFilter !== "all" && empDeptId(e) !== departmentFilter) return false;
      if (teamFilter !== "all" && empTeamId(e) !== teamFilter) return false;
      return true;
    });
  }, [employees, departmentFilter, teamFilter]);

  useEffect(() => {
    if (departmentFilter === "all") return;
    const stillValid = employees.some((e) => empDeptId(e) === departmentFilter);
    if (!stillValid) setDepartmentFilter("all");
  }, [employees, departmentFilter]);

  useEffect(() => {
    if (teamFilter === "all") return;
    const stillValid = teams.some((t) => t.id === teamFilter);
    if (!stillValid) setTeamFilter("all");
  }, [teams, teamFilter]);

  useEffect(() => {
    if (!targetUserId) return;
    const visible = filteredEmployees.some((e) => e.id === targetUserId);
    if (!visible) setTargetUserId("");
  }, [filteredEmployees, targetUserId]);

  const submit = async () => {
    if (!targetUserId || !leaveTypeId || !startDate || !endDate || !reason.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date");
      return;
    }
    if (workingDays <= 0) {
      toast.error("Select working days only (weekends excluded)");
      return;
    }
    setSaving(true);
    try {
      await createLeaveOnBehalf({
        targetUserId,
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      toast.success(`Leave request created for ${normName(selectedEmp!)}`);
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      if (e instanceof AxiosError) {
        const msg =
          (e.response?.data as { error?: { message?: string } })?.error?.message ||
          e.message;
        toast.error(msg || "Failed to create leave");
      } else toast.error("Failed to create leave");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create leave on behalf</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Department</Label>
              <Select
                value={departmentFilter}
                onValueChange={(v) => {
                  setDepartmentFilter(v);
                  setTeamFilter("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Employee</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {normName(e) || e.email || e.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Leave type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingBal ? (
              <p className="text-xs text-muted-foreground mt-1">Loading balance…</p>
            ) : remainingForType != null && selectedLt ? (
              <p className="text-xs mt-1">
                Remaining: <strong>{remainingForType}</strong> of {selectedLt.daysAllowed} days
                {workingDays > 0 && remainingForType < workingDays ? (
                  <span className="text-amber-700 dark:text-amber-400 ml-2">
                    ⚠ Insufficient balance ({remainingForType} days remaining)
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          {startDate && endDate ? (
            <p className="text-sm text-muted-foreground">
              Working days (excl. weekends): <strong>{workingDays}</strong>
            </p>
          ) : null}
          <div>
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void submit()}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
