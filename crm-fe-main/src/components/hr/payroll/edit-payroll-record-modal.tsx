"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { PayrollRecord, PayrollRunStatus } from "@/types/payroll";
import { formatINR, parseNum } from "@/lib/payroll-format";
import { getPayrollErrorMessage, updatePayrollRecord } from "@/lib/payroll-client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function EditPayrollRecordModal({
  open,
  onOpenChange,
  record,
  runStatus,
  canEdit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: PayrollRecord | null;
  runStatus: PayrollRunStatus;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [basic, setBasic] = useState("");
  const [hra, setHra] = useState("");
  const [specialAllowance, setSpecialAllowance] = useState("");
  const [otherAllowances, setOtherAllowances] = useState("");
  const [incentive, setIncentive] = useState("");
  const [pf, setPf] = useState("");
  const [tds, setTds] = useState("");
  const [esi, setEsi] = useState("");
  const [lop, setLop] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");
  const [loading, setLoading] = useState(false);

  const readOnly = !canEdit || runStatus === "approved" || runStatus === "disbursed";

  useEffect(() => {
    if (!record || !open) return;
    const e = record.earnings || {};
    const d = record.deductions || {};
    setBasic(String(e.basic ?? 0));
    setHra(String(e.hra ?? 0));
    setSpecialAllowance(String(e.allowances ?? 0));
    setOtherAllowances("0");
    setIncentive(String(e.incentive ?? 0));
    setPf(String(d.pf ?? 0));
    setTds(String(d.tds ?? 0));
    setEsi(String(d.esi ?? 0));
    setLop(String(d.lop ?? 0));
    setOtherDeductions(String(d.manual ?? d.advance_recovery ?? 0));
    setReason("");
  }, [record, open]);

  const liveGross = useMemo(() => {
    return num(basic) + num(hra) + num(specialAllowance) + num(otherAllowances) + num(incentive);
  }, [basic, hra, specialAllowance, otherAllowances, incentive]);

  const liveDeductions = useMemo(() => {
    return num(pf) + num(tds) + num(esi) + num(lop) + num(otherDeductions);
  }, [pf, tds, esi, lop, otherDeductions]);

  const liveNet = Math.max(0, liveGross - liveDeductions);
  const oldNet = record ? parseNum(record.net_pay) : 0;

  const save = async () => {
    if (!record || readOnly || reason.trim().length < 1) return;
    setLoading(true);
    try {
      const allowancesTotal = num(specialAllowance) + num(otherAllowances);
      await updatePayrollRecord(record.id, {
        reason: reason.trim(),
        earnings: {
          basic: num(basic),
          hra: num(hra),
          allowances: allowancesTotal,
          incentive: num(incentive),
        },
        deductions: {
          pf: num(pf),
          tds: num(tds),
          esi: num(esi),
          lop: num(lop),
          manual: num(otherDeductions),
        },
      });
      const name = record.employee?.full_name || "Employee";
      toast.success(`Record updated for ${name}`);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  const empName = record.employee?.full_name || "Employee";
  const designation = record.employee?.job_title || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit payroll record</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "This run cannot be edited in the current status."
              : `Adjust earnings and deductions for ${empName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-semibold">{empName}</p>
          <p className="text-muted-foreground">Designation: {designation}</p>
        </div>

        {readOnly ? (
          <Alert>
            <AlertDescription>
              This run is <strong>{runStatus}</strong> and records are read-only.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Basic</Label>
                <Input type="number" min={0} value={basic} onChange={(e) => setBasic(e.target.value)} />
              </div>
              <div>
                <Label>HRA</Label>
                <Input type="number" min={0} value={hra} onChange={(e) => setHra(e.target.value)} />
              </div>
              <div>
                <Label>Special allowance</Label>
                <Input
                  type="number"
                  min={0}
                  value={specialAllowance}
                  onChange={(e) => setSpecialAllowance(e.target.value)}
                />
              </div>
              <div>
                <Label>Other allowances</Label>
                <Input
                  type="number"
                  min={0}
                  value={otherAllowances}
                  onChange={(e) => setOtherAllowances(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Incentive</Label>
                <Input
                  type="number"
                  min={0}
                  value={incentive}
                  onChange={(e) => setIncentive(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Deductions</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>PF</Label>
                <Input type="number" min={0} value={pf} onChange={(e) => setPf(e.target.value)} />
              </div>
              <div>
                <Label>TDS</Label>
                <Input type="number" min={0} value={tds} onChange={(e) => setTds(e.target.value)} />
              </div>
              <div>
                <Label>ESI</Label>
                <Input type="number" min={0} value={esi} onChange={(e) => setEsi(e.target.value)} />
              </div>
              <div>
                <Label>LOP amount</Label>
                <Input type="number" min={0} value={lop} onChange={(e) => setLop(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Other deductions</Label>
                <Input
                  type="number"
                  min={0}
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border bg-card p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Gross (preview):</span>{" "}
                <strong>{formatINR(liveGross)}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Net (preview):</span>{" "}
                <strong>{formatINR(liveNet)}</strong>
              </p>
              <p className="text-xs text-muted-foreground pt-1 border-t">
                Audit: previous net {formatINR(oldNet)} → new {formatINR(liveNet)}
              </p>
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!readOnly && (
            <Button disabled={reason.trim().length < 1 || loading} onClick={() => void save()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
