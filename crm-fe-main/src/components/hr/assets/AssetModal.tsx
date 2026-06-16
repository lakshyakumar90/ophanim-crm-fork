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
import { assetsApi } from "@/lib/api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { Loader2 } from "lucide-react";

type AssetRow = {
  id: string;
  name: string;
  category?: string | null;
  serial_number?: string | null;
  status?: string | null;
  notes?: string | null;
};

const STATUSES = ["available", "assigned", "maintenance", "retired"] as const;

export function AssetModal({
  open,
  onOpenChange,
  asset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset?: AssetRow | null;
  onSaved: () => Promise<void>;
}) {
  const isEdit = Boolean(asset?.id);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (asset) {
      setName(asset.name ?? "");
      setCategory(asset.category ?? "");
      setSerialNumber(asset.serial_number ?? "");
      setStatus((asset.status as (typeof STATUSES)[number]) ?? "available");
      setNotes(asset.notes ?? "");
    } else {
      setName("");
      setCategory("");
      setSerialNumber("");
      setStatus("available");
      setNotes("");
    }
  }, [open, asset]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || undefined,
        serial_number: serialNumber.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      };
      if (isEdit && asset) {
        await assetsApi.update(asset.id, payload);
        toast.success("Asset updated");
      } else {
        await assetsApi.create(payload);
        toast.success("Asset created");
      }
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toastHrError(e, isEdit ? "Failed to update asset" : "Failed to create asset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit asset" : "Add asset"}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-category">Category</Label>
            <Input
              id="asset-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Laptop"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-serial">Serial number</Label>
            <Input
              id="asset-serial"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>
            <Textarea
              id="asset-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
      </div>
    </FormSideSheet>
  );
}
