"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReleaseConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  confirmKeyword?: string;
}

export function ReleaseConfirmDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  title = "Release results?",
  description,
  confirmText = "Release results",
  confirmKeyword = "RELEASE",
}: ReleaseConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setTyped("");
        onOpenChange(v);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || (
              <>
                Releasing will notify all <strong>{count}</strong> employees that their results are
                available. Managers of top-rated employees may receive increment suggestions.{" "}
                <strong>This cannot be undone.</strong>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="release-confirm">Type {confirmKeyword} to confirm</Label>
          <Input
            id="release-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={confirmKeyword}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            disabled={typed !== confirmKeyword || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setTyped("");
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
