"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { usePermission, useAnyPermission } from "@/hooks/auth/usePermission";
import {
  usePayrollRuns,
  useIncrements,
  usePayrollAnalytics,
} from "@/hooks/hr/usePayroll";
import {
  approvePayrollRun,
  getPayrollErrorMessage,
  approveIncrement,
  rejectIncrement,
} from "@/lib/payroll-client";
import { fetchHrEmployees } from "@/lib/hr-employee-api";
import { formatINR, parseNum } from "@/lib/payroll-format";
import type { HrEmployeeOption, PayrollRun } from "@/types/payroll";
import { toast } from "sonner";

export function usePayrollPage() {
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
        list.map((e) => ({
          id: String(e.id),
          fullName: e.fullName,
          full_name: e.fullName,
          email: e.email ?? "",
          departmentId: e.departmentId,
          teamId: e.teamId,
          departmentName: e.departmentName,
          teamName: e.teamName,
          currentCtc: e.currentCtc ?? null,
          current_ctc: e.currentCtc ?? null,
          jobTitle: e.jobTitle ?? null,
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
    const pendingIncrementsCount = proposals.filter((p) => p.status === "pending").length;

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
      pendingIncrements: pendingIncrementsCount,
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

  return {
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
  };
}

export type PayrollPageState = ReturnType<typeof usePayrollPage>;
