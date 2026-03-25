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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Interview } from "@/types/recruitment";
import { updateInterviewAction } from "@/hooks/useInterviews";

export function UpdateInterviewModal({
  open,
  onOpenChange,
  interview,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  interview: Interview | null;
  onSuccess: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<string>("");
  const [status, setStatus] = useState<string>("scheduled");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (interview) {
      setFeedback(interview.feedback || "");
      setRating(
        interview.rating != null ? String(interview.rating) : "",
      );
      setStatus(interview.status || "scheduled");
    }
  }, [interview]);

  const submit = async () => {
    if (!interview) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        feedback: feedback.trim() || undefined,
        status: status as Interview["status"],
      };
      if (rating.trim()) {
        const n = parseInt(rating, 10);
        if (n >= 1 && n <= 5) body.rating = n;
      }
      await updateInterviewAction(interview.id, body);
      onSuccess();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update interview</DialogTitle>
          <DialogDescription>
            Round {interview?.round} — add feedback and rating (1–5).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Rating (1–5)</Label>
            <Select value={rating || "_none"} onValueChange={(v) => setRating(v === "_none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Feedback</Label>
            <Textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
