"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuth } from "@/providers/auth-provider";
import { useAnyPermission, usePermission } from "@/hooks/auth/usePermission";
import { useCycleDetail } from "@/hooks/hr/usePerformance";
import {
  canSeeCalibratedRating,
  deadlineUrgency,
  reviewStatusBadgeClass,
  reviewStatusLabel,
} from "@/lib/performanceHelpers";
import {
  approveCycleResults,
  updatePerformanceCycle,
  releaseCycleResults,
} from "@/lib/performance-api";
import type { PerformanceReviewRow, ReviewStatus } from "@/types/performance";
import { ReviewDetailPanel } from "@/components/hr/performance/ReviewDetailPanel";
import { CalibrationModal } from "@/components/hr/performance/CalibrationModal";
import { ReleaseConfirmDialog } from "@/components/hr/performance/ReleaseConfirmDialog";
import { CyclePerformanceAnalytics } from "@/components/hr/performance/PerformanceAnalytics";
import { RatingDisplay } from "@/components/hr/performance/RatingDisplay";
import { toast } from "sonner";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

function PerformanceCycleDetailBody({
  cycleId,
  onUpdated,
}: {
  cycleId: string;
  onUpdated?: () => void;
}) {
  const id = cycleId;
  const { user } = useAuth();
  const canManage = usePermission("performance:manage");
  const hrPriv = useAnyPermission(["performance:view", "performance:manage"]);

  const { cycle, reviews, loading, error, refresh } = useCycleDetail(id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mgrFilter, setMgrFilter] = useState<string>("all");
  const [panelId, setPanelId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const openPanel = (rid: string) => {
    setPanelId(rid);
    setPanelOpen(true);
  };

  const managers = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of reviews) {
      const mid = r.manager_id || "";
      if (mid && r.manager?.full_name) m.set(mid, r.manager.full_name);
    }
    return Array.from(m.entries());
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      const name = (r.employee?.full_name || "").toLowerCase();
      const okName = !q || name.includes(q);
      const okStatus = statusFilter === "all" || r.status === statusFilter;
      const okMgr = mgrFilter === "all" || r.manager_id === mgrFilter;
      return okName && okStatus && okMgr;
    });
  }, [reviews, search, statusFilter, mgrFilter]);

  const stats = useMemo(() => {
    const n = reviews.length;
    const goals = reviews.filter((r) => (r.goals?.length || 0) > 0).length;
    const self = reviews.filter((r) => r.status !== "draft").length;
    const mgr = reviews.filter((r) =>
      ["manager_submitted", "calibrated", "director_approved", "released"].includes(r.status),
    ).length;
    const peer = reviews.filter((r) =>
      (r.peer_feedback || []).some((p) => (p.response_count ?? 0) > 0),
    ).length;
    const cal = reviews.filter(
      (r) => r.status === "calibrated" || r.status === "director_approved" || r.status === "released",
    ).length;
    const rel = reviews.filter((r) => r.status === "released").length;
    return { n, goals, self, mgr, peer, cal, rel };
  }, [reviews]);

  const toCalibrate = useMemo(
    () => reviews.filter((r) => r.status === "manager_submitted"),
    [reviews],
  );

  const calibratedReady = useMemo(
    () => reviews.filter((r) => r.status === "calibrated").length,
    [reviews],
  );

  const directorApprovedReady = useMemo(
    () => reviews.filter((r) => r.status === "director_approved").length,
    [reviews],
  );

  const confirmActivate = async () => {
    setBusy(true);
    try {
      await updatePerformanceCycle(id, { status: "active" });
      toast.success("Cycle activated");
      setActivateOpen(false);
      await refresh();
      onUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmDeactivate = async () => {
    setBusy(true);
    try {
      await updatePerformanceCycle(id, { status: "draft" });
      toast.success("Cycle moved back to draft");
      setDeactivateOpen(false);
      await refresh();
      onUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to move cycle to draft");
    } finally {
      setBusy(false);
    }
  };

  const onApprove = async () => {
    setBusy(true);
    try {
      const r = await approveCycleResults(id);
      toast.success(`Final approval recorded for ${r.approved} review(s).`);
      setApproveOpen(false);
      await refresh();
      onUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const onRelease = async () => {
    setBusy(true);
    try {
      const r = await releaseCycleResults(id);
      toast.success(`Results released. ${r.released} employees notified.`);
      setReleaseOpen(false);
      await refresh();
      onUpdated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Release failed");
    } finally {
      setBusy(false);
    }
  };

  const uid = user?.id ?? "";

  const rowCalVisible = useCallback(
    (r: PerformanceReviewRow) =>
      canSeeCalibratedRating({
        isEmployeeSubject: r.employee_id === uid,
        status: r.status,
        isHrOrManagerViewer: hrPriv || r.manager_id === uid,
      }),
    [uid, hrPriv],
  );

  /* Column always shown; cell content gated by rowCalVisible (manager sees own reports, HR sees all). */
  const showCalCol = true;

  if (loading && !cycle) {
    return (
      <div className="flex justify-center items-center p-16 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading cycle…
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="p-8 text-center text-destructive">
        {error || "Cycle not found"}
      </div>
    );
  }

  const completed = cycle.status === "completed";
  const selfU = deadlineUrgency(cycle.self_assessment_deadline ?? null, completed);
  const mgrU = deadlineUrgency(cycle.manager_review_deadline ?? null, completed);

  return (
    <div className="flex flex-col min-h-0 w-full">
      <div className="border-b bg-card p-4 sm:p-6 shrink-0 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{cycle.name}</h1>
                <Badge
                  variant={cycle.status === "active" ? "default" : "secondary"}
                  className={cycle.status === "active" ? "bg-blue-600" : ""}
                >
                  {cycle.status}
                </Badge>
                <Badge variant="outline">{cycle.frequency || "—"}</Badge>
                <Badge variant="outline" className="capitalize">
                  {cycle.scope}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span>
                  Self-assessment:{" "}
                  {cycle.self_assessment_deadline
                    ? format(new Date(cycle.self_assessment_deadline), "MMM d, yyyy")
                    : "—"}
                  {selfU === "soon" ? (
                    <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-950">Due soon</Badge>
                  ) : null}
                  {selfU === "overdue" && !completed ? (
                    <Badge variant="destructive" className="ml-1 text-[10px]">
                      Overdue
                    </Badge>
                  ) : null}
                </span>
                <span>
                  Manager review:{" "}
                  {cycle.manager_review_deadline
                    ? format(new Date(cycle.manager_review_deadline), "MMM d, yyyy")
                    : "—"}
                  {mgrU === "soon" ? (
                    <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-950">Due soon</Badge>
                  ) : null}
                </span>
              </div>
            </div>
          <div className="flex flex-wrap gap-2">
            {canManage && cycle.status === "draft" ? (
              <Button onClick={() => setActivateOpen(true)} disabled={busy}>
                Activate cycle
              </Button>
            ) : null}
            {canManage && cycle.status === "active" ? (
              <>
                <Button variant="outline" disabled={busy} onClick={() => setDeactivateOpen(true)}>
                  Move to draft
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  disabled={busy || toCalibrate.length === 0}
                  onClick={() => setCalOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Calibrate
                  {toCalibrate.length ? (
                    <Badge variant="outline" className="ml-1">
                      {toCalibrate.length}
                    </Badge>
                  ) : null}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || calibratedReady === 0}
                  onClick={() => setApproveOpen(true)}
                >
                  Final approval
                </Button>
                <Button
                  disabled={busy || directorApprovedReady === 0}
                  onClick={() => setReleaseOpen(true)}
                >
                  Release results
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {toCalibrate.length > 0 && canManage && cycle.status === "active" ? (
          <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-md px-3 py-2">
            {toCalibrate.length} review(s) still awaiting manager submission before everyone can be
            calibrated.
          </p>
        ) : null}
        {completed ? (
          <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
            This cycle is completed. Reviews are read-only for historical reference.
          </p>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-sm">
          {[
            ["Participants", stats.n],
            ["Goals set", stats.goals],
            ["Self done", stats.self],
            ["Manager done", stats.mgr],
            ["Peer activity", stats.peer],
            ["Released", stats.rel],
          ].map(([label, val]) => (
            <div key={label} className="rounded-lg border bg-background/50 p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-lg font-semibold">{val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-auto">
        {hrPriv || canManage ? (
          <div>
            <h2 className="text-lg font-semibold mb-3">Cycle analytics</h2>
            <CyclePerformanceAnalytics cycleId={id} />
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <Input
            placeholder="Search employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(
                [
                  "draft",
                  "self_submitted",
                  "manager_submitted",
                  "calibrated",
                  "director_approved",
                  "released",
                ] as ReviewStatus[]
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {reviewStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mgrFilter} onValueChange={setMgrFilter}>
            <SelectTrigger className="w-50">
              <SelectValue placeholder="Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All managers</SelectItem>
              {managers.map(([mid, name]) => (
                <SelectItem key={mid} value={mid}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Dept / role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Self</TableHead>
                <TableHead>Mgr score</TableHead>
                {showCalCol ? <TableHead>Calibrated</TableHead> : null}
                <TableHead>PIP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    No reviews match filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const mr = r.manager_review as { weighted_score?: number } | undefined;
                  const sa = r.self_assessment as { goal_self_ratings?: unknown[] } | undefined;
                  const selfHint =
                    sa?.goal_self_ratings && sa.goal_self_ratings.length > 0 ? "✓" : r.status === "draft" ? "—" : "✓";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.employee?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.employee?.job_title || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.manager?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={reviewStatusBadgeClass(r.status)}>
                          {reviewStatusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{selfHint}</TableCell>
                      <TableCell>
                        {mr?.weighted_score != null ? mr.weighted_score.toFixed(2) : "—"}
                      </TableCell>
                      {showCalCol ? (
                        <TableCell>
                          {rowCalVisible(r) ? (
                            <RatingDisplay rating={r.calibrated_rating} size="sm" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {r.pip_triggered ? (
                          <Badge className="bg-amber-100 text-amber-950 border-amber-200 text-[10px]">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openPanel(r.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ReviewDetailPanel
        reviewId={panelId}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onRefresh={() => void refresh()}
      />

      <CalibrationModal
        open={calOpen}
        onOpenChange={setCalOpen}
        cycleId={id}
        reviews={toCalibrate}
        onSaved={() => void refresh()}
      />

      <ReleaseConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        count={calibratedReady}
        title="Final approve calibrated results?"
        description="Approving locks calibrated outcomes and marks them ready for employee release."
        confirmText="Approve results"
        confirmKeyword="APPROVE"
        onConfirm={onApprove}
      />

      <ReleaseConfirmDialog
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        count={directorApprovedReady}
        onConfirm={onRelease}
      />

      <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will enroll everyone in scope, create their review records, and notify them to start
              self-assessments. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void confirmActivate()}>
              {busy ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move cycle back to draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates the cycle and resets generated review rows. You can reactivate later.
              This is only allowed before any self/manager submissions start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void confirmDeactivate()}>
              {busy ? "Updating…" : "Move to draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PerformanceCycleDetailSheet({
  cycleId,
  open,
  onOpenChange,
  onUpdated,
}: {
  cycleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Review cycle"
      size="3xl"
      className="sm:w-[min(100%,56rem)]"
    >
      {cycleId && open ? (
        <PerformanceCycleDetailBody cycleId={cycleId} onUpdated={onUpdated} />
      ) : null}
    </FormSideSheet>
  );
}
