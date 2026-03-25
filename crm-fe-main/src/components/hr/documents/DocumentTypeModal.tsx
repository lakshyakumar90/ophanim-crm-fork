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
import type { HrDocumentTypeDto } from "@/types/hr-documents";
import { toast } from "sonner";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/^(\d)/, "t_$1");
}

export function DocumentTypeModal({
  open,
  onOpenChange,
  mode,
  initial,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial: HrDocumentTypeDto | null;
  onCreate: (body: {
    slug: string;
    label: string;
    description?: string;
    sortOrder?: number;
  }) => Promise<void>;
  onUpdate: (
    id: string,
    body: Partial<{
      label: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) => Promise<void>;
}) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setSlug(initial.slug);
      setLabel(initial.label);
      setDescription(initial.description ?? "");
      setSortOrder(String(initial.sortOrder ?? 100));
      setIsActive(initial.isActive);
    } else {
      setSlug("");
      setLabel("");
      setDescription("");
      setSortOrder("100");
      setIsActive(true);
    }
  }, [open, mode, initial]);

  useEffect(() => {
    if (mode === "create" && label.trim() && !slug.trim()) {
      const s = slugify(label);
      if (s && /^[a-z]/.test(s)) setSlug(s);
    }
  }, [label, mode, slug]);

  const submit = async () => {
    const s = slug.trim().toLowerCase().replace(/-/g, "_");
    if (mode === "create") {
      if (!/^[a-z][a-z0-9_]{0,62}$/.test(s)) {
        toast.error(
          "Slug must start with a letter and use lowercase letters, numbers, underscores only",
        );
        return;
      }
      if (!label.trim()) {
        toast.error("Label is required");
        return;
      }
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await onCreate({
          slug: s,
          label: label.trim(),
          description: description.trim() || undefined,
          sortOrder: Number(sortOrder) || 100,
        });
      } else if (initial) {
        await onUpdate(initial.id, {
          label: label.trim(),
          description: description.trim() ? description.trim() : null,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add document type" : "Edit document type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {mode === "create" ? (
            <>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="offer_letter" />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Offer letter" />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Slug: {slug} (read-only)</p>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" min={0} />
          </div>
          {mode === "edit" ? (
            <div className="flex items-center gap-2">
              <Switch id="type-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="type-active">Active</Label>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
