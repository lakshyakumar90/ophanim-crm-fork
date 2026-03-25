"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RejectLeaveModal({
  open,
  onOpenChange,
  employeeName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeName: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = reason.trim().length >= 10;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("");
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject leave for {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rej-reason">Reason (required, min 10 characters)</Label>
          <Textarea
            id="rej-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this request is rejected…"
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!valid || busy} onClick={() => void submit()}>
            {busy ? "Rejecting…" : "Confirm rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
