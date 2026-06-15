"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, ThumbsUp, Wallet, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { usePermission } from "@/hooks/auth/usePermission";
import { usePayrollRun, usePayrollRecords, payrollMutations } from "@/hooks/hr/usePayroll";
import { getPayrollErrorMessage } from "@/lib/payroll-client";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import { formatINR, formatPayrollMonthLabel } from "@/lib/payroll-format";
import type { PayrollRecord } from "@/types/payroll";
import { DisburseConfirmDialog } from "@/components/hr/payroll/disburse-confirm-dialog";
import { CorrectionRunModal } from "@/components/hr/payroll/correction-run-modal";
import { PayrollRecordsTable } from "@/components/hr/payroll/payroll-records-table";
import { EditPayrollRecordModal } from "@/components/hr/payroll/edit-payroll-record-modal";
import { DepartmentCostBar, type DeptCostSegment } from "@/components/hr/payroll/department-cost-bar";
import { parseNum } from "@/lib/payroll-format";
import type { PayrollRun } from "@/types/payroll";

const statusBadge: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  submitted: "bg-amber-100 text-amber-900",
  approved: "bg-blue-100 text-blue-900",
  disbursed: "bg-emerald-100 text-emerald-900",
};

export default function PayrollRunDetailPage() {
  const canApprove = usePermission("payroll:approve");
  const canManage = usePermission("payroll:manage");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { run, isLoading: runLoading, mutate: mutateRun } = usePayrollRun(id);
  const { records, isLoading: recLoading, mutate: mutateRec } = usePayrollRecords(id);

  const [processing, setProcessing] = useState(false);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [corrOpen, setCorrOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [deptByUser, setDeptByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const list = await fetchHrEmployees();
        const map: Record<string, string> = {};
        for (const e of list) {
          const uid = String(e.id);
          const dept = e.departmentName ?? "Unknown";
          map[uid] = dept || "Unknown";
        }
        setDeptByUser(map);
      } catch {
        setDeptByUser({});
      }
    })();
  }, []);

  const deptSegments: DeptCostSegment[] = useMemo(() => {
    const m: Record<string, { net: number; n: number }> = {};
    for (const r of records) {
      const d = deptByUser[r.employee_id] || "Unknown";
      if (!m[d]) m[d] = { net: 0, n: 0 };
      m[d].net += parseNum(r.net_pay);
      m[d].n += 1;
    }
    return Object.entries(m)
      .map(([department, v]) => ({
        department,
        employeeCount: v.n,
        totalNet: v.net,
      }))
      .sort((a, b) => b.totalNet - a.totalNet);
  }, [records, deptByUser]);

  const totalNetRun = parseNum(run?.total_net);

  const transition = async (fn: () => Promise<unknown>, msg: string) => {
    setProcessing(true);
    try {
      await fn();
      toast.success(msg);
      await Promise.all([mutateRun(), mutateRec()]);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setProcessing(false);
      setDisburseOpen(false);
    }
  };

  const loading = runLoading || recLoading;

  if (loading && !run) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-destructive">
        <p>Payroll run not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/hr/payroll")}>
          Back to Payroll
        </Button>
      </div>
    );
  }

  const readOnlyBanner =
    run.status === "approved" || run.status === "disbursed"
      ? run.status === "disbursed"
        ? "This run is disbursed and immutable. Use a correction run to make adjustments."
        : "This run is approved and cannot be edited. Records are locked until rejection (not supported) or correction after disbursement."
      : null;

  const monthLabel = formatPayrollMonthLabel(run.month);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/hr/payroll")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Payroll: {monthLabel}</h1>
            <Badge className={statusBadge[run.status] || ""} variant="secondary">
              {run.status}
            </Badge>
            {run.is_correction && (
              <Badge className="border-amber-500 bg-amber-50 text-amber-950 gap-1" variant="outline">
                <FileWarning className="h-3 w-3" />
                Correction run
              </Badge>
            )}
          </div>
          {run.is_correction && (
            <Alert className="mt-3 border-amber-300 bg-amber-50 text-amber-950">
              <AlertTitle>This is a correction run for {monthLabel}</AlertTitle>
              <AlertDescription>
                Adjust employee records as needed, then submit through the normal approval flow.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {readOnlyBanner && (
        <Alert>
          <AlertDescription>{readOnlyBanner}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card border rounded-lg p-6">
        <div>
          <p className="text-sm text-muted-foreground">Total gross</p>
          <p className="text-2xl font-bold tabular-nums">{formatINR(run.total_gross)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Deductions</p>
          <p className="text-2xl font-bold tabular-nums text-red-600">{formatINR(run.total_deductions)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Net payable</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-700">{formatINR(run.total_net)}</p>
        </div>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Initiated by:</span>{" "}
            {run.initiated_by_user?.full_name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Approved by:</span>{" "}
            {run.approved_by_user?.full_name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Disbursed at:</span>{" "}
            {run.disbursed_at ? new Date(run.disbursed_at).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {run.status === "draft" && canManage && (
          <Button
            disabled={processing || records.length === 0}
            className="gap-2"
            onClick={() =>
              void transition(
                () => payrollMutations.submitPayrollRun(id),
                "Submitted for approval",
              )
            }
          >
            <Send className="h-4 w-4" />
            Submit for approval
          </Button>
        )}
        {run.status === "submitted" && canApprove && (
          <Button
            disabled={processing}
            className="gap-2"
            onClick={() =>
              void transition(
                () => payrollMutations.approvePayrollRun(id),
                "Payroll run approved",
              )
            }
          >
            <ThumbsUp className="h-4 w-4" />
            Approve run
          </Button>
        )}
        {run.status === "approved" && canApprove && (
          <Button
            disabled={processing}
            className="gap-2 bg-destructive hover:bg-destructive/90"
            onClick={() => setDisburseOpen(true)}
          >
            <Wallet className="h-4 w-4" />
            Disburse payroll
          </Button>
        )}
        {run.status === "disbursed" && canManage && (
          <Button variant="outline" className="gap-2 border-amber-500" onClick={() => setCorrOpen(true)}>
            <FileWarning className="h-4 w-4" />
            Run correction
          </Button>
        )}
      </div>

      <DisburseConfirmDialog
        open={disburseOpen}
        onOpenChange={setDisburseOpen}
        totalNet={run.total_net}
        loading={processing}
        onConfirm={() =>
          void transition(
            () => payrollMutations.disbursePayrollRun(id),
            "Payroll disbursed — employees notified",
          )
        }
      />

      <CorrectionRunModal
        open={corrOpen}
        onOpenChange={setCorrOpen}
        sourceRun={run}
        onCreated={(newRun: PayrollRun) => {
          router.push(`/hr/payroll/${newRun.id}`);
        }}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Department summary</h2>
        <DepartmentCostBar segments={deptSegments} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Employee records</h2>
        <PayrollRecordsTable
          records={records.map((r) => ({
            ...r,
            employee: r.employee
              ? {
                  id: r.employee.id,
                  full_name: r.employee.full_name,
                  email: r.employee.email,
                  job_title: r.employee.job_title,
                }
              : null,
          }))}
          departmentByUserId={deptByUser}
          runStatus={run.status}
          canManage={canManage}
          onEdit={setEditRecord}
        />
      </section>

      <EditPayrollRecordModal
        open={!!editRecord}
        onOpenChange={(o) => !o && setEditRecord(null)}
        record={editRecord}
        runStatus={run.status}
        canEdit={canManage}
        onSaved={() => void mutateRec()}
      />
    </div>
  );
}
