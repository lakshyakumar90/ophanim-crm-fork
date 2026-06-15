"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useAnyPermission, usePermission } from "@/hooks/auth/usePermission";
import { usePerformanceReview } from "@/hooks/hr/usePerformance";
import {
  canSeeCalibratedRating,
  goalsWeightTotal,
  reviewStatusBadgeClass,
  reviewStatusLabel,
} from "@/lib/performanceHelpers";
import type { PerformanceReviewRow, ReviewGoal } from "@/types/performance";
import { GoalBuilderModal } from "./GoalBuilderModal";
import { ManagerReviewModal } from "./ManagerReviewModal";
import { PeerFeedbackRadar } from "./PeerFeedbackRadar";
import { RatingDisplay } from "./RatingDisplay";
import { PIPNotification } from "./PIPNotification";
import { Loader2 } from "lucide-react";

function SelfAssessmentView({ data }: { data: Record<string, unknown> | null | undefined }) {
  if (!data || typeof data !== "object") {
    return (
      <p className="text-sm text-muted-foreground">Employee has not submitted a self-assessment yet.</p>
    );
  }
  const submitted = data.submitted_at as string | undefined;
  return (
    <div className="space-y-3 text-sm">
      {submitted ? (
        <p className="text-xs text-muted-foreground">Submitted {new Date(submitted).toLocaleString()}</p>
      ) : null}
      {data.summary ? (
        <div>
          <p className="font-medium text-xs text-muted-foreground">Summary</p>
          <p className="whitespace-pre-wrap">{String(data.summary)}</p>
        </div>
      ) : null}
      {data.achievements ? (
        <div>
          <p className="font-medium text-xs text-muted-foreground">Achievements</p>
          <p className="whitespace-pre-wrap">{String(data.achievements)}</p>
        </div>
      ) : null}
      {data.blockers ? (
        <div>
          <p className="font-medium text-xs text-muted-foreground">Challenges / blockers</p>
          <p className="whitespace-pre-wrap">{String(data.blockers)}</p>
        </div>
      ) : null}
    </div>
  );
}

function ManagerReviewView({ data }: { data: Record<string, unknown> | null | undefined }) {
  if (!data || typeof data !== "object") {
    return <p className="text-sm text-muted-foreground">Manager review pending.</p>;
  }
  const submitted = data.submitted_at as string | undefined;
  return (
    <div className="space-y-3 text-sm">
      {submitted ? (
        <p className="text-xs text-muted-foreground">Submitted {new Date(submitted).toLocaleString()}</p>
      ) : null}
      {data.overall_rating ? (
        <div>
          <p className="font-medium text-xs text-muted-foreground">Overall rating</p>
          <RatingDisplay rating={String(data.overall_rating)} />
        </div>
      ) : null}
      {data.comments ? (
        <div>
          <p className="font-medium text-xs text-muted-foreground">Comments</p>
          <p className="whitespace-pre-wrap">{String(data.comments)}</p>
        </div>
      ) : null}
      {data.weighted_score != null ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Weighted score (goals): </span>
          <span className="font-medium">{Number(data.weighted_score).toFixed(2)}</span>
        </p>
      ) : null}
    </div>
  );
}

export function ReviewDetailPanel({
  reviewId,
  open,
  onOpenChange,
  onRefresh,
}: {
  reviewId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const hrPriv = useAnyPermission(["performance:view", "performance:manage"]);
  const canManage = usePermission("performance:manage");
  const { review, loading, load } = usePerformanceReview(reviewId);

  const [goalsOpen, setGoalsOpen] = useState(false);
  const [mgrOpen, setMgrOpen] = useState(false);

  useEffect(() => {
    if (open && reviewId) void load();
  }, [open, reviewId, load]);

  const uid = user?.id ?? "";
  const goals = (review?.goals || []) as ReviewGoal[];
  const totalW = goalsWeightTotal(goals);

  const isEmployeeSubject = review?.employee_id === uid;
  const isAssignedManager = review?.manager_id === uid;

  const showCalibrated = useMemo(() => {
    if (!review) return false;
    return canSeeCalibratedRating({
      isEmployeeSubject,
      status: review.status,
      isHrOrManagerViewer: hrPriv || isAssignedManager,
    });
  }, [review, isEmployeeSubject, isAssignedManager, hrPriv]);

  const peerAgg = review?.peer_feedback;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto px-4 sm:px-6">
          <SheetHeader>
            <SheetTitle className="pr-8">
              {review?.employee?.full_name || "Review"}
            </SheetTitle>
            {review ? (
              <div className="flex flex-wrap gap-2 items-center text-left">
                <Badge variant="outline" className={reviewStatusBadgeClass(review.status)}>
                  {reviewStatusLabel(review.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Manager: {review.manager?.full_name || "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Email: {review.employee?.email || "—"}
                </span>
              </div>
            ) : null}
          </SheetHeader>

          {loading || !review ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="goals" className="mt-6">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="self">Self</TabsTrigger>
                <TabsTrigger value="manager">Manager</TabsTrigger>
                <TabsTrigger value="peer">Peer</TabsTrigger>
                <TabsTrigger value="result">Result</TabsTrigger>
              </TabsList>

              <TabsContent value="goals" className="space-y-3 mt-4">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Total weight:{" "}
                    <span className={totalW === 100 ? "text-emerald-600 font-medium" : "text-destructive"}>
                      {totalW}%
                    </span>{" "}
                    / 100%
                  </p>
                  {((isAssignedManager || canManage) && review.status === "draft") ? (
                    <Button size="sm" onClick={() => setGoalsOpen(true)}>
                      {isAssignedManager ? "Set goals" : "Set goals (admin override)"}
                    </Button>
                  ) : null}
                </div>
                {goals.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No goals set yet.</p>
                    {canManage ? (
                      <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-md p-2">
                        As admin/HR manager, you can set goals here even if no manager is assigned yet.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {goals.map((g, i) => {
                      const mgr = review.manager_review as
                        | { goal_manager_ratings?: Array<{ goal_index: number; manager_rating: number }> }
                        | undefined;
                      const rating = mgr?.goal_manager_ratings?.find((x) => x.goal_index === i)?.manager_rating;
                      return (
                        <li key={i} className="rounded-lg border p-3 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="font-medium">{g.title}</span>
                            <Badge variant="secondary">{g.weight ?? 0}%</Badge>
                          </div>
                          {g.target ? (
                            <p className="text-xs text-muted-foreground mt-1">Target: {g.target}</p>
                          ) : null}
                          {g.kpi ? (
                            <p className="text-xs mt-1 whitespace-pre-wrap">{g.kpi}</p>
                          ) : null}
                          {rating != null ? (
                            <p className="text-xs mt-2">Manager score: {rating}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Weighted score uses Σ (goal score × weight ÷ 100) when manager submits ratings.
                </p>
              </TabsContent>

              <TabsContent value="self" className="mt-4">
                <SelfAssessmentView data={review.self_assessment as Record<string, unknown>} />
              </TabsContent>

              <TabsContent value="manager" className="mt-4 space-y-3">
                <ManagerReviewView data={review.manager_review as Record<string, unknown>} />
                {((isAssignedManager || canManage) && review.status === "self_submitted") ? (
                  <Button className="w-full" onClick={() => setMgrOpen(true)}>
                    {isAssignedManager
                      ? "Submit manager review"
                      : "Submit manager review (admin override)"}
                  </Button>
                ) : null}
              </TabsContent>

              <TabsContent value="peer" className="mt-4">
                <PeerFeedbackRadar peerFeedback={peerAgg} />
              </TabsContent>

              <TabsContent value="result" className="mt-4 space-y-4">
                {!showCalibrated ? (
                  <p className="text-sm text-muted-foreground">
                    Calibrated rating is visible here once calibration is complete (and released to the employee
                    when you are viewing your own record).
                  </p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Calibrated rating</p>
                      <RatingDisplay rating={review.calibrated_rating} size="lg" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">PIP</span>
                      {review.pip_triggered ? (
                        <Badge className="bg-amber-100 text-amber-950 border-amber-200">Yes</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-emerald-800 bg-emerald-50">
                          No
                        </Badge>
                      )}
                    </div>
                    {isEmployeeSubject && review.pip_triggered && review.status === "released" ? (
                      <PIPNotification />
                    ) : null}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {reviewId && review ? (
        <>
          <GoalBuilderModal
            open={goalsOpen}
            onOpenChange={setGoalsOpen}
            reviewId={reviewId}
            initialGoals={goals}
            onSaved={() => {
              void load();
              onRefresh();
            }}
          />
          <ManagerReviewModal
            open={mgrOpen}
            onOpenChange={setMgrOpen}
            reviewId={reviewId}
            goals={goals}
            onSaved={() => {
              void load();
              onRefresh();
            }}
          />
        </>
      ) : null}
    </>
  );
}
