"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PayrollRun } from "@/types/payroll";
import { formatINR, formatPayrollMonthLabel } from "@/lib/payroll-format";
import { CheckCircle2, Eye, FileWarning } from "lucide-react";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  submitted: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  approved: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  disbursed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
};

export function PayrollRunTableRow({
  run,
  onView,
  onApprove,
  onCorrection,
  canApprove,
  canManage,
  approvingId,
}: {
  run: PayrollRun;
  onView: () => void;
  onApprove: () => void;
  onCorrection: () => void;
  canApprove: boolean;
  canManage: boolean;
  approvingId: string | null;
}) {
  const initiated =
    run.initiated_by_user?.full_name ||
    (run.initiated_by ? `${run.initiated_by.slice(0, 8)}…` : "—");
  const approved =
    run.approved_by_user?.full_name ||
    (run.approved_by ? `${run.approved_by.slice(0, 8)}…` : "—");

  return (
    <TableRow className="cursor-default">
      <TableCell className="font-medium">
        <div className="flex flex-wrap items-center gap-2">
          {formatPayrollMonthLabel(run.month)}
          {run.is_correction && (
            <Badge variant="outline" className="gap-1 border-amber-400 bg-amber-50 text-amber-900 text-[10px]">
              <FileWarning className="h-3 w-3" />
              Correction
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={statusStyles[run.status] || "bg-muted"} variant="secondary">
          {run.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatINR(run.total_gross)}</TableCell>
      <TableCell className="text-right tabular-nums text-red-600">{formatINR(run.total_deductions)}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatINR(run.total_net)}</TableCell>
      <TableCell className="text-sm">{initiated}</TableCell>
      <TableCell className="text-sm">{approved}</TableCell>
      <TableCell>
        {run.is_correction ? (
          <Badge variant="outline" className="text-[10px]">
            Yes
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="outline" size="sm" onClick={onView} className="gap-1">
            <Eye className="h-3.5 w-3.5" />
            View Run
          </Button>
          {run.status === "submitted" && canApprove && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              disabled={approvingId === run.id}
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              title={run.status !== "submitted" ? "Run must be in submitted status" : undefined}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </Button>
          )}
          {run.status === "disbursed" && canManage && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-amber-400"
              onClick={(e) => {
                e.stopPropagation();
                onCorrection();
              }}
            >
              <FileWarning className="h-3.5 w-3.5" />
              Correction
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
