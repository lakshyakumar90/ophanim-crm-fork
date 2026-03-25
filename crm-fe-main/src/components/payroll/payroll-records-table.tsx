"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Pencil, History } from "lucide-react";
import type { PayrollRecord, PayrollRunStatus } from "@/types/payroll";
import {
  attendanceSummaryDisplay,
  formatINR,
  parseNum,
} from "@/lib/payroll-format";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { format } from "date-fns";

type SortKey = "department" | "net" | "name";

export function PayrollRecordsTable({
  records,
  departmentByUserId,
  runStatus,
  canManage,
  onEdit,
}: {
  records: PayrollRecord[];
  departmentByUserId: Record<string, string>;
  runStatus: PayrollRunStatus;
  canManage: boolean;
  onEdit: (r: PayrollRecord) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  });
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  const canEditRow = canManage && (runStatus === "draft" || runStatus === "submitted");

  const filteredSorted = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = records.map((r) => ({
      ...r,
      dept: departmentByUserId[r.employee_id] || "Unknown",
      name: (r.employee?.full_name || "").toLowerCase(),
    }));
    if (qq) {
      list = list.filter(
        (r) =>
          r.name.includes(qq) ||
          (r.employee?.email || "").toLowerCase().includes(qq),
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sort.key === "name") {
        cmp = (a.employee?.full_name || "").localeCompare(b.employee?.full_name || "");
      } else if (sort.key === "department") {
        cmp = a.dept.localeCompare(b.dept);
      } else {
        cmp = parseNum(a.net_pay) - parseNum(b.net_pay);
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [records, q, sort, departmentByUserId]);

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by employee name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>
                <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => toggleSort("name")}>
                  Employee {sort.key === "name" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort("department")}
                >
                  Department {sort.key === "department" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </Button>
              </TableHead>
              <TableHead>Designation</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">HRA</TableHead>
              <TableHead className="text-right">Allow.</TableHead>
              <TableHead className="text-right">Incentive</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">PF</TableHead>
              <TableHead className="text-right">TDS</TableHead>
              <TableHead className="text-right">ESI</TableHead>
              <TableHead className="text-right">LOP days</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" className="-mr-3 h-8" onClick={() => toggleSort("net")}>
                  Net {sort.key === "net" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </Button>
              </TableHead>
              <TableHead className="text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="h-24 text-center text-muted-foreground">
                  No matching records
                </TableCell>
              </TableRow>
            ) : (
              filteredSorted.map((r) => {
                const e = r.earnings || {};
                const d = r.deductions || {};
                const att = attendanceSummaryDisplay(r.attendance_summary as Record<string, number>);
                const netZero = parseNum(r.net_pay) === 0;
                const edits = Array.isArray(r.edits) ? r.edits : [];
                const hasEdits = edits.length > 0;
                const open = !!openRows[r.id];

                return (
                  <Fragment key={r.id}>
                    <TableRow
                      className={cn(
                        netZero && "bg-amber-50/80 dark:bg-amber-950/20",
                      )}
                      title={
                        netZero
                          ? "CTC not set for this employee — net pay is ₹0."
                          : undefined
                      }
                    >
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setOpenRows((s) => ({ ...s, [r.id]: !s[r.id] }))}
                          aria-expanded={open}
                        >
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium">{r.employee?.full_name || r.employee_id.slice(0, 8)}</span>
                            {hasEdits && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] cursor-help gap-0.5">
                                    <History className="h-3 w-3" />
                                    Edited
                                  </Badge>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 text-xs" align="start">
                                  <p className="font-semibold mb-2">Edit history</p>
                                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                                    {edits.map((ed, i) => (
                                      <li key={i} className="border-b pb-1 last:border-0">
                                        <p className="text-muted-foreground">
                                          {ed.timestamp
                                            ? format(new Date(ed.timestamp), "MMM d, yyyy HH:mm")
                                            : "—"}
                                        </p>
                                        <p>{ed.reason || ed.field || "Change"}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.employee?.email}</p>
                        </TableCell>
                        <TableCell>{r.dept}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.employee?.job_title || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(e.basic)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(e.hra)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(e.allowances)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(e.incentive)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatINR(r.gross_pay)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(d.pf)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(d.tds)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(d.esi)}</TableCell>
                        <TableCell className="text-right tabular-nums">{att.lopDays}</TableCell>
                        <TableCell className="text-right text-red-600 tabular-nums">
                          {formatINR(r.total_deductions)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatINR(r.net_pay)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEditRow ? (
                            <Button variant="ghost" size="icon" onClick={() => onEdit(r)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow key={`${r.id}-att`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={16} className="text-sm py-3">
                            <span className="font-medium text-muted-foreground">Attendance summary: </span>
                            Working {att.workingDays} · Present {att.presentDays} · Late {att.lateDays} · Half{" "}
                            {att.halfDays} · LOP days {att.lopDays}
                          </TableCell>
                        </TableRow>
                      )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
