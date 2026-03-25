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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPayrollErrorMessage, proposeIncrement } from "@/lib/payroll-client";
import type { HrEmployeeOption, SalaryBand } from "@/types/payroll";

function parseNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function SetCTCForEmployeeModal({
  open,
  onOpenChange,
  band,
  employees,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  band: SalaryBand | null;
  employees: HrEmployeeOption[];
  onCreated: () => Promise<void> | void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [proposedCtc, setProposedCtc] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId) ?? null,
    [employees, employeeId],
  );

  const minN = parseNumber(band?.min_ctc);
  const maxN = parseNumber(band?.max_ctc);
  const currentCtc = parseNumber((selectedEmployee as any)?.current_ctc ?? (selectedEmployee as any)?.currentCtc);
  const proposedN = parseNumber(proposedCtc);

  useEffect(() => {
    if (!open) return;

    // Defaults: highest CTC within the selected band.
    const defaultCtc = maxN > 0 ? maxN : minN;
    setProposedCtc(defaultCtc > 0 ? String(defaultCtc) : "");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setEffectiveDate(`${yyyy}-${mm}-${dd}`);

    setReason("");
    setEmployeeId((prev) => prev); // keep if user already picked an employee
  }, [open, band, minN, maxN]);

  useEffect(() => {
    if (open) return;
    setEmployeeId("");
    setProposedCtc("");
    setEffectiveDate("");
    setReason("");
    setSaving(false);
  }, [open]);

  const canSubmit = useMemo(() => {
    if (!employeeId) return false;
    if (!effectiveDate) return false;
    if (!reason.trim()) return false;
    if (!proposedCtc) return false;
    if (proposedN <= 0) return false;
    if (band) {
      if (minN > 0 && proposedN < minN) return false;
      if (maxN > 0 && proposedN > maxN) return false;
    }
    // Match existing increment flow behavior: proposed should be greater than current.
    if (currentCtc > 0 && proposedN <= currentCtc) return false;
    return true;
  }, [band, currentCtc, effectiveDate, employeeId, maxN, minN, proposedCtc, proposedN, reason]);

  const submit = async () => {
    if (!canSubmit || !band) return;
    setSaving(true);
    try {
      await proposeIncrement({
        employee_id: employeeId,
        proposed_ctc: proposedN,
        effective_date: effectiveDate,
        reason: reason.trim(),
      });
      toast.success("Increment proposal submitted");
      await onCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set salary for employee</DialogTitle>
          <DialogDescription>
            Uses the selected salary band CTC range. Compensation history will appear after approval/payroll
            recording.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId || "__none__"} onValueChange={(v) => setEmployeeId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {(e.fullName || (e as any).full_name || e.id) as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Min / Max (annual)</Label>
              <div className="rounded-md border bg-muted/20 p-2 text-sm text-muted-foreground">
                {minN > 0 ? `₹${minN.toLocaleString("en-IN")} ` : "—"} /{" "}
                {maxN > 0 ? `₹${maxN.toLocaleString("en-IN")}` : "—"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Proposed CTC (annual)</Label>
              <Input type="number" min={0} value={proposedCtc} onChange={(e) => setProposedCtc(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Effective date</Label>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>

          <div>
            <Label>Reason / notes</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

