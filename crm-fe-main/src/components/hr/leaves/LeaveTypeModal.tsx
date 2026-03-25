"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { LeaveTypeDto } from "@/types/hr-leaves";
import { createLeaveType, updateLeaveType } from "@/lib/hr-leave-api";
import { slugifyLeaveTypeName } from "@/lib/hr-leave-utils";
import { toast } from "sonner";
import { AxiosError } from "axios";

export function LeaveTypeModal({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: LeaveTypeDto | null;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slugPreview, setSlugPreview] = useState("");
  const [days, setDays] = useState("12");
  const [desc, setDesc] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [carry, setCarry] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setSlugPreview(slugifyLeaveTypeName(initial.name));
      setDays(String(initial.daysAllowed));
      setDesc(initial.description || "");
      setIsPaid(initial.isPaid);
      setCarry(initial.carryForward);
    } else {
      setName("");
      setSlugPreview("");
      setDays("12");
      setDesc("");
      setIsPaid(true);
      setCarry(false);
    }
  }, [open, initial]);

  useEffect(() => {
    setSlugPreview(slugifyLeaveTypeName(name));
  }, [name]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const d = Number(days);
    if (Number.isNaN(d) || d < 0) {
      toast.error("Invalid days allowed");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateLeaveType(initial.id, {
          name: name.trim(),
          description: desc.trim() || null,
          daysAllowed: d,
          isPaid,
          carryForward: carry,
        });
        toast.success("Leave type updated");
      } else {
        await createLeaveType({
          name: name.trim(),
          description: desc.trim() || undefined,
          daysAllowed: d,
          isPaid,
          carryForward: carry,
        });
        toast.success("Leave type created");
      }
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      if (e instanceof AxiosError) {
        const m = (e.response?.data as { error?: { message?: string } })?.error?.message;
        toast.error(m || "Save failed");
      } else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit leave type" : "Add leave type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug (identifier preview)</Label>
            <Input value={slugPreview} readOnly className="bg-muted/50" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Derived from name for display; backend uses the name as the canonical label.
            </p>
          </div>
          <div>
            <Label>Days allowed / year</Label>
            <Input type="number" min={0} max={366} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Paid</Label>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Carry forward</Label>
            <Switch checked={carry} onCheckedChange={setCarry} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[72px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
