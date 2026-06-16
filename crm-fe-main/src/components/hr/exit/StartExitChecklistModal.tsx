"use client";

import { useEffect, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { exitApi } from "@/lib/api";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HREmployee } from "@/types/hr.types";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Loader2 } from "lucide-react";

function empName(e: HREmployee) {
  return e.fullName ?? (e as { full_name?: string }).full_name ?? e.email ?? e.id;
}

const DEFAULT_TEMPLATE = [
  { id: "it_access", title: "Revoke IT access" },
  { id: "equipment", title: "Return company equipment" },
  { id: "knowledge_transfer", title: "Complete knowledge transfer" },
  { id: "exit_interview", title: "Exit interview" },
  { id: "final_payroll", title: "Process final payroll" },
];

export function StartExitChecklistModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [userId, setUserId] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [exitType, setExitType] = useState("resignation");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setUserId("");
      setLastWorkingDay("");
      setExitType("resignation");
      setNotes("");
      return;
    }
    void fetchHrEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [open]);

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Select an employee");
      return;
    }
    setSaving(true);
    try {
      await exitApi.create({
        user_id: userId,
        template_json: DEFAULT_TEMPLATE,
        completed_items: [],
        last_working_day: lastWorkingDay || undefined,
        exit_type: exitType,
        notes: notes.trim() || undefined,
      });
      toast.success("Exit checklist started");
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      toastHrError(e, "Failed to start exit checklist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Start exit checklist"
      description="Begin offboarding for a departing employee."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start checklist"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empName(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-day">Last working day</Label>
            <Input
              id="last-day"
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Exit type</Label>
            <Select value={exitType} onValueChange={setExitType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resignation">Resignation</SelectItem>
                <SelectItem value="termination">Termination</SelectItem>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="contract_end">Contract end</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit-notes">Notes (optional)</Label>
            <Textarea
              id="exit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
      </div>
    </FormSideSheet>
  );
}
