"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { submitManagerReview } from "@/lib/performance-api";
import type { OverallRating, ReviewGoal } from "@/types/performance";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RATINGS: OverallRating[] = [
  "unsatisfactory",
  "below",
  "meets",
  "exceeds",
  "exceptional",
];

export function ManagerReviewModal({
  open,
  onOpenChange,
  reviewId,
  goals,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewId: string;
  goals: ReviewGoal[];
  onSaved: () => void;
}) {
  const [overall, setOverall] = useState<OverallRating>("meets");
  const [comments, setComments] = useState("");
  const [scores, setScores] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setScores(goals.map(() => 3));
      setComments("");
      setOverall("meets");
    }
  }, [open, goals]);

  const weighted = useMemo(() => {
    if (!goals.length || scores.length !== goals.length) return 0;
    return goals.reduce((sum, g, i) => {
      const w = Number(g.weight || 0);
      const s = scores[i] ?? 0;
      return sum + (s * w) / 100;
    }, 0);
  }, [goals, scores]);

  const doSubmit = async () => {
    if (!comments.trim()) {
      toast.error("Comments are required");
      return;
    }
    setSaving(true);
    try {
      await submitManagerReview(reviewId, {
        overall_rating: overall,
        comments: comments.trim(),
        goal_manager_ratings: goals.map((_, i) => ({
          goal_index: i,
          manager_rating: scores[i] ?? 3,
        })),
      });
      toast.success("Manager review submitted");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manager review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Overall rating</Label>
              <Select value={overall} onValueChange={(v) => setOverall(v as OverallRating)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comments (required)</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Summary of performance…"
              />
            </div>
            {goals.length > 0 ? (
              <div className="space-y-2">
                <Label>Goal scores (1–5)</Label>
                {goals.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm flex-1 truncate" title={g.title}>
                      {g.title}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      className="w-20"
                      value={scores[i] ?? 3}
                      onChange={(e) => {
                        const next = [...scores];
                        next[i] = Math.min(5, Math.max(1, Number(e.target.value) || 1));
                        setScores(next);
                      }}
                    />
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">
                  Weighted score preview: {weighted.toFixed(2)} (1–5 scale × goal weights)
                </p>
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => setConfirmOpen(true)}
            >
              Submit manager review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit manager review?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, your review goes to calibration and cannot be edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doSubmit()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
