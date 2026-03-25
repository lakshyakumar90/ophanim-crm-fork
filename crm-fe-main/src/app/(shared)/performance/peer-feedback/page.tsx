"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchPeerFeedbackTargets,
  submitPeerFeedbackDimension,
  fetchPerformanceCycle,
} from "@/lib/performance-api";
import type { PeerDimension, PeerFeedbackTarget } from "@/types/performance";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const DIMENSIONS: { key: PeerDimension; label: string }[] = [
  { key: "collaboration", label: "Collaboration" },
  { key: "communication", label: "Communication" },
  { key: "delivery", label: "Delivery" },
  { key: "reliability", label: "Reliability" },
];

export default function PeerFeedbackPage() {
  const [targets, setTargets] = useState<PeerFeedbackTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineLabel, setDeadlineLabel] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<PeerFeedbackTarget | null>(null);
  const [scores, setScores] = useState<Record<PeerDimension, number>>({
    collaboration: 3,
    communication: 3,
    delivery: 3,
    reliability: 3,
  });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPeerFeedbackTargets();
      setTargets(list);
      const firstCycle = list[0]?.cycle_id;
      if (firstCycle) {
        try {
          const c = await fetchPerformanceCycle(firstCycle);
          if (c.mid_checkin_date) {
            setDeadlineLabel(format(new Date(c.mid_checkin_date), "MMM d, yyyy"));
          } else if (c.self_assessment_deadline) {
            setDeadlineLabel(format(new Date(c.self_assessment_deadline), "MMM d, yyyy"));
          } else {
            setDeadlineLabel(null);
          }
        } catch {
          setDeadlineLabel(null);
        }
      } else {
        setDeadlineLabel(null);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load colleagues");
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (t: PeerFeedbackTarget) => {
    setOpenFor(t);
    setScores({
      collaboration: 3,
      communication: 3,
      delivery: 3,
      reliability: 3,
    });
    setComment("");
  };

  const submitAllDimensions = async () => {
    if (!openFor) return;
    setSaving(true);
    try {
      for (let i = 0; i < DIMENSIONS.length; i++) {
        const { key } = DIMENSIONS[i]!;
        await submitPeerFeedbackDimension(openFor.id, {
          dimension: key,
          score: scores[key],
          comment: i === 0 && comment.trim() ? comment.trim() : undefined,
        });
      }
      toast.success(`Feedback saved for ${openFor.employee?.full_name || "colleague"}`);
      setDoneIds((prev) => new Set(prev).add(openFor.id));
      setOpenFor(null);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading…
      </div>
    );
  }

  const remaining = targets.filter((t) => !doneIds.has(t.id)).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Peer feedback</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rate colleagues in your active review cycle. Scores are aggregated anonymously.
        </p>
      </div>

      {deadlineLabel ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm text-blue-950 dark:text-blue-100">
          Peer feedback checkpoint around <strong>{deadlineLabel}</strong>.{" "}
          {remaining > 0 ? (
            <span>
              {remaining} colleague{remaining === 1 ? "" : "s"} left to rate.
            </span>
          ) : (
            <span>You are caught up for now.</span>
          )}
        </div>
      ) : null}

      {targets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No colleagues available for peer feedback right now (you may need an active cycle).
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {targets.map((t) => {
            const done = doneIds.has(t.id);
            return (
              <Card key={t.id} className={done ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div>
                    <CardTitle className="text-base">
                      {t.employee?.full_name || "Colleague"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t.employee?.job_title || "—"}
                    </p>
                  </div>
                  {done ? (
                    <span className="text-xs text-muted-foreground">Feedback submitted</span>
                  ) : (
                    <Button size="sm" onClick={() => openForm(t)}>
                      Give feedback
                    </Button>
                  )}
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!openFor} onOpenChange={(o) => !o && setOpenFor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback for {openFor?.employee?.full_name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Your feedback is anonymous. Only aggregated averages are shown to the employee.
          </p>
          <div className="space-y-5 py-2">
            {DIMENSIONS.map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-2">
                  <Label>{label}</Label>
                  <span className="text-muted-foreground">{scores[key]}</span>
                </div>
                <Input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  className="w-full accent-primary"
                  value={scores[key]}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [key]: Number(e.target.value) || 3 }))
                  }
                />
              </div>
            ))}
            <div>
              <Label>Comment (optional, stored with your last dimension save)</Label>
              <Textarea
                className="mt-1 min-h-[72px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional constructive note…"
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void submitAllDimensions()}>
              {saving ? "Submitting…" : "Submit feedback"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
