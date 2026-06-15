"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { proposeIncrement, getPayrollErrorMessage } from "@/lib/payroll-client";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import { useSalaryBands } from "@/hooks/hr/usePayroll";
import type { HREmployee } from "@/types/hr.types";
import type { SalaryBand } from "@/types/payroll";

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function matchesJobTitle(bandDesignation: string, jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false;
  const jt = String(jobTitle).trim().toLowerCase();
  const b = String(bandDesignation).trim().toLowerCase();

  // Try multiple representations because HR job titles/descriptions aren't always normalized.
  const jt1 = jt.replace(/ /g, "_");
  const jt2 = jt.replace(/_/g, " ");
  const b1 = b.replace(/ /g, "_");
  const b2 = b.replace(/_/g, " ");

  return b === jt || b1 === jt1 || b2 === jt2;
}

export function QuickFixMissingCTCModal({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted?: () => void;
}) {
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [missingEmployees, setMissingEmployees] = useState<HREmployee[]>([]);

  const [department, setDepartment] = useState<string>("__all__");
  const [jobTitle, setJobTitle] = useState<string>("__all__");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [bandId, setBandId] = useState<string>("");

  const depForBands = department === "__all__" ? undefined : department === "__none__" ? undefined : department;
  const { bands, isLoading: bandsLoading } = useSalaryBands(depForBands);

  const missingBandList = useMemo((): SalaryBand[] => {
    const list = Array.isArray(bands) ? bands : [];
    if (jobTitle === "__all__") return list;
    if (jobTitle === "__none__") return list;
    return list.filter((b) => matchesJobTitle(String(b.designation), jobTitle));
  }, [bands, jobTitle]);

  const selectedBand = useMemo(() => {
    return missingBandList.find((b) => b.id === bandId) ?? null;
  }, [bandId, missingBandList]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of missingEmployees) set.add(e.departmentName || "__none__");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [missingEmployees]);

  const jobTitleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of missingEmployees) {
      const depOk = department === "__all__" ? true : (department === "__none__" ? !e.departmentName : e.departmentName === department);
      if (!depOk) continue;
      set.add(e.jobTitle || "__none__");
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [department, missingEmployees]);

  const visibleEmployees = useMemo(() => {
    return missingEmployees.filter((e) => {
      const depOk =
        department === "__all__" ? true : department === "__none__" ? !e.departmentName : e.departmentName === department;
      if (!depOk) return false;
      const jtOk = jobTitle === "__all__" ? true : jobTitle === "__none__" ? !e.jobTitle : e.jobTitle === jobTitle;
      return jtOk;
    });
  }, [department, jobTitle, missingEmployees]);

  const computedSelected = useMemo(() => visibleEmployees.filter((e) => selectedIds.has(e.id)), [selectedIds, visibleEmployees]);

  const minN = Number(selectedBand?.min_ctc ?? 0) || 0;
  const maxN = Number(selectedBand?.max_ctc ?? 0) || 0;

  const [proposedCtc, setProposedCtc] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(toIsoDate(new Date()));
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingEmployees(true);
    setMissingEmployees([]);
    setSelectedIds(new Set());
    setDepartment("__all__");
    setJobTitle("__all__");
    setBandId("");
    setReason("");
    setEffectiveDate(toIsoDate(new Date()));
    setProposedCtc("");

    void (async () => {
      try {
        const all = await fetchHrEmployees();
        const missing = Array.isArray(all)
          ? all.filter((e) => {
              const c = Number(e.currentCtc ?? 0);
              return !Number.isFinite(c) || c <= 0;
            })
          : [];
        setMissingEmployees(missing);
      } catch (e) {
        toast.error(getPayrollErrorMessage(e));
        setMissingEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    })();
  }, [open]);

  // Default band and proposed CTC when filters change.
  useEffect(() => {
    if (!open) return;
    if (bandsLoading) return;
    const list = missingBandList;
    if (list.length === 0) {
      setBandId("");
      setProposedCtc("");
      return;
    }
    if (!bandId) {
      const first = list[0];
      setBandId(first.id);
      const defaultCtc = Number(first.max_ctc) > 0 ? Number(first.max_ctc) : Number(first.min_ctc);
      setProposedCtc(defaultCtc > 0 ? String(defaultCtc) : "");
    }
  }, [bandId, bandsLoading, jobTitle, department, missingBandList, open]);

  useEffect(() => {
    // When band changes, re-default proposed CTC (only if user hasn't typed something meaningful yet).
    if (!selectedBand) return;
    const current = Number(proposedCtc);
    if (!proposedCtc || !Number.isFinite(current) || current <= 0) {
      const defaultCtc = maxN > 0 ? maxN : minN;
      setProposedCtc(defaultCtc > 0 ? String(defaultCtc) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bandId]);

  const proposedN = Number(proposedCtc) || 0;

  const canSubmit = useMemo(() => {
    if (computedSelected.length === 0) return false;
    if (!selectedBand) return false;
    if (!effectiveDate) return false;
    if (reason.trim().length < 1) return false;
    if (proposedN <= 0) return false;
    if (minN > 0 && proposedN < minN) return false;
    if (maxN > 0 && proposedN > maxN) return false;
    return true;
  }, [computedSelected.length, effectiveDate, maxN, minN, proposedN, reason, selectedBand]);

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const e of visibleEmployees) {
        if (checked) next.add(e.id);
        else next.delete(e.id);
      }
      return next;
    });
  };

  const submit = async () => {
    if (!canSubmit || !selectedBand) return;
    setSubmitting(true);
    try {
      let ok = 0;
      let failed = 0;

      for (const emp of computedSelected) {
        const c = Number(emp.currentCtc ?? 0);
        // Avoid no-op / less-than-current increments to reduce backend noise.
        if (Number.isFinite(c) && c > 0 && proposedN <= c) continue;

        try {
          await proposeIncrement({
            employee_id: emp.id,
            proposed_ctc: proposedN,
            effective_date: effectiveDate,
            reason: reason.trim(),
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }

      toast.success(`Submitted ${ok} increment proposal(s).`);
      if (failed > 0) toast.error(`${failed} proposal(s) failed.`);

      onSubmitted?.();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
      // keep modal state; user might reopen it and see updated proposals
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set missing CTC</DialogTitle>
          <DialogDescription>
            Select one or more employees with missing CTC, pick a salary band, then submit increment proposals for all selected employees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/20 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {departmentOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d === "__none__" ? "Unassigned" : d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Job title</Label>
                <Select value={jobTitle} onValueChange={setJobTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {jobTitleOptions
                      .filter((j) => j && j !== "__none__")
                      .map((j) => (
                        <SelectItem key={j} value={j}>
                          {String(j).replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employees</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    checked={visibleEmployees.length > 0 && computedSelected.length === visibleEmployees.length}
                    onCheckedChange={(v) => toggleSelectAllVisible(Boolean(v))}
                    aria-label="Select all visible employees"
                    disabled={visibleEmployees.length === 0}
                  />
                  <span className="text-sm text-muted-foreground">
                    {computedSelected.length}/{visibleEmployees.length} selected
                  </span>
                </div>
              </div>
            </div>

            {loadingEmployees ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading employees…
              </div>
            ) : (
              <div className="rounded-md border bg-background p-2">
                <div className="max-h-[260px] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleEmployees.map((e) => {
                      const checked = selectedIds.has(e.id);
                      return (
                        <label
                          key={e.id}
                          className="flex items-center gap-2 rounded-md border bg-muted/10 px-2 py-1.5 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(e.id)) next.delete(e.id);
                                else next.add(e.id);
                                return next;
                              });
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{e.fullName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {e.departmentName || "Unassigned"} · {String(e.jobTitle || "Unassigned").replace(/_/g, " ")}
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            ₹0
                          </Badge>
                        </label>
                      );
                    })}
                    {visibleEmployees.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">No missing-CTC employees match this filter.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border bg-muted/20 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Salary band</Label>
                <Select value={bandId || "__none__"} onValueChange={(v) => setBandId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={bandsLoading ? "Loading…" : "Select band"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    {missingBandList.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {String(b.designation).replace(/_/g, " ")} · {b.department ?? "Any"} · Max ₹{Number(b.max_ctc).toLocaleString("en-IN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min/Max CTC (annual)</Label>
                <div className="rounded-md border bg-background p-2 text-sm text-muted-foreground">
                  {minN > 0 ? `Min ₹${minN.toLocaleString("en-IN")}` : "Min —"} · {maxN > 0 ? `Max ₹${maxN.toLocaleString("en-IN")}` : "Max —"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Proposed CTC (annual)</Label>
                <Input type="number" min={0} value={proposedCtc} onChange={(e) => setProposedCtc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Effective date</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason / notes</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit proposals ({computedSelected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

