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
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import { updateDocument } from "@/lib/hr-document-api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";

export function EditDocumentModal({
  doc,
  open,
  onOpenChange,
  onSaved,
}: {
  doc: EmployeeDocumentDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (row: EmployeeDocumentDto) => void;
}) {
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (doc && open) {
      setExpiryDate(doc.expiryDate ? doc.expiryDate.slice(0, 10) : "");
      setNotes(doc.notes ?? "");
    }
  }, [doc, open]);

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const row = await updateDocument(doc.id, {
        expiryDate: expiryDate ? expiryDate : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      toast.success("Document updated");
      onSaved(row);
      onOpenChange(false);
    } catch (e) {
      toastHrError(e, "Failed to update document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
        </DialogHeader>
        {doc ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {doc.fileName || doc.documentName} — employee and file cannot be changed here.
            </p>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-0"
                onClick={() => setExpiryDate("")}
              >
                Clear expiry
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || !doc} onClick={() => void save()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
