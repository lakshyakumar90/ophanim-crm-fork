import { differenceInCalendarDays, parseISO, isValid } from "date-fns";
import type {
  OnboardingChecklist,
  OnboardingTask,
  ChecklistTaskStatusApi,
  HREmployeeOption,
} from "@/types/onboarding";

const STATUSES: ChecklistTaskStatusApi[] = ["pending", "done", "overdue"];

export function normalizeTasks(raw: unknown): OnboardingTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: Record<string, unknown>) => ({
    task_name: String(t.task_name ?? ""),
    description: (t.description as string) ?? null,
    owner: (t.owner as string) ?? null,
    assigned_role: (t.assigned_role as string) ?? null,
    due_days_from_joining:
      typeof t.due_days_from_joining === "number" ? t.due_days_from_joining : undefined,
    due_date: (t.due_date as string) ?? null,
    status: STATUSES.includes(t.status as ChecklistTaskStatusApi)
      ? (t.status as ChecklistTaskStatusApi)
      : "pending",
    completed_at: (t.completed_at as string) ?? null,
    notes: (t.notes as string) ?? null,
  }));
}

export function normalizeChecklist(c: OnboardingChecklist): OnboardingChecklist {
  return {
    ...c,
    tasks: normalizeTasks(c.tasks),
  };
}

export function employeeDisplayName(c: OnboardingChecklist): string {
  return c.employee?.full_name?.trim() || `Employee ${c.employee_id.slice(0, 8)}…`;
}

export function countOverdueTasks(tasks: OnboardingTask[]): number {
  return tasks.filter((t) => t.status === "overdue").length;
}

export function doneTaskCount(tasks: OnboardingTask[]): number {
  return tasks.filter((t) => t.status === "done").length;
}

export function completionBadgeClass(rate: number): string {
  if (rate >= 80) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (rate >= 40) return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function statusBadgeClass(status: ChecklistTaskStatusApi): string {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusLabel(status: ChecklistTaskStatusApi): string {
  switch (status) {
    case "done":
      return "Completed";
    case "overdue":
      return "Overdue";
    default:
      return "Pending";
  }
}

export function daysLateWhenCompletingFromOverdue(
  task: OnboardingTask,
  completedAt: Date = new Date(),
): number | null {
  if (task.status !== "overdue" || !task.due_date) return null;
  const due = parseISO(task.due_date);
  if (!isValid(due)) return null;
  return Math.max(0, differenceInCalendarDays(completedAt, due));
}

export function isLastWorkingDayPassed(lastWorkingDay?: string | null): boolean {
  if (!lastWorkingDay) return false;
  const d = parseISO(lastWorkingDay);
  if (!isValid(d)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lw = new Date(d);
  lw.setHours(0, 0, 0, 0);
  return lw.getTime() <= today.getTime();
}

export function exitInterviewSubmitted(exitDetails: OnboardingChecklist["exit_details"]): boolean {
  const data = exitDetails?.exit_interview_data;
  if (!data || typeof data !== "object") return false;
  return Boolean((data as { completed_at?: string }).completed_at);
}

export function templateTaskCount(t: { tasks?: unknown } | null): number {
  if (!t?.tasks || !Array.isArray(t.tasks)) return 0;
  return t.tasks.length;
}

export function mapHrEmployeeRecord(raw: Record<string, unknown>): HREmployeeOption {
  return {
    id: String(raw.id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    email: String(raw.email ?? ""),
    departmentName: (raw.departmentName as string) ?? (raw.department_name as string) ?? null,
    teamName: (raw.teamName as string) ?? (raw.team_name as string) ?? null,
    jobTitle: (raw.jobTitle as string) ?? (raw.job_title as string) ?? null,
    hrStatus: raw.hrStatus as string | undefined,
  };
}
