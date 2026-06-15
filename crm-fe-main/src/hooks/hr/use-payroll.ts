"use client";

import useSWR from "swr";
import {
  approveIncrement,
  approvePayrollRun,
  createCorrectionRun,
  createSalaryBand,
  deleteSalaryBand,
  disbursePayrollRun,
  fetchIncrementProposals,
  fetchMyPayslips,
  fetchPayrollAnalytics,
  fetchPayrollRecords,
  fetchPayrollRun,
  fetchPayrollRuns,
  fetchSalaryBands,
  initiatePayrollRun,
  proposeIncrement,
  rejectIncrement,
  submitPayrollRun,
  updatePayrollRecord,
  updateSalaryBand,
} from "@/lib/payroll-client";
import type {
  IncrementProposal,
  PayrollAnalytics,
  PayrollRecord,
  PayrollRun,
  SalaryBand,
} from "@/types/payroll";

export function usePayrollRuns() {
  const { data, error, isLoading, mutate } = useSWR<PayrollRun[]>(
    "payroll/runs",
    () => fetchPayrollRuns(),
    { revalidateOnFocus: false },
  );
  return { runs: data ?? [], error, isLoading, mutate };
}

export function usePayrollRun(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PayrollRun>(
    id ? `payroll/runs/${id}` : null,
    () => fetchPayrollRun(id!),
    { revalidateOnFocus: false },
  );
  return { run: data ?? null, error, isLoading, mutate };
}

export function usePayrollRecords(runId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PayrollRecord[]>(
    runId ? `payroll/runs/${runId}/records` : null,
    () => fetchPayrollRecords(runId!),
    { revalidateOnFocus: false },
  );
  return { records: data ?? [], error, isLoading, mutate };
}

export function useIncrements() {
  const { data, error, isLoading, mutate } = useSWR<IncrementProposal[]>(
    "payroll/increments",
    () => fetchIncrementProposals(),
    { revalidateOnFocus: false },
  );

  const optimisticApprove = async (id: string) => {
    await mutate(
      (prev) =>
        (prev ?? []).map((p) => (p.id === id ? { ...p, status: "approved" as const } : p)),
      { revalidate: false },
    );
    try {
      await approveIncrement(id);
      await mutate();
    } catch (e) {
      await mutate();
      throw e;
    }
  };

  const optimisticReject = async (id: string, reason: string) => {
    await mutate(
      (prev) =>
        (prev ?? []).map((p) => (p.id === id ? { ...p, status: "rejected" as const } : p)),
      { revalidate: false },
    );
    try {
      await rejectIncrement(id, reason);
      await mutate();
    } catch (e) {
      await mutate();
      throw e;
    }
  };

  return {
    proposals: data ?? [],
    error,
    isLoading,
    mutate,
    optimisticApprove,
    optimisticReject,
  };
}

export function useSalaryBands(department?: string) {
  const key = department ? `payroll/salary-bands?d=${department}` : "payroll/salary-bands";
  const { data, error, isLoading, mutate } = useSWR<SalaryBand[]>(
    key,
    () => fetchSalaryBands(department),
    { revalidateOnFocus: false },
  );
  return { bands: data ?? [], error, isLoading, mutate };
}

export function usePayslips() {
  const { data, error, isLoading, mutate } = useSWR<PayrollRecord[]>(
    "payroll/payslips/me",
    () => fetchMyPayslips(),
    { revalidateOnFocus: false },
  );
  return { payslips: data ?? [], error, isLoading, mutate };
}

export function usePayrollAnalytics() {
  const { data, error, isLoading, mutate } = useSWR<PayrollAnalytics>(
    "payroll/analytics",
    () => fetchPayrollAnalytics(),
    { revalidateOnFocus: false },
  );
  return {
    analytics: data ?? null,
    error,
    isLoading,
    mutate,
  };
}

export const payrollMutations = {
  initiatePayrollRun,
  submitPayrollRun,
  approvePayrollRun,
  disbursePayrollRun,
  createCorrectionRun,
  updatePayrollRecord,
  createSalaryBand,
  updateSalaryBand,
  deleteSalaryBand,
  proposeIncrement,
};
