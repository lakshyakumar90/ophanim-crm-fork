"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { CreatePerformanceCycleSheet } from "@/components/hr/performance/CreatePerformanceCycleSheet";
import { PerformanceCycleDetailSheet } from "@/components/hr/performance/PerformanceCycleDetailSheet";
import { useSheetQuery } from "@/hooks/use-sheet-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermission } from "@/hooks/auth/usePermission";
import {
  deletePerformanceCycle,
  fetchPerformanceAnalytics,
  updatePerformanceCycle,
} from "@/lib/performance-api";
import type { ReviewCycleRow } from "@/types/performance";
import { useReviewCycles } from "@/hooks/hr/usePerformance";
import { ReviewCycleCard } from "@/components/hr/performance/ReviewCycleCard";
import { HRPerformanceDashboardWidgets } from "@/components/hr/performance/PerformanceAnalytics";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function PerformanceCyclesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sheet = useSheetQuery();
  const editId = sheet.createOpen ? searchParams.get("edit") : null;
  const canManage = usePermission("performance:manage");
  const { load, loading, error } = useReviewCycles();

  const [cycles, setCycles] = useState<ReviewCycleRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [freqFilter, setFreqFilter] = useState<string>("all");
  const [selfPctByCycle, setSelfPctByCycle] = useState<Record<string, number>>({});
  const [activateId, setActivateId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    const data = await load(
      statusFilter === "all"
        ? undefined
        : { status: statusFilter as "draft" | "active" | "completed" },
    );
    setCycles(data);
  }, [load, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const actives = cycles.filter((c) => c.status === "active").slice(0, 12);
    if (actives.length === 0) {
      setSelfPctByCycle({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        actives.map(async (c) => {
          try {
            const a = await fetchPerformanceAnalytics(c.id);
            const total = a.totalReviews || 0;
            const draft = a.statusDistribution?.draft ?? 0;
            const pct = total > 0 ? Math.round(((total - draft) / total) * 100) : 0;
            return [c.id, pct] as const;
          } catch {
            return [c.id, undefined] as const;
          }
        }),
      );
      if (cancelled) return;
      const m: Record<string, number> = {};
      for (const [id, pct] of entries) {
        if (pct !== undefined) m[id] = pct;
      }
      setSelfPctByCycle(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [cycles]);

  const filtered = useMemo(() => {
    return cycles.filter((c) => {
      const q = search.trim().toLowerCase();
      const nameOk = !q || c.name.toLowerCase().includes(q);
      const freqOk =
        freqFilter === "all" || (c.frequency || "").toLowerCase() === freqFilter.toLowerCase();
      return nameOk && freqOk;
    });
  }, [cycles, search, freqFilter]);

  const kpis = useMemo(() => {
    const active = cycles.filter((c) => c.status === "active");
    return {
      activeCount: active.length,
      pendingCalibration: active.length,
    };
  }, [cycles]);

  const confirmActivate = async () => {
    if (!activateId) return;
    setActivating(true);
    try {
      await updatePerformanceCycle(activateId, { status: "active" });
      toast.success("Cycle activated. Participants have been notified.");
      setActivateId(null);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deletePerformanceCycle(deleteId);
      toast.success("Review cycle deleted.");
      setDeleteId(null);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance reviews</h1>
          <p className="text-muted-foreground mt-1">
            Review cycles, calibration, and team progress.
          </p>
        </div>
        {canManage ? (
          <Button onClick={sheet.openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create review cycle
          </Button>
        ) : null}
      </div>

      <HRPerformanceDashboardWidgets />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active cycles</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active cycles (summary)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Open a cycle to see participant counts and calibration readiness.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cycles in flight
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kpis.pendingCalibration}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">PIP / calibration</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use cycle analytics and the calibration board for PIP totals.
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-card p-4 rounded-lg border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by cycle name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={freqFilter} onValueChange={setFreqFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frequencies</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="half_yearly">Half-yearly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading cycles…
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-8">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No cycles match your filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ReviewCycleCard
              key={c.id}
              cycle={c}
              selfDonePct={selfPctByCycle[c.id]}
              canManage={canManage}
              onView={() => sheet.openDetail(c.id)}
              onActivate={canManage ? () => setActivateId(c.id) : undefined}
              onEdit={
                canManage
                  ? () => router.replace(`/hr/performance?create=1&edit=${c.id}`)
                  : undefined
              }
              onDelete={canManage ? () => setDeleteId(c.id) : undefined}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!activateId} onOpenChange={(o) => !o && setActivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Activating will create review records for everyone in scope and notify them to begin
              their self-assessments. Deadline reminders are sent from the platform. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={activating} onClick={() => void confirmActivate()}>
              {activating ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the draft cycle. Only draft cycles can be deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? "Deleting…" : "Delete cycle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canManage ? (
        <CreatePerformanceCycleSheet
          open={sheet.createOpen}
          onOpenChange={(open) => {
            if (open) sheet.openCreate();
            else {
              sheet.closeCreate();
              if (searchParams.get("edit")) {
                router.replace("/hr/performance");
              }
            }
          }}
          editId={editId}
          onCreated={(cycleId) => {
            sheet.closeCreate();
            router.replace("/hr/performance");
            sheet.openDetail(cycleId);
            void refresh();
          }}
        />
      ) : null}

      <PerformanceCycleDetailSheet
        cycleId={sheet.selectedId}
        open={Boolean(sheet.selectedId)}
        onOpenChange={(open) => !open && sheet.closeDetail()}
        onUpdated={() => void refresh()}
      />
    </div>
  );
}

export default function PerformanceCyclesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <PerformanceCyclesPageContent />
    </Suspense>
  );
}
