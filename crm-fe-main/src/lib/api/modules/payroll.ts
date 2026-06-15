import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { fetchHrEmployees as fetchCanonicalHrEmployees } from "@/lib/hr-employee-api";
import type {
  IncrementProposal,
  PayrollEmployeeSelection,
  PayrollAnalytics,
  PayrollRecord,
  PayrollRun,
  SalaryBand,
} from "@/types/payroll";

export function getPayrollErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  return getApiErrorMessage(err, {
    fallback,
    statusMessages: { 403: "You don't have permission to perform this action." },
    serverMessage: "Something went wrong. Please try again.",
  });
}

function data<T>(res: { data?: { data?: T } }): T {
  const d = res.data?.data;
  if (d === undefined) throw new Error("Invalid API response");
  return d;
}

export async function fetchPayrollRuns(params?: {
  status?: string;
  is_correction?: boolean;
}): Promise<PayrollRun[]> {
  const res = await api.get("/payroll/runs", {
    params: params?.is_correction !== undefined ? { ...params, is_correction: String(params.is_correction) } : params,
  });
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

export async function fetchPayrollRun(id: string): Promise<PayrollRun> {
  const res = await api.get(`/payroll/runs/${id}`);
  return data(res);
}

export async function initiatePayrollRun(body: {
  month: string;
  notes?: string;
  cohort_name?: string;
  employee_selection?: PayrollEmployeeSelection;
}): Promise<PayrollRun> {
  const res = await api.post("/payroll/runs", body);
  return data(res);
}

export async function submitPayrollRun(id: string): Promise<PayrollRun> {
  const res = await api.post(`/payroll/runs/${id}/submit`);
  return data(res);
}

export async function approvePayrollRun(id: string): Promise<PayrollRun> {
  const res = await api.post(`/payroll/runs/${id}/approve`);
  return data(res);
}

export async function disbursePayrollRun(id: string): Promise<PayrollRun> {
  const res = await api.post(`/payroll/runs/${id}/disburse`);
  return data(res);
}

export async function createCorrectionRun(id: string, notes: string): Promise<PayrollRun> {
  const res = await api.post(`/payroll/runs/${id}/correction`, { notes });
  return data(res);
}

export async function fetchPayrollRecords(runId: string): Promise<PayrollRecord[]> {
  const res = await api.get(`/payroll/runs/${runId}/records`);
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

export async function updatePayrollRecord(
  recordId: string,
  body: {
    reason: string;
    earnings?: Record<string, number>;
    deductions?: Record<string, number>;
  },
): Promise<PayrollRecord> {
  const res = await api.put(`/payroll/records/${recordId}`, body);
  return data(res);
}

export async function fetchSalaryBands(department?: string): Promise<SalaryBand[]> {
  const res = await api.get("/payroll/salary-bands", { params: department ? { department } : undefined });
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

export async function createSalaryBand(body: Record<string, unknown>): Promise<SalaryBand> {
  const res = await api.post("/payroll/salary-bands", body);
  return data(res);
}

export async function updateSalaryBand(id: string, body: Record<string, unknown>): Promise<SalaryBand> {
  const res = await api.put(`/payroll/salary-bands/${id}`, body);
  return data(res);
}

export async function deleteSalaryBand(id: string): Promise<void> {
  await api.delete(`/payroll/salary-bands/${id}`);
}

export async function fetchIncrementProposals(employeeId?: string): Promise<IncrementProposal[]> {
  const res = await api.get("/payroll/increments", {
    params: employeeId ? { employee_id: employeeId } : undefined,
  });
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

export async function proposeIncrement(body: {
  employee_id: string;
  proposed_ctc: number;
  effective_date: string;
  reason: string;
}): Promise<IncrementProposal> {
  const res = await api.post("/payroll/increments", body);
  return data(res);
}

export async function approveIncrement(id: string): Promise<unknown> {
  const res = await api.post(`/payroll/increments/${id}/approve`);
  return res.data?.data;
}

export async function rejectIncrement(id: string, reason: string): Promise<unknown> {
  const res = await api.post(`/payroll/increments/${id}/reject`, { reason });
  return res.data?.data;
}

export async function fetchMyPayslips(): Promise<PayrollRecord[]> {
  const res = await api.get("/payroll/payslips/me");
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

export async function downloadPayslipPdf(recordId: string): Promise<Blob> {
  const res = await api.get(`/payroll/payslips/${recordId}/pdf`, {
    responseType: "blob",
  });
  return res.data as Blob;
}

export async function fetchPayrollAnalytics(): Promise<PayrollAnalytics> {
  const res = await api.get("/payroll/analytics");
  const d = res.data?.data;
  if (!d || typeof d !== "object") {
    return { monthlyTrend: [], departmentCosts: {}, anomalies: [] };
  }
  return d as PayrollAnalytics;
}

export async function fetchHrEmployees(): Promise<unknown[]> {
  // Canonical source lives in hr-employee-api; keep this wrapper for compatibility.
  return fetchCanonicalHrEmployees();
}
