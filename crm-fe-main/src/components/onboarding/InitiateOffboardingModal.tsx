"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useOffboarding } from "@/hooks/useOffboarding";
import type { HREmployeeOption } from "@/types/onboarding";
import { toast } from "sonner";

interface InitiateOffboardingModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: HREmployeeOption[];
  /** Employees who already have an offboarding checklist */
  offboardingEmployeeIds: Set<string>;
  onDone: () => void;
}

export function InitiateOffboardingModal({
  open,
  onOpenChange,
  employees,
  offboardingEmployeeIds,
  onDone,
}: InitiateOffboardingModalProps) {
  const { initiate, busy } = useOffboarding();
  const [employeeId, setEmployeeId] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [reason, setReason] = useState("");
  const [exitType, setExitType] = useState<"resignation" | "termination" | "contract_end">(
    "resignation",
  );
  const [search, setSearch] = useState("");

  const eligible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (offboardingEmployeeIds.has(e.id)) return false;
      if (!q) return true;
      return e.fullName.toLowerCase().includes(q);
    });
  }, [employees, offboardingEmployeeIds, search]);

  const selectedName = employees.find((e) => e.id === employeeId)?.fullName ?? "this employee";

  useEffect(() => {
    if (!open) {
      setEmployeeId("");
      setResignationDate("");
      setLastWorkingDay("");
      setReason("");
      setExitType("resignation");
      setSearch("");
    }
  }, [open]);

  const submit = async () => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (!lastWorkingDay) {
      toast.error("Last working day is required");
      return;
    }
    if (resignationDate && lastWorkingDay < resignationDate) {
      toast.error("Last working day must be on or after resignation date");
      return;
    }
    try {
      await initiate(employeeId, {
        resignation_date: resignationDate || undefined,
        last_working_day: lastWorkingDay,
        exit_type: exitType,
        reason: reason || undefined,
      });
      toast.success(`Offboarding initiated for ${selectedName}`);
      onOpenChange(false);
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to initiate offboarding");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Initiate offboarding</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {employeeId ? (
            <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-950">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Initiating offboarding will set <strong>{selectedName}</strong>&apos;s HR status to
                &quot;on leave&quot;. Their account stays active until you archive them after their
                last working day.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label>Search employee</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name…" />
          </div>
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {eligible.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Employees already in an offboarding workflow are hidden.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Exit type</Label>
            <Select
              value={exitType}
              onValueChange={(v) => setExitType(v as typeof exitType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resignation">Resignation</SelectItem>
                <SelectItem value="termination">Termination</SelectItem>
                <SelectItem value="contract_end">Contract end</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Resignation date</Label>
            <Input
              type="date"
              value={resignationDate}
              onChange={(e) => setResignationDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Last working day *</Label>
            <Input
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The system uses the default offboarding template when creating the checklist.
          </p>
          <Button className="w-full" disabled={busy} onClick={submit}>
            {busy ? "Starting…" : "Start offboarding"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
