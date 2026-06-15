/**
 * HR Employees — aligned with crm-be `HREmployeeRecord` + compensation_history rows.
 * Backend directory uses camelCase on merged user + employee_profiles fields.
 */

export type EmployeeRole = "admin" | "manager" | "employee" | "hr" | string;

/** Normalized HR status from employee_profiles.hr_status + is_active */
export type EmployeeStatus =
  | "active"
  | "inactive"
  | "on_leave"
  | "probation"
  | "archived"
  | string;

/** users.shift_type values used in app */
export type ShiftType =
  | "day_shift"
  | "night_shift"
  | "morning"
  | "evening"
  | "night"
  | "flexible"
  | "unassigned"
  | string
  | null;

/** Single employee row from GET /hr/employees (directory) or GET /hr/employees/:id */
export interface HREmployee {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  teamId: string | null;
  teamName: string | null;
  managerId?: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  shiftType: string | null;
  timezone?: string | null;
  country?: string | null;
  address?: string | null;
  employeeId?: string | null;
  dateOfJoining?: string | null;
  hrStatus?: string | null;
  currentCtc?: number | null;
  salaryComponents?: {
    basic_pct?: number;
    hra_pct?: number;
    allowance_pct?: number;
  } | null;
  skills?: string[] | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
}

/** Nested view model for drawer (derived from HREmployee — not a separate API shape) */
export interface EmployeeProfile {
  userId: string;
  designation: string;
  department: string | null;
  team: string | null;
  shiftType: ShiftType;
  joiningDate: string | null;
  currentCtc: number | null;
  hrStatus: EmployeeStatus;
  managerId: string | null;
  managerName: string | null;
  skills: string[];
  bio: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact: null | { name: string; relationship: string; phone: string };
}

/** Compensation history row — tolerate snake_case from API */
export interface CompensationHistory {
  id: string;
  employeeId: string;
  previousCtc: number | null;
  newCtc: number;
  changeReason: string | null;
  effectiveDate: string;
  changedBy: string | null;
  changedByName?: string | null;
  notes?: string | null;
  changePercentage?: number | null;
  createdAt: string;
}

export function toEmployeeProfile(emp: HREmployee): EmployeeProfile {
  return {
    userId: emp.id,
    designation: emp.jobTitle || "—",
    department: emp.departmentName,
    team: emp.teamName,
    shiftType: (emp.shiftType as ShiftType) ?? null,
    joiningDate: emp.dateOfJoining || emp.createdAt || null,
    currentCtc: emp.currentCtc ?? null,
    hrStatus: (emp.hrStatus as EmployeeStatus) || (emp.isActive ? "active" : "inactive"),
    managerId: emp.reportingManagerId ?? null,
    managerName: emp.reportingManagerName ?? null,
    skills: emp.skills ?? [],
    bio: emp.bio ?? null,
    phone: null,
    address: emp.address ?? null,
    emergencyContact: null,
  };
}
