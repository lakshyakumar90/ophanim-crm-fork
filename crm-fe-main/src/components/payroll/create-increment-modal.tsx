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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HrEmployeeOption } from "@/types/payroll";
import { formatINR, parseNum } from "@/lib/payroll-format";
import { getPayrollErrorMessage, proposeIncrement } from "@/lib/payroll-client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CreateIncrementModal({
  open,
  onOpenChange,
  employees,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: HrEmployeeOption[];
  onCreated: () => void;
}) {
  const [popOpen, setPopOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [proposedCtc, setProposedCtc] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = employees.find((e) => e.id === employeeId);
  const currentCtc = selected?.current_ctc ?? 0;
  const proposed = parseNum(proposedCtc);

  const pctChange = useMemo(() => {
    if (!currentCtc || currentCtc <= 0) return null;
    return Math.round(((proposed - currentCtc) / currentCtc) * 1000) / 10;
  }, [currentCtc, proposed]);

  useEffect(() => {
    if (!open) {
      setEmployeeId("");
      setProposedCtc("");
      setEffectiveDate("");
      setReason("");
    }
  }, [open]);

  const submit = async () => {
    if (!employeeId || proposed <= currentCtc || !effectiveDate || reason.trim().length < 1) {
      toast.error("New CTC must be greater than current CTC and all fields are required.");
      return;
    }
    setLoading(true);
    try {
      await proposeIncrement({
        employee_id: employeeId,
        proposed_ctc: proposed,
        effective_date: effectiveDate,
        reason: reason.trim(),
      });
      toast.success("Increment proposal submitted");
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const largeJump = pctChange !== null && pctChange > 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New increment proposal</DialogTitle>
          <DialogDescription>Propose a salary revision for an employee.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Popover open={popOpen} onOpenChange={setPopOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selected
                    ? `${selected.fullName || selected.full_name} (${selected.email})`
                    : "Search employee…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search name or email…" />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.fullName || e.full_name} ${e.email} ${e.id}`}
                          onSelect={() => {
                            setEmployeeId(e.id);
                            setPopOpen(false);
                          }}
                        >
                          <span className="truncate">
                            {e.fullName || e.full_name} — {e.email}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Current CTC (annual)</Label>
            <Input readOnly value={currentCtc ? String(currentCtc) : "—"} className="bg-muted" />
          </div>

          <div>
            <Label>New CTC (annual)</Label>
            <Input
              type="number"
              min={0}
              value={proposedCtc}
              onChange={(e) => setProposedCtc(e.target.value)}
            />
            {pctChange !== null && currentCtc > 0 && (
              <p className="text-xs mt-1 text-muted-foreground">
                Change:{" "}
                <span className={cn(pctChange >= 0 ? "text-emerald-600" : "text-red-600", "font-medium")}>
                  {pctChange >= 0 ? "+" : ""}
                  {pctChange}%
                </span>
              </p>
            )}
          </div>

          {largeJump && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is an unusually large increment. Please verify before submitting.
              </AlertDescription>
            </Alert>
          )}

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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            disabled={
              loading ||
              !employeeId ||
              proposed <= currentCtc ||
              !effectiveDate ||
              reason.trim().length < 1
            }
            onClick={() => void submit()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
