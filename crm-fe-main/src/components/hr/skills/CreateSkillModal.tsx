"use client";

import { useEffect, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { skillsApi } from "@/lib/api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Loader2 } from "lucide-react";

export function CreateSkillModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCategory("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Skill name is required");
      return;
    }
    setSaving(true);
    try {
      await skillsApi.create({
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Skill created");
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      toastHrError(e, "Failed to create skill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add skill"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create skill"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Name</Label>
            <Input id="skill-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-category">Category</Label>
            <Input
              id="skill-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Engineering"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-description">Description</Label>
            <Textarea
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
      </div>
    </FormSideSheet>
  );
}
