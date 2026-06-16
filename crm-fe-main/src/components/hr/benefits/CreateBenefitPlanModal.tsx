"use client";

import { useEffect, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { benefitsApi } from "@/lib/api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Loader2 } from "lucide-react";

export function CreateBenefitPlanModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setIsActive(true);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    setSaving(true);
    try {
      await benefitsApi.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
      });
      toast.success("Benefit plan created");
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      toastHrError(e, "Failed to create benefit plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create benefit plan"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create plan"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Name</Label>
            <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="plan-active">Active</Label>
            <Switch id="plan-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
      </div>
    </FormSideSheet>
  );
}
