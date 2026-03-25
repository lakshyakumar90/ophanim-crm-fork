"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acknowledgePerformanceReview,
  fetchMyPerformanceReviews,
  submitSelfAssessment,
} from "@/lib/performance-api";
import type { PerformanceReviewRow, ReviewGoal } from "@/types/performance";
import { StatusTracker } from "@/components/performance/StatusTracker";
import { RatingDisplay } from "@/components/performance/RatingDisplay";
import { PeerFeedbackRadar } from "@/components/performance/PeerFeedbackRadar";
import { PIPNotification } from "@/components/performance/PIPNotification";
import {
  canSeeCalibratedRating,
  goalsWeightTotal,
  ratingLabel,
} from "@/lib/performanceHelpers";
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
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyPerformanceReviewPage() {
  const [reviews, setReviews] = useState<PerformanceReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [achievements, setAchievements] = useState("");
  const [blockers, setBlockers] = useState("");
  const [stars, setStars] = useState(3);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyPerformanceReviews();
      setReviews(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const review = useMemo(() => {
    const active = reviews.find((r) => r.cycle?.status === "active");
    return active || reviews[0] || null;
  }, [reviews]);

  const goals = (review?.goals || []) as ReviewGoal[];
  const totalW = goalsWeightTotal(goals);

  const showResults = review?.status === "released";
  const showCal = review
    ? canSeeCalibratedRating({
        isEmployeeSubject: true,
        status: review.status,
        isHrOrManagerViewer: false,
      })
    : false;

  useEffect(() => {
    const sa = review?.self_assessment as Record<string, string> | undefined;
    if (sa) {
      setSummary(sa.summary || "");
      setAchievements(sa.achievements || "");
      setBlockers(sa.blockers || "");
    }
  }, [review?.id, review?.self_assessment]);

  const submit = async () => {
    if (!review || !summary.trim()) {
      toast.error("Summary is required");
      return;
    }
    setSaving(true);
    try {
      const goal_self_ratings =
        goals.length > 0
          ? goals.map((_, i) => ({
              goal_index: i,
              self_rating: stars,
              comment: undefined as string | undefined,
            }))
          : undefined;
      await submitSelfAssessment(review.id, {
        summary: `[Self rating: ${stars}/5]\n\n${summary.trim()}`,
        achievements: achievements.trim() || undefined,
        blockers: blockers.trim() || undefined,
        goal_self_ratings,
      });
      toast.success("Self-assessment submitted");
      setSubmitOpen(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  };

  const acknowledge = async () => {
    if (!review) return;
    setAcknowledging(true);
    try {
      await acknowledgePerformanceReview(review.id);
      toast.success("Acknowledged successfully");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Acknowledgment failed");
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading your review…
      </div>
    );
  }

  if (!review) {
    return (
      <Card className="max-w-lg mx-auto mt-10">
        <CardHeader>
          <CardTitle>No active review</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You are not enrolled in a performance cycle yet. When HR starts a cycle that includes you,
          your review will appear here.
        </CardContent>
      </Card>
    );
  }

  const mgr = review.manager_review as Record<string, unknown> | undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My performance review</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {review.cycle?.name || "Review cycle"}
        </p>
      </div>

      <StatusTracker
        status={review.status}
        hasGoals={goals.length > 0}
        peerFeedback={review.peer_feedback}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {goals.length === 0 ? (
            <p className="text-muted-foreground">
              Your manager has not set goals yet. Check back after they publish them.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Total weight: {totalW}%</p>
              <ul className="space-y-2">
                {goals.map((g, i) => (
                  <li key={i} className="rounded-lg border p-3">
                    <div className="flex justify-between font-medium">
                      <span>{g.title}</span>
                      <span className="text-muted-foreground">{g.weight ?? 0}%</span>
                    </div>
                    {g.target ? <p className="text-xs mt-1 text-muted-foreground">{g.target}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {review.status === "draft" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Self-assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Summary (required)</Label>
              <Textarea
                className="min-h-25 mt-1"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="How did this period go overall?"
              />
            </div>
            <div>
              <Label>Key achievements</Label>
              <Textarea
                className="min-h-20 mt-1"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
              />
            </div>
            <div>
              <Label>Challenges / blockers</Label>
              <Textarea
                className="min-h-20 mt-1"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Overall self-rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    className={cn(
                      "p-1 rounded-md border transition-colors",
                      stars >= n ? "text-amber-500 border-amber-300 bg-amber-50" : "text-muted-foreground",
                    )}
                  >
                    <Star className={cn("h-6 w-6", stars >= n && "fill-current")} />
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setSubmitOpen(true)} disabled={saving || !summary.trim()}>
              Submit self-assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submitted self-assessment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3 whitespace-pre-wrap">
            {(review.self_assessment as { submitted_at?: string })?.submitted_at ? (
              <p className="text-xs text-muted-foreground">
                Submitted{" "}
                {new Date(
                  (review.self_assessment as { submitted_at: string }).submitted_at,
                ).toLocaleString()}
              </p>
            ) : null}
            <div>{String((review.self_assessment as { summary?: string })?.summary || "—")}</div>
          </CardContent>
        </Card>
      )}

      {showResults && showCal && review.calibrated_rating ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Calibrated rating</p>
              <RatingDisplay rating={review.calibrated_rating} size="lg" />
              <p className="text-sm text-muted-foreground mt-1">
                {ratingLabel(String(review.calibrated_rating))}
              </p>
            </div>
            {mgr?.comments ? (
              <div>
                <p className="font-medium text-sm">Manager feedback</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                  {String(mgr.comments)}
                </p>
              </div>
            ) : null}
            {review.pip_triggered ? <PIPNotification /> : null}
            <div className="rounded-md border p-3 bg-muted/20">
              {review.acknowledged_at ? (
                <p className="text-sm text-muted-foreground">
                  Acknowledged on {new Date(review.acknowledged_at).toLocaleString()}.
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Confirm you have reviewed this report.
                  </p>
                  <Button disabled={acknowledging} onClick={() => void acknowledge()}>
                    {acknowledging ? "Acknowledging…" : "Acknowledge report"}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-sm mb-2">Peer perspectives (aggregated)</p>
              <PeerFeedbackRadar peerFeedback={review.peer_feedback} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit self-assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              After submitting, you cannot edit your self-assessment. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Back</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void submit()}>
              {saving ? "Submitting…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
