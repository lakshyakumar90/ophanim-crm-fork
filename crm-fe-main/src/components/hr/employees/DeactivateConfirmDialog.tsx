"use client";

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

export function DeactivateConfirmDialog({
  open,
  onOpenChange,
  mode,
  name,
  count,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "single" | "bulk";
  name?: string;
  count?: number;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "bulk" ? `Deactivate ${count} employees?` : `Deactivate ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "bulk"
              ? "Their accounts will be disabled. They will lose access to the platform immediately."
              : "Their account will be immediately disabled. They will be logged out and unable to access the platform."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : "Deactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ActivateConfirmDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reactivate {name}?</AlertDialogTitle>
          <AlertDialogDescription>They will regain platform access.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : "Reactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
