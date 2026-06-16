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
import { assetsApi } from "@/lib/api";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import type { HREmployee } from "@/types/hr.types";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Loader2 } from "lucide-react";

function empName(e: HREmployee) {
  return e.fullName ?? (e as { full_name?: string }).full_name ?? e.email ?? e.id;
}

export function AssignAssetModal({
  open,
  onOpenChange,
  assetId,
  assetName,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assetId: string;
  assetName: string;
  onAssigned: () => Promise<void>;
}) {
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [userId, setUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setUserId("");
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
      await assetsApi.assign(assetId, userId, notes.trim() || undefined);
      toast.success("Asset assigned");
      onOpenChange(false);
      await onAssigned();
    } catch (e) {
      toastHrError(e, "Failed to assign asset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Assign asset"
      description={assetName}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
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
            <Label htmlFor="assign-notes">Notes (optional)</Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
      </div>
    </FormSideSheet>
  );
}
