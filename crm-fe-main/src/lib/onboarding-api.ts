import { api } from "@/lib/api";
import { fetchHrEmployees as fetchCanonicalHrEmployees } from "@/lib/hr-employee-api";
import type {
  OnboardingChecklist,
  OnboardingTemplate,
  OnboardingAnalyticsResponse,
} from "@/types/onboarding";

type ApiEnvelope<T> = { success?: boolean; data: T };

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

export async function fetchOnboardingChecklists(
  type?: "onboarding" | "offboarding",
): Promise<OnboardingChecklist[]> {
  const res = await api.get<ApiEnvelope<OnboardingChecklist[]>>("/onboarding/checklists", {
    params: type ? { type } : undefined,
  });
  return unwrap(res);
}

export async function fetchOnboardingChecklistById(id: string): Promise<OnboardingChecklist> {
  const res = await api.get<ApiEnvelope<OnboardingChecklist>>(`/onboarding/checklists/${id}`);
  return unwrap(res);
}

export async function fetchMyOnboardingChecklists(): Promise<OnboardingChecklist[]> {
  const res = await api.get<ApiEnvelope<OnboardingChecklist[]>>("/onboarding/checklists/me");
  return unwrap(res);
}

export async function createOnboardingChecklist(body: {
  employee_id: string;
  template_id?: string;
  type: "onboarding" | "offboarding";
  joining_date: string;
}): Promise<OnboardingChecklist> {
  const res = await api.post<ApiEnvelope<OnboardingChecklist>>("/onboarding/checklists", body);
  return unwrap(res);
}

export async function updateOnboardingChecklistTask(
  checklistId: string,
  taskIndex: number,
  body: { status: "pending" | "done" | "overdue"; notes?: string },
): Promise<OnboardingChecklist> {
  const res = await api.put<ApiEnvelope<OnboardingChecklist>>(
    `/onboarding/checklists/${checklistId}/tasks/${taskIndex}`,
    body,
  );
  return unwrap(res);
}

export async function fetchOnboardingTemplates(params?: {
  type?: "onboarding" | "offboarding";
  department?: string;
}): Promise<OnboardingTemplate[]> {
  const res = await api.get<ApiEnvelope<OnboardingTemplate[]>>("/onboarding/templates", {
    params,
  });
  return unwrap(res);
}

export async function createOnboardingTemplate(
  body: Record<string, unknown>,
): Promise<OnboardingTemplate> {
  const res = await api.post<ApiEnvelope<OnboardingTemplate>>("/onboarding/templates", body);
  return unwrap(res);
}

export async function updateOnboardingTemplate(
  id: string,
  body: Record<string, unknown>,
): Promise<OnboardingTemplate> {
  const res = await api.put<ApiEnvelope<OnboardingTemplate>>(
    `/onboarding/templates/${id}`,
    body,
  );
  return unwrap(res);
}

export async function initiateOffboarding(
  employeeId: string,
  body: {
    resignation_date?: string;
    last_working_day: string;
    exit_type: "resignation" | "termination" | "contract_end";
    reason?: string;
  },
): Promise<OnboardingChecklist> {
  const res = await api.post<ApiEnvelope<OnboardingChecklist>>(
    `/onboarding/offboarding/${employeeId}/initiate`,
    body,
  );
  return unwrap(res);
}

export async function submitExitInterview(
  checklistId: string,
  body: Record<string, unknown>,
): Promise<OnboardingChecklist> {
  const res = await api.post<ApiEnvelope<OnboardingChecklist>>(
    `/onboarding/checklists/${checklistId}/exit-interview`,
    body,
  );
  return unwrap(res);
}

export async function archiveOffboardedEmployee(employeeId: string): Promise<unknown> {
  const res = await api.post<ApiEnvelope<unknown>>(
    `/onboarding/offboarding/${employeeId}/archive`,
  );
  return unwrap(res);
}

export async function downloadOffboardingPdf(checklistId: string): Promise<Blob> {
  const res = await api.get(`/onboarding/checklists/${checklistId}/offboarding-pdf`, {
    responseType: "blob",
  });
  return res.data as Blob;
}

export async function fetchOnboardingAnalytics(): Promise<OnboardingAnalyticsResponse> {
  const res = await api.get<ApiEnvelope<OnboardingAnalyticsResponse>>("/hr/analytics/onboarding");
  return unwrap(res);
}

export async function fetchHREmployeesForOnboarding(): Promise<unknown[]> {
  // Canonical source lives in hr-employee-api; keep this wrapper for compatibility.
  return fetchCanonicalHrEmployees();
}
