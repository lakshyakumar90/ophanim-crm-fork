"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useJobPosting, updateJobPostingAction } from "@/hooks/useRecruitment";
import { useCandidatesForJob } from "@/hooks/useCandidates";
import type { Candidate } from "@/types/recruitment";
import { CandidateKanbanBoard } from "@/components/recruitment/CandidateKanbanBoard";
import { CandidateDetailPanel } from "@/components/recruitment/CandidateDetailPanel";
import { AddCandidateModal } from "@/components/recruitment/AddCandidateModal";
import { MoveStageModal } from "@/components/recruitment/MoveStageModal";
import { ScheduleInterviewModal } from "@/components/recruitment/ScheduleInterviewModal";
import { EditJobPostingModal } from "@/components/recruitment/EditJobPostingModal";
import { usePermission } from "@/hooks/use-permission";
import { api } from "@/lib/api";
import { isDeadlineExpired, formatRecruitmentDate } from "@/lib/recruitment-format";
export default function JobPostingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const canManage = usePermission("recruitment:manage");

  const { posting, loading: postingLoading, error: postingError, refresh: refreshPosting } =
    useJobPosting(id);
  const {
    data: candidates,
    loading: candLoading,
    error: candError,
    refresh: refreshCandidates,
  } = useCandidatesForJob(id);

  const [employees, setEmployees] = useState<
    { id: string; fullName: string; email: string }[]
  >([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [moveCandidate, setMoveCandidate] = useState<Candidate | null>(null);
  const [schedCandidate, setSchedCandidate] = useState<Candidate | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get("/hr/employees");
      const rows = res.data?.data || [];
      setEmployees(
        (Array.isArray(rows) ? rows : []).map((e: any) => ({
          id: e.id,
          fullName: e.fullName || e.full_name || "Unknown",
          email: e.email || "",
        })),
      );
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    (async () => {
      try {
        const res = await api.get("/departments");
        const rows = res.data?.data || [];
        setDepartments(Array.isArray(rows) ? rows : []);
      } catch {
        setDepartments([]);
      }
    })();
  }, [loadEmployees]);

  const userNameById = useMemo(() => {
    const m: Record<string, string> = {};
    employees.forEach((e) => {
      m[e.id] = e.fullName;
    });
    return m;
  }, [employees]);

  const refreshAll = useCallback(() => {
    refreshPosting();
    refreshCandidates();
  }, [refreshPosting, refreshCandidates]);

  const deadlineExpired = posting ? isDeadlineExpired(posting.application_deadline) : false;

  const setNextStatus = async (status: "open" | "paused" | "closed") => {
    if (!posting || !canManage) return;
    setStatusLoading(true);
    try {
      await updateJobPostingAction(posting.id, { status });
      refreshPosting();
    } catch {
      /* toast in action */
    } finally {
      setStatusLoading(false);
    }
  };

  if (postingLoading && !posting) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-96 w-[300px] shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (postingError || !posting) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-destructive gap-4">
        <p>{postingError || "Job posting not found"}</p>
        <Button variant="outline" onClick={() => router.push("/hr/recruitment")}>
          Back to recruitment
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="border-b bg-background px-4 sm:px-6 py-4 space-y-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push("/hr/recruitment")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{posting.title}</h1>
                <StatusBadge status={posting.status} />
                {deadlineExpired && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expired
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {posting.department || "No department"} · {posting.positions_open} positions
                open
                {posting.application_deadline
                  ? ` · Deadline ${formatRecruitmentDate(posting.application_deadline)}`
                  : ""}
              </p>
              {posting.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap max-w-3xl">
                  {posting.description}
                </p>
              )}
              {posting.required_skills && posting.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {posting.required_skills.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canManage && (
              <>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                {posting.status === "open" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={statusLoading}
                    onClick={() => setNextStatus("paused")}
                  >
                    Pause
                  </Button>
                )}
                {posting.status === "paused" && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600"
                    disabled={statusLoading}
                    onClick={() => setNextStatus("open")}
                  >
                    Reopen
                  </Button>
                )}
                {posting.status !== "closed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusLoading}
                    onClick={() => setNextStatus("closed")}
                  >
                    Close posting
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {deadlineExpired && canManage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Application deadline has passed. Consider pausing or closing before adding new
            candidates.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Candidate pipeline</h2>
          {candError && (
            <p className="text-xs text-destructive">{candError}</p>
          )}
        </div>
        {canManage && (
          <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add candidate
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 py-4 overflow-y-auto">
        {candLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CandidateKanbanBoard
            candidates={candidates}
            canManage={canManage}
            onViewCandidate={(c) => setDetailId(c.id)}
            onMoveStage={(c) => setMoveCandidate(c)}
            onScheduleInterview={(c) => setSchedCandidate(c)}
            onRefresh={refreshAll}
          />
        )}
      </div>

      <AddCandidateModal
        open={addOpen}
        onOpenChange={setAddOpen}
        jobPostingId={id}
        onSuccess={refreshAll}
      />
      <EditJobPostingModal
        open={editOpen}
        onOpenChange={setEditOpen}
        posting={posting}
        departments={departments}
        onSuccess={refreshPosting}
      />
      <CandidateDetailPanel
        open={Boolean(detailId)}
        onOpenChange={(v) => !v && setDetailId(null)}
        candidateId={detailId}
        userNameById={userNameById}
        employees={employees}
        jobTitle={posting.title}
        canManage={canManage}
        onUpdated={refreshAll}
      />
      <MoveStageModal
        open={Boolean(moveCandidate)}
        onOpenChange={(v) => !v && setMoveCandidate(null)}
        candidate={moveCandidate}
        onSuccess={refreshAll}
      />
      <ScheduleInterviewModal
        open={Boolean(schedCandidate)}
        onOpenChange={(v) => !v && setSchedCandidate(null)}
        candidate={schedCandidate}
        employees={employees}
        onSuccess={refreshAll}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "open")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Open</Badge>;
  if (status === "paused")
    return (
      <Badge className="bg-amber-500 hover:bg-amber-500 text-amber-950">Paused</Badge>
    );
  return <Badge variant="destructive">Closed</Badge>;
}
