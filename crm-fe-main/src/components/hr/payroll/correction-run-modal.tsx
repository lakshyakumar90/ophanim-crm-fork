"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { formatPayrollMonthLabel } from "@/lib/payroll-format";
import type { PayrollRun } from "@/types/payroll";
import { createCorrectionRun, getPayrollErrorMessage } from "@/lib/payroll-client";
import { toast } from "sonner";

export function CorrectionRunModal({
  open,
  onOpenChange,
  sourceRun,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceRun: PayrollRun | null;
  onCreated: (newRun: PayrollRun) => void;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const monthLabel = sourceRun ? formatPayrollMonthLabel(sourceRun.month) : "";

  const submit = async () => {
    if (!sourceRun || notes.trim().length < 1) return;
    setLoading(true);
    try {
      const run = await createCorrectionRun(sourceRun.id, notes.trim());
      toast.success("Correction run created");
      onCreated(run);
      onOpenChange(false);
      setNotes("");
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run correction payroll</DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span className="block">
              A correction run creates a new <strong>draft</strong> payroll for{" "}
              <strong>{monthLabel}</strong>. You will need to manually adjust the relevant employee
              records in the new run.
            </span>
            <span className="block">
              The original run remains disbursed and immutable.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Month</Label>
          <p className="text-sm font-medium rounded-md border bg-muted/50 px-3 py-2">{monthLabel}</p>
          <Label htmlFor="corr-notes">Notes (required)</Label>
          <Textarea
            id="corr-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for this correction run…"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={notes.trim().length < 1 || loading} onClick={() => void submit()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Correction Run"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
