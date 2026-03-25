"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { HREmployee } from "@/types/hr.types";
import type { CompensationHistory } from "@/types/hr.types";
import { EmployeeTableRow } from "./EmployeeTableRow";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { normalizeHrStatus } from "@/lib/employeeHelpers";

export type SortKey = "name" | "department" | "joined" | "status" | "role";

export function EmployeeTable({
  rows,
  loading,
  expandedId,
  onToggleExpand,
  historyByEmployee,
  historyLoading,
  selectedIds,
  onToggleSelect,
  allChecked,
  onToggleAll,
  canFetchCompHistory,
  canSeeCTC,
  canEdit,
  onView,
  onEdit,
  onDeactivate,
  onActivate,
  onClearFilters,
  hasFilters,
}: {
  rows: HREmployee[];
  loading: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  historyByEmployee: Record<string, CompensationHistory[]>;
  historyLoading: Record<string, boolean>;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  allChecked: boolean;
  onToggleAll: () => void;
  canFetchCompHistory: boolean;
  canSeeCTC: boolean;
  canEdit: boolean;
  onView: (e: HREmployee) => void;
  onEdit: (e: HREmployee) => void;
  onDeactivate: (e: HREmployee) => void;
  onActivate: (e: HREmployee) => void;
  onClearFilters: () => void;
  hasFilters: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<string>("25");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.fullName.localeCompare(b.fullName);
      else if (sortKey === "department")
        cmp = (a.departmentName || "").localeCompare(b.departmentName || "");
      else if (sortKey === "joined") {
        const da = new Date(a.dateOfJoining || a.createdAt).getTime();
        const db = new Date(b.dateOfJoining || b.createdAt).getTime();
        cmp = da - db;
      } else if (sortKey === "status")
        cmp = normalizeHrStatus(a).localeCompare(normalizeHrStatus(b));
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      return cmp * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const size =
    pageSize === "all" ? sorted.length : Math.min(5000, Math.max(10, parseInt(pageSize, 10) || 25));
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(sorted.length / size));
  const pageSafe = Math.min(page, totalPages);
  const slice =
    pageSize === "all"
      ? sorted
      : sorted.slice((pageSafe - 1) * size, pageSafe * size);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortMark = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  if (loading && rows.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select
            value={pageSize}
            onValueChange={(v) => {
              setPageSize(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {sorted.length === 0
            ? "0 employees"
            : pageSize === "all"
              ? `${sorted.length} employees`
              : `${(pageSafe - 1) * size + 1}–${Math.min(pageSafe * size, sorted.length)} of ${sorted.length} employees`}
        </p>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={onToggleAll}
                  aria-label="Select all employees on page"
                />
              </TableHead>
              <TableHead>
                <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("name")}>
                  Employee{sortMark("name")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("role")}>
                  Role{sortMark("role")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="font-medium hover:underline"
                  onClick={() => toggleSort("department")}
                >
                  Department{sortMark("department")}
                </button>
              </TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>
                <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("status")}>
                  Status{sortMark("status")}
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="font-medium hover:underline" onClick={() => toggleSort("joined")}>
                  Joined{sortMark("joined")}
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-8 text-center">
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title="No employees found"
                    description="Try adjusting search or filters."
                    actionLabel={hasFilters ? "Clear filters" : undefined}
                    onAction={hasFilters ? onClearFilters : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              slice.map((emp) => (
                <EmployeeTableRow
                  key={emp.id}
                  emp={emp}
                  selected={selectedIds.includes(emp.id)}
                  onSelect={onToggleSelect}
                  expanded={expandedId === emp.id}
                  onToggleExpand={() => onToggleExpand(emp.id)}
                  historyRows={historyByEmployee[emp.id]}
                  historyLoading={!!historyLoading[emp.id]}
                  canFetchCompHistory={canFetchCompHistory}
                  canSeeCTC={canSeeCTC}
                  canEdit={canEdit}
                  onView={() => onView(emp)}
                  onEdit={() => onEdit(emp)}
                  onDeactivate={() => onDeactivate(emp)}
                  onActivate={() => onActivate(emp)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageSize !== "all" && totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
