"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { attendanceApi } from "@/lib/api";
import { toast } from "sonner";

const holidayTypes = ["national", "regional", "optional"] as const;

export function CreateHolidaySheet({
  open,
  onOpenChange,
  defaultDate,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date | null;
  onCreated?: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date: "",
    isOptional: false,
    holidayType: "national",
  });

  useEffect(() => {
    if (!open) {
      setForm({ name: "", date: "", isOptional: false, holidayType: "national" });
      return;
    }
    if (defaultDate) {
      setForm((f) => ({ ...f, date: format(defaultDate, "yyyy-MM-dd") }));
    }
  }, [open, defaultDate]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error("Holiday name is required");
      return;
    }
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    setIsSaving(true);
    try {
      const isOptional = form.holidayType === "optional" ? true : form.isOptional;
      await attendanceApi.createHoliday({
        name: form.name.trim(),
        date: form.date,
        isOptional,
      });
      toast.success("Holiday added successfully");
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to add holiday");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Holiday"
      description="Add a company holiday to the calendar."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleAdd()} disabled={isSaving}>
            {isSaving ? "Adding..." : "Add Holiday"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="holiday-name">Name *</Label>
          <Input
            id="holiday-name"
            placeholder="e.g. Republic Day"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="holiday-date">Date *</Label>
          <Input
            id="holiday-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Holiday Type</Label>
          <Select value={form.holidayType} onValueChange={(v) => setForm((f) => ({ ...f, holidayType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {holidayTypes.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="holiday-optional"
            checked={form.isOptional}
            onCheckedChange={(v) => setForm((f) => ({ ...f, isOptional: v }))}
          />
          <Label htmlFor="holiday-optional">Optional holiday</Label>
        </div>
      </div>
    </FormSideSheet>
  );
}
