"use client";

import { useEffect, useState } from "react";
import { fetchEmployeeCompensationHistory } from "@/lib/hr-employee-api";
import type { CompensationHistory } from "@/types/hr.types";
import { CompensationHistoryExpand } from "../CompensationHistoryExpand";
import { formatCTC } from "@/lib/employeeHelpers";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

export function EmployeeCompensationTab({
  employeeId,
  canFetch,
  canSeeCTC,
  canEdit,
  active,
}: {
  employeeId: string;
  canFetch: boolean;
  canSeeCTC: boolean;
  canEdit: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CompensationHistory[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setRows(undefined);
  }, [employeeId]);

  useEffect(() => {
    if (!active || !canFetch || loaded) return;
    setLoading(true);
    void fetchEmployeeCompensationHistory(employeeId)
      .then((r) => {
        setRows(r);
        setLoaded(true);
      })
      .catch(() => {
        setRows([]);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [active, canFetch, employeeId, loaded]);

  if (!canFetch) {
    return (
      <p className="text-sm text-muted-foreground">
        Compensation history requires <code className="text-xs">hr:compensation_view</code>,{" "}
        <code className="text-xs">hr:view</code>, or <code className="text-xs">hr:manage</code>.
      </p>
    );
  }

  const latest = rows?.[0];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 bg-muted/20">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Latest package</p>
        <p className="text-2xl font-semibold mt-1">
          {latest
            ? `${formatCTC(latest.newCtc, canSeeCTC)} / year`
            : canSeeCTC
              ? "—"
              : "₹**,**,***"}
        </p>
        {latest ? (
          <p className="text-xs text-muted-foreground mt-1">
            Effective {format(new Date(latest.effectiveDate), "dd MMM yyyy")}
            {latest.changeReason ? ` · ${latest.changeReason}` : ""}
          </p>
        ) : null}
      </div>

      <CompensationHistoryExpand rows={rows} loading={loading} canSeeAmounts={canSeeCTC} />

      {canEdit ? (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setInfoOpen(true)}>
            Record compensation change
          </Button>
          <AlertDialog open={infoOpen} onOpenChange={setInfoOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Record compensation change</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-left">
                  <span className="block">
                    CTC updates are handled from Payroll (not from{" "}
                    <code className="text-xs">/hr/employees/:id</code>).
                  </span>
                  <span className="block">
                    <strong>Specific employee:</strong> Payroll &rarr; Increments &rarr; New increment proposal.
                  </span>
                  <span className="block">
                    <strong>Department/job-title strategy:</strong> configure salary bands as guidance, then apply
                    increments to employees. Bulk CTC update by department/job title is not available as a single
                    action in this backend yet.
                  </span>
                  <span className="block">
                    Compensation history appears here automatically after increment approval/payroll recording.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInfoOpen(false);
                    router.push("/hr/payroll/salary-bands");
                  }}
                >
                  Open salary bands
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setInfoOpen(false);
                    router.push("/hr/payroll");
                  }}
                >
                  Open payroll
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
