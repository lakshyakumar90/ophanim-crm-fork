"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Pencil } from "lucide-react";
import type { Candidate, Interview } from "@/types/recruitment";
import { loadCandidateDetail } from "@/hooks/useCandidates";
import { loadInterviews } from "@/hooks/useInterviews";
import { StageHistoryTimeline } from "./StageHistoryTimeline";
import { MoveStageModal } from "./MoveStageModal";
import {
  ScheduleInterviewModal,
  type EmployeeOption,
} from "./ScheduleInterviewModal";
import { UpdateInterviewModal } from "./UpdateInterviewModal";
import { SendOfferModal } from "./SendOfferModal";
import { OfferResponseConfirm } from "./OfferResponseConfirm";
import { formatRecruitmentDate, formatRecruitmentDateTime } from "@/lib/recruitment-format";
import { averageInterviewRating } from "@/lib/recruitment-client";
import { PIPELINE_STAGES } from "@/types/recruitment";
import { toast } from "sonner";
import { getRecruitmentErrorMessage } from "@/lib/recruitment-client";

export function CandidateDetailPanel({
  open,
  onOpenChange,
  candidateId,
  userNameById,
  employees,
  jobTitle,
  canManage,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidateId: string | null;
  userNameById: Record<string, string>;
  employees: EmployeeOption[];
  jobTitle?: string;
  canManage: boolean;
  onUpdated: () => void;
}) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [editIv, setEditIv] = useState<Interview | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerRespOpen, setOfferRespOpen] = useState(false);
  const [offerResp, setOfferResp] = useState<"accepted" | "declined" | null>(null);

  const load = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const c = await loadCandidateDetail(candidateId);
      setCandidate(c);
      const iv = await loadInterviews(candidateId);
      setInterviews(iv);
    } catch (e) {
      toast.error(getRecruitmentErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (open && candidateId) load();
  }, [open, candidateId, load]);

  const avg = averageInterviewRating(interviews.length ? interviews : candidate?.interviews);
  const stageLabel =
    PIPELINE_STAGES.find((s) => s.id === candidate?.stage)?.label ||
    candidate?.stage;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto pl-5 pr-5 py-5 sm:pl-6  sm:pr-6">
          <SheetHeader className="px-0 pt-2">
            <SheetTitle className="pr-8 pl-0">
              {loading ? "Loading…" : candidate?.full_name || "Candidate"}
            </SheetTitle>
          </SheetHeader>
          {loading && !candidate ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : candidate ? (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="interviews">Interviews</TabsTrigger>
                <TabsTrigger value="offer">Offer</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <p>{candidate.email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p>{candidate.phone || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source</span>
                    <p className="capitalize">
                      {(candidate.source || "—").toString().replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Applied</span>
                    <p>{formatRecruitmentDateTime(candidate.applied_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Stage</span>
                    <Badge variant="secondary">{stageLabel}</Badge>
                  </div>
                </div>
                {canManage && candidate.stage !== "hired" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMoveOpen(true)}
                  >
                    Move stage
                  </Button>
                )}
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Stage history</h4>
                  <StageHistoryTimeline
                    entries={candidate.stage_history as any}
                    userNameById={userNameById}
                  />
                </div>
              </TabsContent>
              <TabsContent value="interviews" className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Avg rating:{" "}
                    <strong>{avg != null ? `${avg} / 5` : "—"}</strong>
                  </p>
                  {canManage && candidate.stage !== "hired" && (
                    <Button size="sm" onClick={() => setSchedOpen(true)}>
                      Schedule interview
                    </Button>
                  )}
                </div>
                <ul className="space-y-3">
                  {interviews.map((iv) => (
                    <li
                      key={iv.id}
                      className="rounded-md border p-3 text-sm space-y-1"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">Round {iv.round}</span>
                        <Badge variant="outline">{iv.status}</Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {iv.interviewer?.full_name || "Interviewer"} ·{" "}
                        {formatRecruitmentDateTime(iv.scheduled_at)}
                      </p>
                      <p className="text-xs capitalize">{iv.interview_type}</p>
                      {iv.rating != null && (
                        <p className="text-xs">Rating: {iv.rating}/5</p>
                      )}
                      {iv.feedback && (
                        <p className="text-xs border-l-2 pl-2">{iv.feedback}</p>
                      )}
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => setEditIv(iv)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </li>
                  ))}
                  {interviews.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No interviews scheduled.
                    </p>
                  )}
                </ul>
              </TabsContent>
              <TabsContent value="offer" className="mt-4 space-y-4">
                {!candidate.offer ? (
                  <>
                    {candidate.stage === "hired" ||
                    candidate.stage === "rejected" ? (
                      <p className="text-sm text-muted-foreground">
                        No offer for this candidate.
                      </p>
                    ) : (
                      canManage && (
                        <Button onClick={() => setOfferOpen(true)}>
                          Send offer
                        </Button>
                      )
                    )}
                  </>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      CTC:{" "}
                      <strong>
                        {typeof candidate.offer.ctc === "number"
                          ? candidate.offer.ctc.toLocaleString()
                          : candidate.offer.ctc}
                      </strong>
                    </div>
                    <div>
                      Joining:{" "}
                      {formatRecruitmentDate(candidate.offer.joining_date)}
                    </div>
                    <div>Designation: {candidate.offer.designation}</div>
                    <div>
                      Sent: {formatRecruitmentDateTime(candidate.offer.sent_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      Response:{" "}
                      <Badge
                        variant={
                          candidate.offer.response === "accepted"
                            ? "default"
                            : candidate.offer.response === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {candidate.offer.response}
                      </Badge>
                    </div>
                    {canManage &&
                      candidate.offer.response === "pending" &&
                      candidate.stage === "offer_sent" && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600"
                            onClick={() => {
                              setOfferResp("accepted");
                              setOfferRespOpen(true);
                            }}
                          >
                            Record acceptance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setOfferResp("declined");
                              setOfferRespOpen(true);
                            }}
                          >
                            Record decline
                          </Button>
                        </div>
                      )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </SheetContent>
      </Sheet>

      <MoveStageModal
        open={moveOpen}
        onOpenChange={setMoveOpen}
        candidate={candidate}
        onSuccess={() => {
          load();
          onUpdated();
        }}
      />
      <ScheduleInterviewModal
        open={schedOpen}
        onOpenChange={setSchedOpen}
        candidate={candidate}
        employees={employees}
        onSuccess={() => {
          load();
          onUpdated();
        }}
      />
      <UpdateInterviewModal
        open={Boolean(editIv)}
        onOpenChange={(v) => !v && setEditIv(null)}
        interview={editIv}
        onSuccess={() => {
          load();
          onUpdated();
        }}
      />
      <SendOfferModal
        open={offerOpen}
        onOpenChange={setOfferOpen}
        candidate={candidate}
        defaultDesignation={jobTitle}
        onSuccess={() => {
          load();
          onUpdated();
        }}
      />
      <OfferResponseConfirm
        open={offerRespOpen}
        onOpenChange={setOfferRespOpen}
        candidateId={candidate?.id ?? null}
        response={offerResp}
        onSuccess={() => {
          load();
          onUpdated();
        }}
      />
    </>
  );
}
