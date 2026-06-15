"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, TrendingDown, TrendingUp, Wallet, Users, AlertCircle } from "lucide-react";
import { formatINR, formatPayrollMonthLabel } from "@/lib/payroll-format";
import { InitiateRunModal } from "@/components/hr/payroll/initiate-run-modal";
import { CorrectionRunModal } from "@/components/hr/payroll/correction-run-modal";
import { PayrollRunsTab } from "@/components/hr/payroll/PayrollRunsTab";
import { IncrementsTab } from "@/components/hr/payroll/IncrementsTab";
import { CreateIncrementModal } from "@/components/hr/payroll/create-increment-modal";
import { PayrollAnalyticsWidget } from "@/components/hr/payroll/payroll-analytics-widget";
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
import type { PayrollPageState } from "@/hooks/hr/usePayrollPage";

type PayrollPageShellProps = PayrollPageState;

export function PayrollPageShell(props: PayrollPageShellProps) {
  const {
    router,
    payslipOnly,
    canView,
    canManage,
    canApprove,
    canSeeOps,
    runs,
    runsLoading,
    mutateRuns,
    proposals,
    incLoading,
    mutateInc,
    analytics,
    analyticsLoading,
    mutateAnalytics,
    yearFilter,
    setYearFilter,
    activeTab,
    setActiveTab,
    initOpen,
    setInitOpen,
    corrOpen,
    setCorrOpen,
    corrRun,
    setCorrRun,
    createIncOpen,
    setCreateIncOpen,
    employees,
    approvingId,
    approveInc,
    setApproveInc,
    rejectInc,
    setRejectInc,
    rejectReason,
    setRejectReason,
    bulkApproving,
    bulkRejectOpen,
    setBulkRejectOpen,
    bulkRejectReason,
    setBulkRejectReason,
    bulkRejecting,
    filteredRuns,
    zeroCtcCount,
    pendingIncrements,
    ymNow,
    kpis,
    handleQuickApprove,
    confirmApproveInc,
    confirmRejectInc,
    approveAllPendingIncrements,
    rejectAllPendingIncrements,
  } = props;

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

        <TabsContent value="overview">
          <PayrollRunsTab
            yearFilter={yearFilter}
            setYearFilter={setYearFilter}
            runsLoading={runsLoading}
            filteredRuns={filteredRuns}
            canApprove={canApprove}
            canManage={canManage}
            approvingId={approvingId}
            onQuickApprove={handleQuickApprove}
            onCorrection={(run) => {
              setCorrRun(run);
              setCorrOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="increments">
          <IncrementsTab
            canManage={canManage}
            canApprove={canApprove}
            incLoading={incLoading}
            proposals={proposals}
            pendingIncrements={pendingIncrements}
            bulkApproving={bulkApproving}
            bulkRejecting={bulkRejecting}
            onCreate={() => setCreateIncOpen(true)}
            onApproveAll={approveAllPendingIncrements}
            onRejectAllOpen={() => setBulkRejectOpen(true)}
            onReject={(id) => setRejectInc({ id })}
            onApprove={(p) => setApproveInc(p)}
          />
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
