"use client";

import { useEffect, useMemo, useState } from "react";
import { FormSideSheet } from "@/components/ui/form-side-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { formatPayrollMonthLabel } from "@/lib/payroll-format";
import type { HrEmployeeOption, PayrollEmployeeSelection, PayrollRun } from "@/types/payroll";
import { getPayrollErrorMessage, initiatePayrollRun } from "@/lib/payroll-client";
import { toast } from "sonner";
import { QuickFixMissingCTCModal } from "./quick-fix-missing-ctc-modal";

const MONTHS = [
  { v: "01", l: "January" },
  { v: "02", l: "February" },
  { v: "03", l: "March" },
  { v: "04", l: "April" },
  { v: "05", l: "May" },
  { v: "06", l: "June" },
  { v: "07", l: "July" },
  { v: "08", l: "August" },
  { v: "09", l: "September" },
  { v: "10", l: "October" },
  { v: "11", l: "November" },
  { v: "12", l: "December" },
];

function currentYm(): { y: number; m: number } {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

export function InitiatePayrollRunSheet({
  open,
  onOpenChange,
  runs,
  employees,
  zeroCtcEmployeeCount,
  onSuccess,
  onFixMissingCtcSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  runs: PayrollRun[];
  employees: HrEmployeeOption[];
  zeroCtcEmployeeCount: number;
  onSuccess: (run: PayrollRun, monthLabel: string) => void;
  onFixMissingCtcSubmitted?: () => void;
}) {
  const { y: cy, m: cm } = currentYm();
  const [year, setYear] = useState(String(cy));
  const [month, setMonth] = useState(String(cm).padStart(2, "0"));
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [proceedWithMissingCtc, setProceedWithMissingCtc] = useState(false);
  const [cohortName, setCohortName] = useState("");
  const [selectionType, setSelectionType] = useState<PayrollEmployeeSelection["type"]>("all");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [manualEmployeeIds, setManualEmployeeIds] = useState<string[]>([]);

  const ym = `${year}-${month}`;
  const normalizedCohort = cohortName.trim() || null;

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i <= 2; i++) list.push(cy - i);
    return list;
  }, [cy]);

  const monthOptions = useMemo(() => {
    const y = parseInt(year, 10);
    return MONTHS.filter((m) => {
      if (y < cy) return true;
      if (y > cy) return false;
      return parseInt(m.v, 10) <= cm;
    });
  }, [year, cy, cm]);

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      if (e.departmentId && e.departmentName) {
        map.set(e.departmentId, e.departmentName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [employees]);

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      if (e.teamId && e.teamName) {
        map.set(e.teamId, e.teamName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (departmentIds.length > 0 && (!e.departmentId || !departmentIds.includes(e.departmentId))) {
        return false;
      }
      if (teamIds.length > 0 && (!e.teamId || !teamIds.includes(e.teamId))) {
        return false;
      }
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.departmentName || "").toLowerCase().includes(q) ||
        (e.teamName || "").toLowerCase().includes(q)
      );
    });
  }, [employees, search, departmentIds, teamIds]);

  const selectedEmployeeCount = useMemo(() => {
    if (selectionType === "all") return employees.length;
    if (selectionType === "departments") {
      return employees.filter((e) => e.departmentId && departmentIds.includes(e.departmentId)).length;
    }
    if (selectionType === "teams") {
      return employees.filter((e) => e.teamId && teamIds.includes(e.teamId)).length;
    }
    return manualEmployeeIds.length;
  }, [selectionType, employees, departmentIds, teamIds, manualEmployeeIds]);

  const missingCtc = useMemo(() => {
    if (selectionType === "all") return zeroCtcEmployeeCount > 0;
    if (selectionType === "departments") {
      return employees.some(
        (e) =>
          e.departmentId &&
          departmentIds.includes(e.departmentId) &&
          !((e.currentCtc ?? e.current_ctc) && (e.currentCtc ?? e.current_ctc)! > 0),
      );
    }
    if (selectionType === "teams") {
      return employees.some(
        (e) =>
          e.teamId &&
          teamIds.includes(e.teamId) &&
          !((e.currentCtc ?? e.current_ctc) && (e.currentCtc ?? e.current_ctc)! > 0),
      );
    }
    return employees.some(
      (e) => manualEmployeeIds.includes(e.id) && !((e.currentCtc ?? e.current_ctc) && (e.currentCtc ?? e.current_ctc)! > 0),
    );
  }, [selectionType, zeroCtcEmployeeCount, employees, departmentIds, teamIds, manualEmployeeIds]);

  const blockingRun = useMemo(() => {
    return (
      runs.find(
        (r) =>
          r.month === ym &&
          !r.is_correction &&
          ((r.cohort_name || null) === normalizedCohort),
      ) || null
    );
  }, [runs, ym, normalizedCohort]);

  const canSubmit =
    !blockingRun &&
    !submitting &&
    ym.match(/^\d{4}-\d{2}$/) &&
    selectedEmployeeCount > 0 &&
    (parseInt(year, 10) < cy || (parseInt(year, 10) === cy && parseInt(month, 10) <= cm));

  useEffect(() => {
    if (!open) return;
    setProceedWithMissingCtc(false);
    setApiError(null);
    setFixOpen(false);
    setSearch("");
    setSelectionType("all");
    setDepartmentIds([]);
    setTeamIds([]);
    setManualEmployeeIds([]);
  }, [open]);

  const toggleListValue = (current: string[], value: string, setter: (v: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((x) => x !== value));
      return;
    }
    setter([...current, value]);
  };

  const handleSubmit = async () => {
    setApiError(null);
    if (blockingRun) {
      setApiError(
        `A payroll run for ${formatPayrollMonthLabel(ym)} and cohort '${normalizedCohort || "all"}' already exists.`,
      );
      return;
    }
    if (missingCtc && !proceedWithMissingCtc) {
      setApiError("Please confirm you want to proceed anyway when some employees have missing CTC.");
      return;
    }
    if (!canSubmit) return;

    let employeeSelection: PayrollEmployeeSelection = { type: "all" };
    if (selectionType === "departments") {
      employeeSelection = { type: "departments", departments: departmentIds };
    } else if (selectionType === "teams") {
      employeeSelection = { type: "teams", teams: teamIds };
    } else if (selectionType === "manual") {
      employeeSelection = { type: "manual", employee_ids: manualEmployeeIds };
    }

    setSubmitting(true);
    try {
      const run = await initiatePayrollRun({
        month: ym,
        notes: `Payroll run for ${ym}`,
        cohort_name: normalizedCohort || undefined,
        employee_selection: employeeSelection,
      });
      const label = formatPayrollMonthLabel(ym);
      toast.success(`Payroll run created for ${label}`);
      onSuccess(run, label);
      onOpenChange(false);
    } catch (e) {
      const msg = getPayrollErrorMessage(e);
      setApiError(msg);
      if (!msg.toLowerCase().includes("already")) {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <FormSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Initiate Payroll Run"
      description="Calculate payroll for active employees based on their current CTC and attendance data."
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {missingCtc ? "Reject run" : "Cancel"}
          </Button>
          <Button
            disabled={!canSubmit || (missingCtc && !proceedWithMissingCtc)}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initiating…
              </>
            ) : (
              missingCtc ? "Initiate Run (OK)" : "Initiate Run"
            )}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cohort-name">Cohort label (optional)</Label>
            <Input
              id="cohort-name"
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              placeholder="e.g. Sales Team, PM Team, March Batch A"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.v} value={m.v}>
                      {m.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Employee scope</Label>
            <Select
              value={selectionType}
              onValueChange={(v) => setSelectionType(v as PayrollEmployeeSelection["type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All active employees</SelectItem>
                <SelectItem value="departments">By departments</SelectItem>
                <SelectItem value="teams">By teams</SelectItem>
                <SelectItem value="manual">Manual employee selection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(selectionType === "departments" || selectionType === "teams" || selectionType === "manual") && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Filter departments</Label>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-2">
                  {departmentOptions.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={departmentIds.includes(d.id)}
                        onCheckedChange={() =>
                          toggleListValue(departmentIds, d.id, setDepartmentIds)
                        }
                      />
                      <span>{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Filter teams</Label>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-2">
                  {teamOptions.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={teamIds.includes(t.id)}
                        onCheckedChange={() => toggleListValue(teamIds, t.id, setTeamIds)}
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectionType === "manual" && (
            <div className="space-y-2">
              <Label htmlFor="employee-search">Search employees</Label>
              <Input
                id="employee-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, department, team"
              />
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-2">
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees match current filters.</p>
                ) : (
                  filteredEmployees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={manualEmployeeIds.includes(e.id)}
                        onCheckedChange={() =>
                          toggleListValue(manualEmployeeIds, e.id, setManualEmployeeIds)
                        }
                      />
                      <span className="truncate">
                        {e.fullName} · {e.departmentName || "No Department"} · {e.teamName || "No Team"}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            Selected employees: <strong>{selectedEmployeeCount}</strong>
          </div>

          {blockingRun && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Run already exists</AlertTitle>
              <AlertDescription>
                A payroll run for {formatPayrollMonthLabel(ym)} and cohort '{normalizedCohort || "all"}' already
                exists (status: {blockingRun.status}).
              </AlertDescription>
            </Alert>
          )}

          {zeroCtcEmployeeCount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Missing CTC</AlertTitle>
              <AlertDescription>
                {zeroCtcEmployeeCount} employee(s) have no CTC set and will show ₹0 payroll. Please
                update their profiles before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {missingCtc && (
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="proceed-missing-ctc"
                  checked={proceedWithMissingCtc}
                  onCheckedChange={(v) => setProceedWithMissingCtc(Boolean(v))}
                />
                <div className="space-y-1">
                  <Label htmlFor="proceed-missing-ctc" className="cursor-pointer">
                    OK to generate payroll anyway
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Employees with missing CTC will show ₹0 during this payroll run.
                  </p>
                </div>
              </div>
            </div>
          )}

          {zeroCtcEmployeeCount > 0 && (
            <div className="flex justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setFixOpen(true)}>
                Fix missing CTC
              </Button>
            </div>
          )}

          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
        </div>
    </FormSideSheet>

      <QuickFixMissingCTCModal
        open={fixOpen}
        onOpenChange={setFixOpen}
        onSubmitted={() => {
          setFixOpen(false);
          onFixMissingCtcSubmitted?.();
        }}
      />
    </>
  );
}
