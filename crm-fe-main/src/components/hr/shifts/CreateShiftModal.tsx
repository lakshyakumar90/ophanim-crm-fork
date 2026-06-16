"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { shiftsApi } from "@/lib/api";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HREmployee } from "@/types/hr.types";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";

function empName(e: HREmployee) {
  return e.fullName ?? (e as { full_name?: string }).full_name ?? e.email ?? e.id;
}

export function CreateShiftModal({
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
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [shiftType, setShiftType] = useState<"day_shift" | "night_shift">("day_shift");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setUserId("");
      setShiftDate("");
      setStartTime("09:00");
      setEndTime("17:00");
      setShiftType("day_shift");
      setNotes("");
      return;
    }
    void fetchHrEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [open]);

  const handleSubmit = async () => {
    if (!userId || !shiftDate || !startTime || !endTime) {
      toast.error("Employee, date, and times are required");
      return;
    }
    setSaving(true);
    try {
      await shiftsApi.create({
        user_id: userId,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        shift_type: shiftType,
        notes: notes.trim() || undefined,
      });
      toast.success("Shift created");
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      toastHrError(e, "Failed to create shift");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create shift"
      description="Schedule a shift for an employee."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create shift"}
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
          <Label htmlFor="shift-date">Date</Label>
          <Input
            id="shift-date"
            type="date"
            value={shiftDate}
            onChange={(ev) => setShiftDate(ev.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">Start time</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(ev) => setStartTime(ev.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-time">End time</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(ev) => setEndTime(ev.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Shift type</Label>
          <Select value={shiftType} onValueChange={(v) => setShiftType(v as typeof shiftType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day_shift">Day shift</SelectItem>
              <SelectItem value="night_shift">Night shift</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shift-notes">Notes (optional)</Label>
          <Textarea
            id="shift-notes"
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
            rows={2}
          />
        </div>
      </div>
    </FormSideSheet>
  );
}
