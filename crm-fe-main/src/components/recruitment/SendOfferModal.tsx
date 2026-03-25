"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { Candidate } from "@/types/recruitment";
import { sendOfferAction } from "@/hooks/useOffers";
import { isFutureDate } from "@/lib/recruitment-format";
import { toast } from "sonner";

export function SendOfferModal({
  open,
  onOpenChange,
  candidate,
  defaultDesignation,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: Candidate | null;
  defaultDesignation?: string;
  onSuccess: () => void;
}) {
  const [ctc, setCtc] = useState("");
  const [joining_date, setJoiningDate] = useState("");
  const [designation, setDesignation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && defaultDesignation) {
      setDesignation((d) => d || defaultDesignation);
    }
  }, [open, defaultDesignation]);

  const submit = async () => {
    if (!candidate) return;
    const c = parseFloat(ctc);
    if (!Number.isFinite(c) || c <= 0) {
      toast.error("Enter a valid annual CTC");
      return;
    }
    if (!joining_date) {
      toast.error("Joining date is required");
      return;
    }
    if (!isFutureDate(joining_date)) {
      toast.error("Joining date must be in the future");
      return;
    }
    if (!designation.trim()) {
      toast.error("Designation is required");
      return;
    }
    setLoading(true);
    try {
      await sendOfferAction(candidate.id, {
        ctc: c,
        joining_date: new Date(joining_date).toISOString(),
        designation: designation.trim(),
      });
      onSuccess();
      onOpenChange(false);
      setCtc("");
      setJoiningDate("");
      setDesignation("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send offer</DialogTitle>
          <DialogDescription>
            {candidate?.full_name} — stage will move to <strong>Offer sent</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Annual CTC *</Label>
            <Input
              type="number"
              min={1}
              step="0.01"
              value={ctc}
              onChange={(e) => setCtc(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Joining date *</Label>
            <Input
              type="date"
              value={joining_date}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Designation *</Label>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Senior Engineer"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
