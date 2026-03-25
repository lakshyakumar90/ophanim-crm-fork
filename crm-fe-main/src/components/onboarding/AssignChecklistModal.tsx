"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createOnboardingChecklist } from "@/lib/onboarding-api";
import type { HREmployeeOption } from "@/types/onboarding";
import { toast } from "sonner";

interface AssignChecklistModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: HREmployeeOption[];
  /** Employees who already have an in-progress onboarding checklist */
  busyEmployeeIds: Set<string>;
  onAssigned: () => void;
}

export function AssignChecklistModal({
  open,
  onOpenChange,
  employees,
  busyEmployeeIds,
  onAssigned,
}: AssignChecklistModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const eligible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (busyEmployeeIds.has(e.id)) return false;
      if (departmentFilter !== "all" && (e.departmentName || "") !== departmentFilter) {
        return false;
      }
      if (teamFilter !== "all" && (e.teamName || "") !== teamFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = `${e.fullName} ${e.email} ${e.departmentName || ""} ${e.teamName || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, busyEmployeeIds, search, departmentFilter, teamFilter]);

  const departmentOptions = useMemo(() => {
    const values = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName) values.add(e.departmentName);
    });
    return [...values].sort();
  }, [employees]);

  const teamOptions = useMemo(() => {
    const values = new Set<string>();
    employees.forEach((e) => {
      if (e.teamName) values.add(e.teamName);
    });
    return [...values].sort();
  }, [employees]);

  useEffect(() => {
    if (!open) {
      setEmployeeId("");
      setJoiningDate("");
      setSearch("");
      setDepartmentFilter("all");
      setTeamFilter("all");
    }
  }, [open]);

  const submit = async () => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (!joiningDate) {
      toast.error("Joining date is required");
      return;
    }
    setSubmitting(true);
    try {
      const body: {
        employee_id: string;
        type: "onboarding";
        joining_date: string;
      } = {
        employee_id: employeeId,
        type: "onboarding",
        joining_date: joiningDate,
      };
      await createOnboardingChecklist(body);
      const name = employees.find((e) => e.id === employeeId)?.fullName ?? "Employee";
      toast.success(`Onboarding started for ${name}`);
      onOpenChange(false);
      onAssigned();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign checklist");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>Create onboarding</SheetTitle>
          <SheetDescription>
            Select an employee to start onboarding with the department/team assignment and document workflow.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Search user</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, department, team"
              />
            </div>
            <div className="space-y-2">
              <Label>Department filter</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team filter</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>User</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {eligible.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                    {e.departmentName ? ` · ${e.departmentName}` : ""}
                    {e.teamName ? ` · ${e.teamName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {eligible.length} eligible user(s). Users with an active onboarding checklist are hidden.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Onboarding start date *</Label>
            <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          </div>

          <Button className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Creating onboarding..." : "Create onboarding"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
