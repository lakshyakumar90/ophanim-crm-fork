"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Receipt, FileText, TrendingDown, TrendingUp, Wallet, Users, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermission, useAnyPermission } from "@/hooks/use-permission";
import {
  usePayrollRuns,
  useIncrements,
  usePayrollAnalytics,
} from "@/hooks/use-payroll";
import {
  fetchHrEmployees,
  approvePayrollRun,
  getPayrollErrorMessage,
  approveIncrement,
  rejectIncrement,
} from "@/lib/payroll-client";
import { formatINR, formatPayrollMonthLabel, parseNum } from "@/lib/payroll-format";
import type { HrEmployeeOption, PayrollRun } from "@/types/payroll";
import { InitiateRunModal } from "@/components/payroll/initiate-run-modal";
import { CorrectionRunModal } from "@/components/payroll/correction-run-modal";
import { PayrollRunTableRow } from "@/components/payroll/payroll-run-table-row";
import { CreateIncrementModal } from "@/components/payroll/create-increment-modal";
import { PayrollAnalyticsWidget } from "@/components/payroll/payroll-analytics-widget";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function PayrollRunsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canView = usePermission("payroll:view");
  const canManage = usePermission("payroll:manage");
  const canApprove = usePermission("payroll:approve");
  const canSeeOps = useAnyPermission(["payroll:manage", "payroll:approve"]);

  const { runs, isLoading: runsLoading, mutate: mutateRuns } = usePayrollRuns();
  const {
    proposals,
    isLoading: incLoading,
    mutate: mutateInc,
    optimisticApprove,
    optimisticReject,
  } = useIncrements();
  const { analytics, isLoading: analyticsLoading, mutate: mutateAnalytics } = usePayrollAnalytics();

  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState("overview");
  const [initOpen, setInitOpen] = useState(false);
  const [corrOpen, setCorrOpen] = useState(false);
  const [corrRun, setCorrRun] = useState<PayrollRun | null>(null);
  const [createIncOpen, setCreateIncOpen] = useState(false);
  const [employees, setEmployees] = useState<HrEmployeeOption[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [approveInc, setApproveInc] = useState<{
    id: string;
    name: string;
    from: number;
    to: number;
  } | null>(null);
  const [rejectInc, setRejectInc] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [bulkRejecting, setBulkRejecting] = useState(false);

  const payslipOnly =
    user?.role === "employee" &&
    canView &&
    !canManage &&
    !canApprove;

  useEffect(() => {
    if (payslipOnly) {
      router.replace("/hr/payroll/my-payslips");
    }
  }, [payslipOnly, router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "overview" || tab === "increments" || tab === "analytics") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadEmployees = async () => {
    try {
      const list = await fetchHrEmployees();
      setEmployees(
        (list as Record<string, unknown>[]).map((e) => ({
          id: String(e.id),
          fullName: String(e.fullName ?? e.full_name ?? "Unknown"),
          full_name: e.full_name as string | undefined,
          email: String(e.email ?? ""),
          departmentId: (e.departmentId ?? e.department_id) as string | null,
          teamId: (e.teamId ?? e.team_id) as string | null,
          departmentName: (e.departmentName ?? e.department_name) as string | null,
          teamName: (e.teamName ?? e.team_name) as string | null,
          currentCtc: (e.currentCtc as number | null) ?? null,
          current_ctc: ((e.current_ctc ?? e.currentCtc) as number | null) ?? null,
          jobTitle: (e.jobTitle ?? e.job_title) as string | null,
        })),
      );
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (!canView && !canManage) return;
    void loadEmployees();
  }, [canView, canManage]);

  const filteredRuns = useMemo(
    () => runs.filter((r) => r.month.startsWith(yearFilter)),
    [runs, yearFilter],
  );

  const zeroCtcCount = useMemo(
    () =>
      employees.filter((e) => {
        const ctc = e.currentCtc ?? e.current_ctc;
        return !ctc || ctc <= 0;
      }).length,
    [employees],
  );

  const pendingIncrements = useMemo(
    () => proposals.filter((p) => p.status === "pending"),
    [proposals],
  );

  const now = new Date();
  const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const kpis = useMemo(() => {
    const disbursedThisMonth = runs.filter(
      (r) => r.month === ymNow && r.status === "disbursed" && !r.is_correction,
    );
    const netThisMonth = disbursedThisMonth.reduce((s, r) => s + parseNum(r.total_net), 0);

    const pendingApprovals = runs.filter((r) => r.status === "submitted").length;
    const pendingIncrements = proposals.filter((p) => p.status === "pending").length;

    const trend = [...(analytics?.monthlyTrend || [])].sort((a, b) => a.month.localeCompare(b.month));
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    const lastNet = parseNum(last?.total_net);
    const prevNet = parseNum(prev?.total_net);
    let momPct: number | null = null;
    if (prevNet > 0) {
      momPct = Math.round(((lastNet - prevNet) / prevNet) * 1000) / 10;
    }

    const activeOnPayroll = employees.filter((e) => e.current_ctc && e.current_ctc > 0).length;

    return {
      netThisMonth,
      pendingApprovals,
      pendingIncrements,
      momPct,
      activeOnPayroll,
      anomalyMom: (analytics?.anomalies || []).length > 0,
    };
  }, [runs, ymNow, proposals, analytics, employees]);

  const handleQuickApprove = async (run: PayrollRun) => {
    setApprovingId(run.id);
    try {
      await approvePayrollRun(run.id);
      toast.success("Payroll run approved");
      await mutateRuns();
      await mutateAnalytics();
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      setApprovingId(null);
    }
  };

  const confirmApproveInc = async () => {
    if (!approveInc) return;
    try {
      await optimisticApprove(approveInc.id);
      toast.success(
        `${approveInc.name} CTC updated. Compensation history recorded. Employee notified.`,
      );
      setApproveInc(null);
      await mutateInc();
      await loadEmployees();
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    }
  };

  const confirmRejectInc = async () => {
    if (!rejectInc || rejectReason.trim().length < 1) {
      toast.error("Rejection reason is required.");
      return;
    }
    try {
      await optimisticReject(rejectInc.id, rejectReason.trim());
      toast.success("Increment proposal rejected");
      setRejectInc(null);
      setRejectReason("");
      await mutateInc();
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    }
  };

  const approveAllPendingIncrements = async () => {
    if (!canApprove) return;
    const pendingIds = pendingIncrements.map((p) => p.id);
    if (pendingIds.length === 0) return;
    setBulkApproving(true);
    try {
      // Optimistically mark as approved to keep UI responsive.
      await mutateInc(
        (prev) =>
          (prev ?? []).map((p) => (pendingIds.includes(p.id) ? { ...p, status: "approved" as const } : p)),
        { revalidate: false },
      );

      await Promise.all(pendingIds.map((id) => approveIncrement(id)));
      toast.success(`Approved ${pendingIds.length} increment proposal(s).`);
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      await mutateInc();
      setBulkApproving(false);
    }
  };

  const rejectAllPendingIncrements = async (reason: string) => {
    if (!canApprove) return;
    const pendingIds = pendingIncrements.map((p) => p.id);
    if (pendingIds.length === 0) return;
    const r = reason.trim();
    if (r.length < 1) {
      toast.error("Rejection reason is required.");
      return;
    }

    setBulkRejecting(true);
    try {
      await mutateInc(
        (prev) =>
          (prev ?? []).map((p) => (pendingIds.includes(p.id) ? { ...p, status: "rejected" as const } : p)),
        { revalidate: false },
      );

      await Promise.all(pendingIds.map((id) => rejectIncrement(id, r)));
      toast.success(`Rejected ${pendingIds.length} increment proposal(s).`);
      setBulkRejectOpen(false);
      setBulkRejectReason("");
    } catch (e) {
      toast.error(getPayrollErrorMessage(e));
    } finally {
      await mutateInc();
      setBulkRejecting(false);
    }
  };

  if (payslipOnly) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!canView && !canManage && !canApprove) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don&apos;t have permission to view payroll.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col flex-wrap sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground mt-1">
            Runs, increments, analytics, and compensation administration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2 print:hidden"
            onClick={() => router.push("/hr/payroll/my-payslips")}
          >
            My payslips
          </Button>
          {canManage && (
            <Button variant="outline" className="gap-2" onClick={() => router.push("/hr/payroll/salary-bands")}>
              <FileText className="h-4 w-4" />
              Salary bands
            </Button>
          )}
          {canManage && (
            <Button className="gap-2" onClick={() => setInitOpen(true)}>
              Run payroll
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disbursed this month
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{formatINR(kpis.netThisMonth)}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{formatPayrollMonthLabel(ymNow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On payroll (CTC set)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {runsLoading && employees.length === 0 ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{kpis.activeOnPayroll}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active employees with CTC in profile</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.pendingApprovals}</p>
            <p className="text-xs text-muted-foreground mt-1">Runs awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Increment proposals</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{kpis.pendingIncrements}</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              {kpis.momPct !== null && (
                <span
                  className={
                    kpis.momPct > 20 || kpis.anomalyMom
                      ? "text-red-600 font-semibold flex items-center gap-1"
                      : "text-muted-foreground flex items-center gap-1"
                  }
                >
                  {kpis.momPct > 20 || kpis.anomalyMom ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  MoM net {kpis.momPct >= 0 ? "+" : ""}
                  {kpis.momPct}%
                  {kpis.anomalyMom && " · check anomalies"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Runs</TabsTrigger>
          <TabsTrigger value="increments">Increments</TabsTrigger>
          {canSeeOps && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-37.5">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((i) => {
                  const year = (new Date().getFullYear() - i).toString();
                  return (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Initiated by</TableHead>
                    <TableHead>Approved by</TableHead>
                    <TableHead>Correction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredRuns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                        <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        No payroll runs for {yearFilter}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRuns.map((run) => (
                      <PayrollRunTableRow
                        key={run.id}
                        run={run}
                        canApprove={canApprove}
                        canManage={canManage}
                        approvingId={approvingId}
                        onView={() => router.push(`/hr/payroll/${run.id}`)}
                        onApprove={() => void handleQuickApprove(run)}
                        onCorrection={() => {
                          setCorrRun(run);
                          setCorrOpen(true);
                        }}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="increments" className="mt-4 space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setCreateIncOpen(true)}>New increment proposal</Button>
            </div>
          )}

          {canApprove && pendingIncrements.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Pending increments: <span className="text-foreground font-medium">{pendingIncrements.length}</span>
              </div>
              <div className="flex gap-2 justify-start sm:justify-end">
                <Button
                  size="sm"
                  disabled={bulkApproving}
                  onClick={() => void approveAllPendingIncrements()}
                >
                  {bulkApproving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving…
                    </>
                  ) : (
                    `Approve all (${pendingIncrements.length})`
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkRejecting}
                  onClick={() => setBulkRejectOpen(true)}
                >
                  Reject all
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Current CTC</TableHead>
                  <TableHead className="text-right">Proposed</TableHead>
                  <TableHead className="text-right">% Change</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : proposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No increment proposals
                    </TableCell>
                  </TableRow>
                ) : (
                  proposals.map((p) => {
                    const pct =
                      p.current_ctc && p.current_ctc > 0
                        ? Math.round(((p.proposed_ctc - p.current_ctc) / p.current_ctc) * 1000) / 10
                        : null;
                    const statusColor =
                      p.status === "pending"
                        ? "bg-amber-100 text-amber-900"
                        : p.status === "approved"
                          ? "bg-emerald-100 text-emerald-900"
                          : p.status === "rejected"
                            ? "bg-red-100 text-red-900"
                            : "bg-muted";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.employee?.full_name || p.employee_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(p.current_ctc)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(p.proposed_ctc)}</TableCell>
                        <TableCell className="text-right">
                          {pct !== null ? `${pct >= 0 ? "+" : ""}${pct}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor} variant="secondary">
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.proposed_by_user?.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {p.status === "pending" && canApprove && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectInc({ id: p.id })}
                                disabled={bulkApproving || bulkRejecting}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setApproveInc({
                                    id: p.id,
                                    name: p.employee?.full_name || "Employee",
                                    from: p.current_ctc ?? 0,
                                    to: p.proposed_ctc,
                                  })
                                }
                                disabled={bulkApproving || bulkRejecting}
                              >
                                Approve
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {canSeeOps && (
          <TabsContent value="analytics" className="mt-4">
            <PayrollAnalyticsWidget analytics={analytics} loading={analyticsLoading} />
          </TabsContent>
        )}
      </Tabs>

      <InitiateRunModal
        open={initOpen}
        onOpenChange={setInitOpen}
        runs={runs}
        employees={employees}
        zeroCtcEmployeeCount={zeroCtcCount}
        onFixMissingCtcSubmitted={() => {
          setActiveTab("increments");
          void mutateInc();
        }}
        onSuccess={(run, _label) => {
          void mutateRuns();
          void mutateAnalytics();
          router.push(`/hr/payroll/${run.id}`);
        }}
      />

      <CorrectionRunModal
        open={corrOpen}
        onOpenChange={setCorrOpen}
        sourceRun={corrRun}
        onCreated={(run) => {
          void mutateRuns();
          router.push(`/hr/payroll/${run.id}`);
        }}
      />

      <CreateIncrementModal
        open={createIncOpen}
        onOpenChange={setCreateIncOpen}
        employees={employees}
        onCreated={() => void mutateInc()}
      />

      <AlertDialog open={!!approveInc} onOpenChange={(o) => !o && setApproveInc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve increment?</AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">
                Approving will immediately update <strong>{approveInc?.name}</strong>&apos;s CTC from{" "}
                {formatINR(approveInc?.from ?? 0)} to {formatINR(approveInc?.to ?? 0)}. This will reflect in the
                next payroll run.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmApproveInc()}>Confirm approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejectInc} onOpenChange={(o) => !o && setRejectInc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Optionally provide a reason (required by policy).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault();
                void confirmRejectInc();
              }}
            >
              Reject proposal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkRejectOpen}
        onOpenChange={(o) => {
          if (!o) return setBulkRejectOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject all pending increments?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejection reason is required by policy. This will reject all currently pending increment
              proposals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason</Label>
            <Textarea
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkRejectReason("")} disabled={bulkRejecting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={bulkRejecting}
              onClick={(e) => {
                e.preventDefault();
                void rejectAllPendingIncrements(bulkRejectReason);
              }}
            >
              {bulkRejecting ? "Rejecting…" : `Reject all (${pendingIncrements.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
