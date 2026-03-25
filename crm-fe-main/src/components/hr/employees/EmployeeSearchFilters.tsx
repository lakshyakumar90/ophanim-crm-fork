"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { HREmployee } from "@/types/hr.types";
import { normalizeHrStatus } from "@/lib/employeeHelpers";

export type EmployeeTableFilters = {
  search: string;
  department: string;
  team: string;
  role: string;
  status: string;
  shift: string;
};

export function EmployeeSearchFilters({
  employees,
  searchInput,
  onSearchInputChange,
  filters,
  onFiltersChange,
  onExport,
  onAddClick,
  showAdd,
}: {
  employees: HREmployee[];
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  filters: EmployeeTableFilters;
  onFiltersChange: (f: EmployeeTableFilters) => void;
  onExport: () => void;
  onAddClick?: () => void;
  showAdd: boolean;
}) {

  const { departments, teams, roles } = useMemo(() => {
    const d = new Set<string>();
    const te = new Set<string>();
    const r = new Set<string>();
    for (const e of employees) {
      if (e.departmentName) d.add(e.departmentName);
      if (e.teamName) te.add(e.teamName);
      if (e.role) r.add(e.role);
    }
    return {
      departments: [...d].sort(),
      teams: [...te].sort(),
      roles: [...r].sort(),
    };
  }, [employees]);

  const pills: { key: string; label: string; clear: () => void }[] = [];
  if (filters.department !== "all")
    pills.push({
      key: "dept",
      label: `Dept: ${filters.department}`,
      clear: () => onFiltersChange({ ...filters, department: "all" }),
    });
  if (filters.team !== "all")
    pills.push({
      key: "team",
      label: `Team: ${filters.team}`,
      clear: () => onFiltersChange({ ...filters, team: "all" }),
    });
  if (filters.role !== "all")
    pills.push({
      key: "role",
      label: `Role: ${filters.role}`,
      clear: () => onFiltersChange({ ...filters, role: "all" }),
    });
  if (filters.status !== "all")
    pills.push({
      key: "status",
      label: `Status: ${filters.status}`,
      clear: () => onFiltersChange({ ...filters, status: "all" }),
    });
  if (filters.shift !== "all")
    pills.push({
      key: "shift",
      label: `Shift: ${filters.shift}`,
      clear: () => onFiltersChange({ ...filters, shift: "all" }),
    });
  if (filters.search.trim())
    pills.push({
      key: "search",
      label: `Search: ${filters.search.trim()}`,
      clear: () => {
        onSearchInputChange("");
        onFiltersChange({ ...filters, search: "" });
      },
    });

  const clearAll = () => {
    onSearchInputChange("");
    onFiltersChange({
      search: "",
      department: "all",
      team: "all",
      role: "all",
      status: "all",
      shift: "all",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, department, team, designation…"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button type="button" variant="outline" size="sm" onClick={onExport}>
            Export
          </Button>
          {showAdd && onAddClick ? (
            <Button type="button" size="sm" onClick={onAddClick}>
              Add employee
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={filters.department}
          onValueChange={(v) => onFiltersChange({ ...filters, department: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {departments.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.team} onValueChange={(v) => onFiltersChange({ ...filters, team: v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {teams.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.role} onValueChange={(v) => onFiltersChange({ ...filters, role: v })}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_leave">On leave</SelectItem>
            <SelectItem value="probation">Probation</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.shift} onValueChange={(v) => onFiltersChange({ ...filters, shift: v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shifts</SelectItem>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="evening">Evening</SelectItem>
            <SelectItem value="night">Night</SelectItem>
            <SelectItem value="flexible">Flexible</SelectItem>
            <SelectItem value="day_shift">Day shift</SelectItem>
            <SelectItem value="night_shift">Night shift</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((p) => (
            <Badge key={p.key} variant="secondary" className="gap-1 pr-1">
              {p.label}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={p.clear}
                aria-label="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button type="button" variant="link" size="sm" className="h-7 px-2" onClick={clearAll}>
            Clear all filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function filterEmployeesList(
  employees: HREmployee[],
  filters: EmployeeTableFilters,
): HREmployee[] {
  const q = filters.search.trim().toLowerCase();
  return employees.filter((emp) => {
    const matchesSearch =
      !q ||
      emp.fullName.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.departmentName || "").toLowerCase().includes(q) ||
      (emp.teamName || "").toLowerCase().includes(q) ||
      (emp.jobTitle || "").toLowerCase().includes(q);

    const matchesDept =
      filters.department === "all" ||
      (filters.department === "__unassigned__" && !emp.departmentName) ||
      emp.departmentName === filters.department;

    const matchesTeam =
      filters.team === "all" ||
      (filters.team === "__unassigned__" && !emp.teamName) ||
      emp.teamName === filters.team;

    const matchesRole = filters.role === "all" || emp.role === filters.role;

    const st = normalizeHrStatus(emp);
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && emp.isActive && st !== "archived" && st !== "on_leave") ||
      (filters.status === "inactive" && !emp.isActive) ||
      (filters.status === "on_leave" && st === "on_leave") ||
      (filters.status === "probation" && st === "probation") ||
      (filters.status === "archived" && st === "archived");

    const sh = emp.shiftType || "";
    const matchesShift =
      filters.shift === "all" ||
      (filters.shift === "__unassigned__" && !sh) ||
      sh === filters.shift;

    return matchesSearch && matchesDept && matchesTeam && matchesRole && matchesStatus && matchesShift;
  });
}
