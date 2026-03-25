"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { HrEmployeeDirectoryRow, LeaveRequestDto, LeaveTypeDto } from "@/types/hr-leaves";
import {
  formatLeaveDate,
  formatLeaveRelative,
  leaveStatusBadgeClass,
  leaveStatusLabel,
} from "@/lib/hr-leave-utils";
import { LeaveDetailDrawer } from "./LeaveDetailDrawer";
import { RejectLeaveModal } from "./RejectLeaveModal";
import { approveLeave, rejectLeave } from "@/lib/hr-leave-api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

const PAGE_SIZE = 20;

function empDept(e: HrEmployeeDirectoryRow | undefined) {
  return e?.departmentName ?? e?.department_name ?? "—";
}

function empTitle(e: HrEmployeeDirectoryRow | undefined) {
  return e?.jobTitle ?? e?.job_title ?? "—";
}

function toastErr(e: unknown, fb: string) {
  if (e instanceof AxiosError) {
    const s = e.response?.status;
    const m = (e.response?.data as { error?: { message?: string } })?.error?.message;
    if (s === 403) toast.error("You don't have permission for this action");
    else if (s === 404) toast.error("Resource not found. It may have been deleted.");
    else toast.error(m || fb);
    return;
  }
  toast.error(fb);
}

export function AllRequestsTab({
  rows,
  loading,
  employees,
  leaveTypes,
  canApprove,
  onRefresh,
}: {
  rows: LeaveRequestDto[];
  loading: boolean;
  employees: HrEmployeeDirectoryRow[];
  leaveTypes: LeaveTypeDto[];
  canApprove: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [typeId, setTypeId] = useState<string>("all");
  const [dept, setDept] = useState<string>("all");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<LeaveRequestDto | null>(null);
  const [rejectT, setRejectT] = useState<LeaveRequestDto | null>(null);

  const empById = useMemo(() => {
    const m = new Map<string, HrEmployeeDirectoryRow>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const departments = useMemo(() => {
    const s = new Set<string>();
    for (const e of employees) {
      const d = empDept(e);
      if (d && d !== "—") s.add(d);
    }
    return [...s].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const em = empById.get(r.userId);
      const name = (r.employeeName || "").toLowerCase();
      const mail = (r.employeeEmail || "").toLowerCase();
      if (q && !name.includes(q) && !mail.includes(q)) return false;
      if (status !== "all") {
        if (status === "pending_hr") {
          if (!["pending", "manager_approved"].includes(r.status)) return false;
        } else if (r.status !== status) return false;
      }
      if (typeId !== "all" && r.leaveTypeId !== typeId) return false;
      if (dept !== "all" && empDept(em) !== dept) return false;
      if (rangeStart && r.endDate < rangeStart) return false;
      if (rangeEnd && r.startDate > rangeEnd) return false;
      return true;
    });
  }, [rows, search, status, typeId, dept, rangeStart, rangeEnd, empById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onApprove = async (id: string) => {
    try {
      await approveLeave(id);
      toast.success("Approved");
      await onRefresh();
      setDrawer(null);
    } catch (e) {
      toastErr(e, "Approval failed");
    }
  };

  const onRejectConfirm = async (notes: string) => {
    if (!rejectT) return;
    try {
      await rejectLeave(rejectT.id, notes);
      toast.success("Rejected");
      setRejectT(null);
      setDrawer(null);
      await onRefresh();
    } catch (e) {
      toastErr(e, "Rejection failed");
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <Input
            placeholder="Search employee…"
            className="max-w-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_hr">Pending (incl. mgr ok)</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="manager_approved">Manager approved</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeId}
            onValueChange={(v) => {
              setTypeId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {leaveTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dept}
            onValueChange={(v) => {
              setDept(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-[140px]"
            value={rangeStart}
            onChange={(e) => {
              setRangeStart(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            className="w-[140px]"
            value={rangeEnd}
            onChange={(e) => {
              setRangeEnd(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => void onRefresh()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No requests found for the selected filters.
        </p>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => {
                  const em = empById.get(r.userId);
                  const pendingHr = r.status === "pending" || r.status === "manager_approved";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{empDept(em)}</TableCell>
                      <TableCell>{r.leaveTypeName}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatLeaveDate(r.startDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatLeaveDate(r.endDate)}</TableCell>
                      <TableCell>{r.totalDays}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={leaveStatusBadgeClass(r.status)}>
                          {leaveStatusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                        {r.reason || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatLeaveRelative(r.createdAt)}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setDrawer(r)}>
                          View
                        </Button>
                        {canApprove && pendingHr ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onApprove(r.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectT(r)}>
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({filtered.length} rows)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <LeaveDetailDrawer
        leave={drawer}
        open={!!drawer}
        onOpenChange={(v) => !v && setDrawer(null)}
        canApprove={canApprove}
        onApprove={onApprove}
        onReject={(l) => setRejectT(l)}
      />
      <RejectLeaveModal
        open={!!rejectT}
        onOpenChange={(v) => !v && setRejectT(null)}
        employeeName={rejectT?.employeeName || ""}
        onConfirm={onRejectConfirm}
      />
    </div>
  );
}
