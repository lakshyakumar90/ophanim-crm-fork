"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  createPerformanceCycle,
  fetchPerformanceCycle,
  updatePerformanceCycle,
} from "@/lib/performance-api";
import { usersApi } from "@/lib/api";
import { usePermission } from "@/hooks/auth/usePermission";
import { cn } from "@/lib/utils";
import type { ReviewFrequency } from "@/types/performance";
import { FormSideSheet } from "@/components/ui/form-side-sheet";

const STEPS = ["Setup", "Deadlines", "Review"];

function toIsoEndOfDay(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T23:59:59`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function CreatePerformanceCycleFormBody({
  editId,
  onSuccess,
}: {
  editId?: string | null;
  onSuccess?: (cycleId: string) => void;
}) {
  const canManage = usePermission("performance:manage");

  const [step, setStep] = useState(0);
  const [loadingCycle, setLoadingCycle] = useState(!!editId);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"all" | "department">("all");
  const [departmentId, setDepartmentId] = useState("");
  const [frequency, setFrequency] = useState<ReviewFrequency>("annual");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [goalDeadline, setGoalDeadline] = useState("");
  const [peerDeadline, setPeerDeadline] = useState("");
  const [selfDeadline, setSelfDeadline] = useState("");
  const [managerDeadline, setManagerDeadline] = useState("");
  const [calibrationDeadline, setCalibrationDeadline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [estParticipants, setEstParticipants] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [setupErrors, setSetupErrors] = useState<string[]>([]);
  const [dateErrors, setDateErrors] = useState<string[]>([]);
  const [dateFieldErrors, setDateFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canManage) return;
  }, [canManage]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/departments");
        const raw = res.data?.data;
        const list = Array.isArray(raw) ? raw : [];
        setDepartments(
          list.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })),
        );
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const loadEdit = useCallback(async () => {
    if (!editId) return;
    setLoadingCycle(true);
    try {
      const c = await fetchPerformanceCycle(editId);
      setName(c.name || "");
      setScope((c.scope === "department" ? "department" : "all") as "all" | "department");
      setDepartmentId(c.department_id || "");
      setFrequency((c.frequency as ReviewFrequency) || "annual");
      const isoToDate = (iso: string | null | undefined) =>
        iso ? iso.slice(0, 10) : "";
      setGoalDeadline(isoToDate(c.goal_setting_deadline));
      setPeerDeadline(isoToDate(c.mid_checkin_date));
      setSelfDeadline(isoToDate(c.self_assessment_deadline));
      setManagerDeadline(isoToDate(c.manager_review_deadline));
      setCalibrationDeadline(isoToDate(c.calibration_deadline));
      setReleaseDate(isoToDate(c.results_release_date));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load cycle");
    } finally {
      setLoadingCycle(false);
    }
  }, [editId]);

  useEffect(() => {
    void loadEdit();
  }, [loadEdit]);

  const validateSetup = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Cycle name is required.");
    if (scope === "department" && !departmentId) errs.push("Select a department.");
    setSetupErrors(errs);
    return errs.length === 0;
  }, [name, scope, departmentId]);

  const validateDates = useCallback(() => {
    const errs: string[] = [];
    const fieldErrs: Record<string, string> = {};
    const parse = (v: string) => (v ? new Date(`${v}T12:00:00`).getTime() : NaN);

    const required: Array<[string, string]> = [
      ["goalDeadline", goalDeadline],
      ["selfDeadline", selfDeadline],
      ["peerDeadline", peerDeadline],
      ["managerDeadline", managerDeadline],
      ["calibrationDeadline", calibrationDeadline],
      ["releaseDate", releaseDate],
    ];

    for (const [key, value] of required) {
      if (!value) {
        fieldErrs[key] = "Required";
      }
    }

    const g = parse(goalDeadline);
    const s = parse(selfDeadline);
    const p = parse(peerDeadline);
    const m = parse(managerDeadline);
    const c = parse(calibrationDeadline);
    const r = parse(releaseDate);

    if (goalDeadline && selfDeadline && !(g <= s)) {
      const msg = "Goal-setting deadline should be on or before self-assessment deadline.";
      errs.push(msg);
      fieldErrs.goalDeadline = fieldErrs.goalDeadline || msg;
      fieldErrs.selfDeadline = fieldErrs.selfDeadline || msg;
    }
    if (selfDeadline && managerDeadline && !(s < m)) {
      const msg = "Manager review deadline must be after self-assessment deadline.";
      errs.push(msg);
      fieldErrs.selfDeadline = fieldErrs.selfDeadline || msg;
      fieldErrs.managerDeadline = fieldErrs.managerDeadline || msg;
    }
    if (peerDeadline && managerDeadline && !(p < m)) {
      const msg = "Peer feedback checkpoint should be before manager review deadline.";
      errs.push(msg);
      fieldErrs.peerDeadline = fieldErrs.peerDeadline || msg;
      fieldErrs.managerDeadline = fieldErrs.managerDeadline || msg;
    }
    if (managerDeadline && calibrationDeadline && !(m <= c)) {
      const msg = "Calibration deadline must be on or after manager review deadline.";
      errs.push(msg);
      fieldErrs.managerDeadline = fieldErrs.managerDeadline || msg;
      fieldErrs.calibrationDeadline = fieldErrs.calibrationDeadline || msg;
    }
    if (calibrationDeadline && releaseDate && !(c <= r)) {
      const msg = "Results release date must be on or after calibration deadline.";
      errs.push(msg);
      fieldErrs.calibrationDeadline = fieldErrs.calibrationDeadline || msg;
      fieldErrs.releaseDate = fieldErrs.releaseDate || msg;
    }

    setDateFieldErrors(fieldErrs);
    setDateErrors(errs);
    return Object.keys(fieldErrs).length === 0 && errs.length === 0;
  }, [
    goalDeadline,
    peerDeadline,
    selfDeadline,
    managerDeadline,
    calibrationDeadline,
    releaseDate,
  ]);

  useEffect(() => {
    if (step >= 1) {
      validateDates();
    }
  }, [step, validateDates]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (step !== 2) return;
      if (scope === "department" && !departmentId) {
        setEstParticipants(null);
        return;
      }
      try {
        const params: Record<string, unknown> = { limit: 500 };
        if (scope === "department" && departmentId) {
          params.departmentId = departmentId;
        }
        const users = await usersApi.list(params);
        const n = Array.isArray(users) ? users.length : 0;
        if (!cancelled) setEstParticipants(n);
      } catch {
        if (!cancelled) setEstParticipants(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, scope, departmentId]);

  const buildPayload = useMemo(() => {
    return {
      name: name.trim(),
      scope,
      ...(scope === "department" && departmentId ? { department_id: departmentId } : {}),
      frequency,
      goal_setting_deadline: toIsoEndOfDay(goalDeadline),
      mid_checkin_date: toIsoEndOfDay(peerDeadline),
      self_assessment_deadline: toIsoEndOfDay(selfDeadline),
      manager_review_deadline: toIsoEndOfDay(managerDeadline),
      calibration_deadline: toIsoEndOfDay(calibrationDeadline),
      results_release_date: toIsoEndOfDay(releaseDate),
    };
  }, [
    name,
    scope,
    departmentId,
    frequency,
    goalDeadline,
    peerDeadline,
    selfDeadline,
    managerDeadline,
    calibrationDeadline,
    releaseDate,
  ]);

  const save = async (activate: boolean) => {
    if (!validateSetup()) {
      toast.error("Fix setup details");
      return;
    }
    if (!validateDates()) {
      toast.error("Fix deadline order");
      return;
    }
    setSubmitting(true);
    try {
      let id = editId || "";
      if (editId) {
        await updatePerformanceCycle(
          editId,
          activate ? { ...buildPayload, status: "active" } : buildPayload,
        );
        id = editId;
        toast.success(activate ? "Cycle saved and activated" : "Draft saved");
      } else {
        const created = await createPerformanceCycle(buildPayload);
        id = created.id;
        if (activate) {
          await updatePerformanceCycle(id, { status: "active" });
          toast.success("Cycle created and activated");
        } else {
          toast.success("Draft cycle created");
        }
      }
      onSuccess?.(id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) return null;
  if (loadingCycle) {
    return <div className="text-muted-foreground text-center py-8">Loading…</div>;
  }

  const goToStep = (target: number) => {
    if (target <= step) {
      setStep(target);
      return;
    }
    if (step === 0 && !validateSetup()) {
      toast.error("Fix setup details before continuing");
      return;
    }
    if (target >= 2 && !validateDates()) {
      toast.error("Fix deadlines before continuing");
      return;
    }
    setStep(target);
  };

  const nextFromSetup = () => {
    if (!validateSetup()) {
      toast.error("Fix setup details before continuing");
      return;
    }
    setStep(1);
  };

  const nextFromDeadlines = () => {
    if (!validateDates()) {
      toast.error("Fix deadline validations before continuing");
      return;
    }
    setStep(2);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <p className="text-sm text-muted-foreground">
          {STEPS[step]} — step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => goToStep(i)}
            className={cn(
              "flex-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
              i === step ? "border-primary bg-primary/5" : "border-border text-muted-foreground",
            )}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cycle setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Cycle name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q1 2026 Performance Review"
              />
              {setupErrors.some((e) => e.includes("Cycle name")) ? (
                <p className="text-xs text-destructive mt-1">Cycle name is required.</p>
              ) : null}
            </div>
            <div>
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as ReviewFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half_yearly">Half-yearly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "all" | "department")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  <SelectItem value="department">By department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "department" ? (
              <div>
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {setupErrors.some((e) => e.includes("department")) ? (
                  <p className="text-xs text-destructive mt-1">Department is required for department scope.</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={nextFromSetup}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Goal-setting deadline</Label>
                <Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
                {dateFieldErrors.goalDeadline ? (
                  <p className="text-xs text-destructive mt-1">{dateFieldErrors.goalDeadline}</p>
                ) : null}
              </div>
              <div>
                <Label>Peer feedback checkpoint</Label>
                <Input type="date" value={peerDeadline} onChange={(e) => setPeerDeadline(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Stored as mid-cycle check-in date in the system.
                </p>
                {dateFieldErrors.peerDeadline ? (
                  <p className="text-xs text-destructive mt-1">{dateFieldErrors.peerDeadline}</p>
                ) : null}
              </div>
              <div>
                <Label>Self-assessment deadline</Label>
                <Input type="date" value={selfDeadline} onChange={(e) => setSelfDeadline(e.target.value)} />
                {dateFieldErrors.selfDeadline ? (
                  <p className="text-xs text-destructive mt-1">{dateFieldErrors.selfDeadline}</p>
                ) : null}
              </div>
              <div>
                <Label>Manager review deadline</Label>
                <Input
                  type="date"
                  value={managerDeadline}
                  onChange={(e) => setManagerDeadline(e.target.value)}
                />
                {dateFieldErrors.managerDeadline ? (
                  <p className="text-xs text-destructive mt-1">{dateFieldErrors.managerDeadline}</p>
                ) : null}
              </div>
              <div>
                <Label>Calibration deadline</Label>
                <Input
                  type="date"
                  value={calibrationDeadline}
                  onChange={(e) => setCalibrationDeadline(e.target.value)}
                />
                {dateFieldErrors.calibrationDeadline ? (
                  <p className="text-xs text-destructive mt-1">{dateFieldErrors.calibrationDeadline}</p>
                ) : null}
              </div>
              <div>
                <Label>Results release date</Label>
                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                {dateFieldErrors.releaseDate ? (
                  <p className="text-xs text-destructive mt-1">{dateFieldErrors.releaseDate}</p>
                ) : null}
              </div>
            </div>
            {dateErrors.map((e) => (
              <p key={e} className="text-sm text-destructive">
                {e}
              </p>
            ))}
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Timeline preview</p>
              <p>
                Goals close {goalDeadline || "—"} → Self-assessment {selfDeadline || "—"} → Peer checkpoint{" "}
                {peerDeadline || "—"} → Manager review {managerDeadline || "—"}
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={nextFromDeadlines}>Next</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review & confirm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-3 space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span> {name}
              </p>
              <p>
                <span className="text-muted-foreground">Frequency:</span> {frequency}
              </p>
              <p>
                <span className="text-muted-foreground">Scope:</span> {scope}{" "}
                {scope === "department" && departmentId
                  ? departments.find((d) => d.id === departmentId)?.name
                  : ""}
              </p>
            </div>
            <p>
              <span className="text-muted-foreground">Estimated participants: </span>
              {estParticipants != null ? (
                <strong>{estParticipants}</strong>
              ) : (
                <span className="text-muted-foreground">Could not estimate (saves still work).</span>
              )}
            </p>
            {dateErrors.map((e) => (
              <p key={e} className="text-sm text-destructive">
                {e}
              </p>
            ))}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="secondary" disabled={submitting} onClick={() => void save(false)}>
                {submitting ? "Saving…" : editId ? "Save draft" : "Save as draft"}
              </Button>
              <Button disabled={submitting} onClick={() => void save(true)}>
                {submitting ? "Working…" : "Create & activate"}
              </Button>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md p-2">
              Create & activate notifies everyone in scope to start their self-assessments immediately.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function CreatePerformanceCycleSheet({
  open,
  onOpenChange,
  editId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  onCreated?: (cycleId: string) => void;
}) {
  return (
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editId ? "Edit review cycle" : "New review cycle"}
      description="Set up cycle scope, deadlines, and activation."
      size="2xl"
    >
      {open ? (
        <CreatePerformanceCycleFormBody
          editId={editId}
          onSuccess={(cycleId) => {
            onOpenChange(false);
            onCreated?.(cycleId);
          }}
        />
      ) : null}
    </FormSideSheet>
  );
}
