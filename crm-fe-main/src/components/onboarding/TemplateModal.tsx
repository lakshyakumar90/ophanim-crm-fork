"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TaskBuilder, newRow, type TaskBuilderRow } from "./TaskBuilder";
import { TemplatePreview } from "./TemplatePreview";
import { useOnboardingTemplates } from "@/hooks/useOnboardingTemplates";
import type { OnboardingTemplate } from "@/types/onboarding";
import { toast } from "sonner";

interface TemplateModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  template: OnboardingTemplate | null;
  departmentOptions: string[];
  onSaved: () => void;
}

function rowsFromTemplate(t: OnboardingTemplate | null): TaskBuilderRow[] {
  if (!t?.tasks || !Array.isArray(t.tasks)) return [newRow()];
  return (t.tasks as unknown[]).map((taskRaw) => {
    const task = taskRaw as Record<string, unknown>;
    return {
      localId: crypto.randomUUID(),
      task_name: String(task.task_name ?? ""),
      description: String(task.description ?? ""),
      owner: (["IT", "HR", "Manager", "NewHire"].includes(String(task.owner))
        ? task.owner
        : "HR") as TaskBuilderRow["owner"],
      due_days_from_joining:
        typeof task.due_days_from_joining === "number"
          ? task.due_days_from_joining
          : Number(task.due_days_from_joining) || 0,
    };
  });
}

export function TemplateModal({
  open,
  onOpenChange,
  mode,
  template,
  departmentOptions,
  onSaved,
}: TemplateModalProps) {
  const { create, update } = useOnboardingTemplates();
  const [name, setName] = useState("");
  const [type, setType] = useState<"onboarding" | "offboarding">("onboarding");
  const [department, setDepartment] = useState<string>("__all__");
  const [rows, setRows] = useState<TaskBuilderRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);

  const previewJoining = useMemo(() => new Date(), [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && template) {
      setName(template.name);
      setType(template.type);
      setDepartment(template.department || "__all__");
      const r = rowsFromTemplate(template);
      setRows(r.length ? r : [newRow()]);
    } else if (mode === "create") {
      setName("");
      setType("onboarding");
      setDepartment("__all__");
      setRows([newRow()]);
    }
  }, [open, mode, template]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    const tasksPayload = rows.map((r) => ({
      task_name: r.task_name.trim(),
      description: r.description?.trim() || undefined,
      owner: r.owner,
      due_days_from_joining: r.due_days_from_joining,
    }));
    if (tasksPayload.some((t) => !t.task_name)) {
      toast.error("Each task needs a name");
      return;
    }
    if (tasksPayload.some((t) => t.due_days_from_joining < 0)) {
      toast.error("Due days must be 0 or greater");
      return;
    }
    if (!tasksPayload.length) {
      toast.error("Add at least one task");
      return;
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      type,
      tasks: tasksPayload,
    };
    if (department && department !== "__all__") {
      body.department = department;
    }
    setSaving(true);
    try {
      if (mode === "edit" && template) {
        await update(template.id, body);
        toast.success("Template updated");
      } else {
        await create(body);
        toast.success("Template created");
      }
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit template" : "Create template"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-2 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="offboarding">Offboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All departments</SelectItem>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TaskBuilder tasks={rows} onChange={setRows} />
          </div>
          <div className="space-y-3 lg:sticky lg:top-4 self-start">
            <Label>Preview</Label>
            <p className="text-xs text-muted-foreground">
              Preview uses today ({format(previewJoining, "d MMM yyyy")}) as sample joining date.
            </p>
            <TemplatePreview
              tasks={rows.map((r) => ({
                task_name: r.task_name,
                due_days_from_joining: r.due_days_from_joining,
              }))}
              joiningDate={previewJoining}
            />
            <Button className="w-full" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
