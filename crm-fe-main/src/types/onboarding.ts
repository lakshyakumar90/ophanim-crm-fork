/**
 * Onboarding / offboarding domain types aligned with CRM API.
 * Task statuses on the wire: pending | done | overdue (see CHECKLIST_TASK_STATUSES).
 */

export type ChecklistTaskStatusApi = "pending" | "done" | "overdue";

export interface OnboardingTask {
  task_name: string;
  description?: string | null;
  owner?: string | null;
  assigned_role?: string | null;
  due_days_from_joining?: number;
  due_date?: string | null;
  status: ChecklistTaskStatusApi;
  completed_at?: string | null;
  notes?: string | null;
}

/** Template row shape (API create template — owner must be IT | HR | Manager | NewHire) */
export type TemplateTaskOwner = "IT" | "HR" | "Manager" | "NewHire";

export interface OnboardingTemplateTaskInput {
  task_name: string;
  description?: string;
  owner: TemplateTaskOwner;
  due_days_from_joining: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  department?: string | null;
  type: "onboarding" | "offboarding";
  tasks: OnboardingTask[] | OnboardingTemplateTaskInput[] | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
}

export interface ExitInterviewData {
  overall_experience?: number;
  reason?: string;
  would_recommend?: boolean;
  feedback?: string;
  suggestions?: string;
  completed_at?: string;
}

export interface ExitDetails {
  resignation_date?: string | null;
  last_working_day?: string | null;
  exit_type?: string | null;
  reason?: string | null;
  exit_interview_data?: ExitInterviewData | null;
}

export interface ChecklistEmployee {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
}

export interface OnboardingChecklist {
  id: string;
  employee_id: string;
  template_id?: string | null;
  type: "onboarding" | "offboarding";
  joining_date?: string | null;
  tasks: OnboardingTask[];
  completion_rate: number;
  total_tasks?: number;
  done_tasks?: number;
  exit_details?: ExitDetails | null;
  employee?: ChecklistEmployee | null;
  template?: { id: string; name: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface OnboardingAnalyticsResponse {
  activeOnboardings: number;
  activeOnboardingsList: Array<{
    id: string;
    employeeName: string;
    startedDate: string;
    completionRate?: number;
  }>;
  completedThisMonth: number;
  completionRate: number;
  onboardingVsOffboarding?: { onboarding: number; offboarding: number };
  recentCompletedOnboarding?: Array<{ id: string; tasks?: unknown; created_at?: string }>;
}

export interface HREmployeeOption {
  id: string;
  fullName: string;
  email: string;
  departmentName: string | null;
  teamName: string | null;
  jobTitle: string | null;
  hrStatus?: string;
}
