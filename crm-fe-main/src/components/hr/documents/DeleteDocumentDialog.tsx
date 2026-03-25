"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { EmployeeDocumentDto } from "@/types/hr-documents";
import { deleteDocument } from "@/lib/hr-document-api";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";

export function DeleteDocumentDialog({
  doc,
  open,
  onOpenChange,
  onDeleted,
}: {
  doc: EmployeeDocumentDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

  const name = doc?.userName || "Employee";
  const file = doc?.fileName || doc?.documentName || "file";

  const confirmDelete = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      await deleteDocument(doc.id);
      toast.success("Document deleted");
      onDeleted(doc.id);
      onOpenChange(false);
    } catch (e) {
      toastHrError(e, "Failed to delete document");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-2">
              {step === 1 ? (
                <p>
                  Permanently delete <strong>{file}</strong> for <strong>{name}</strong>? This
                  removes the file from storage and cannot be undone.
                </p>
              ) : (
                <p className="text-destructive font-medium">
                  This action is irreversible. Confirm permanent deletion.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {step === 1 ? (
            <Button type="button" variant="destructive" onClick={() => setStep(2)}>
              Delete
            </Button>
          ) : (
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? "Deleting…" : "Yes, delete"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
