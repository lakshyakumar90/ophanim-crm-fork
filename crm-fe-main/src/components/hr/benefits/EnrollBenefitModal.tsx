"use client";

import { useEffect, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { benefitsApi } from "@/lib/api";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HREmployee } from "@/types/hr.types";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Loader2 } from "lucide-react";

function empName(e: HREmployee) {
  return e.fullName ?? (e as { full_name?: string }).full_name ?? e.email ?? e.id;
}

type PlanOption = { id: string; name: string };

export function EnrollBenefitModal({
  open,
  onOpenChange,
  plans,
  onEnrolled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: PlanOption[];
  onEnrolled: () => Promise<void>;
}) {
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<"pending" | "active">("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setUserId("");
      setPlanId("");
      setStatus("active");
      setNotes("");
      return;
    }
    void fetchHrEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [open]);

  const handleSubmit = async () => {
    if (!userId || !planId) {
      toast.error("Employee and plan are required");
      return;
    }
    setSaving(true);
    try {
      await benefitsApi.createEnrollment({
        user_id: userId,
        plan_id: planId,
        status,
        notes: notes.trim() || undefined,
      });
      toast.success("Enrollment created");
      onOpenChange(false);
      await onEnrolled();
    } catch (e) {
      toastHrError(e, "Failed to create enrollment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Enroll employee"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enroll"}
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
            <Label>Benefit plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enroll-notes">Notes (optional)</Label>
            <Textarea
              id="enroll-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
      </div>
    </FormSideSheet>
  );
}
