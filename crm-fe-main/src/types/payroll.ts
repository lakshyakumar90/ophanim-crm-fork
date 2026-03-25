/** Payroll module — aligned with /api/v1/payroll responses */

export type PayrollRunStatus = "draft" | "submitted" | "approved" | "disbursed";

export interface PayrollUserRef {
  id: string;
  full_name: string;
}

export interface PayrollRun {
  id: string;
  month: string;
  initiated_by: string;
  approved_by: string | null;
  status: PayrollRunStatus;
  total_gross: number | string | null;
  total_deductions: number | string | null;
  total_net: number | string | null;
  notes?: string | null;
  is_correction: boolean;
  original_run_id?: string | null;
  cohort_name?: string | null;
  employee_selection?: PayrollEmployeeSelection;
  created_at: string;
  updated_at?: string | null;
  disbursed_at?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  initiated_by_user?: PayrollUserRef | null;
  approved_by_user?: PayrollUserRef | null;
}

export type PayrollEmployeeSelection =
  | { type: "all" }
  | { type: "departments"; departments: string[] }
  | { type: "teams"; teams: string[] }
  | { type: "manual"; employee_ids: string[] };

export interface AttendanceSummary {
  workingDays?: number;
  presentDays?: number;
  halfDays?: number;
  lopDays?: number;
  /** legacy keys */
  working_days?: number;
  present_days?: number;
  half_days?: number;
  lop_days?: number;
}

export interface PayrollRecordEditAudit {
  field?: string;
  old_earnings?: Record<string, number>;
  old_deductions?: Record<string, number>;
  new_earnings?: Record<string, number>;
  new_deductions?: Record<string, number>;
  edited_by?: string;
  reason?: string;
  timestamp?: string;
}

export interface PayrollEarnings {
  basic?: number;
  hra?: number;
  allowances?: number;
  bonus?: number;
  incentive?: number;
  [key: string]: number | undefined;
}

export interface PayrollDeductions {
  pf?: number;
  tds?: number;
  esi?: number;
  lop?: number;
  advance_recovery?: number;
  manual?: number;
  [key: string]: number | undefined;
}

export interface PayrollRecordEmployee {
  id: string;
  full_name: string;
  email: string | null;
  job_title?: string | null;
}

export interface PayrollRecord {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  month: string;
  earnings: PayrollEarnings;
  gross_pay: number | string;
  deductions: PayrollDeductions;
  total_deductions: number | string;
  net_pay: number | string;
  attendance_summary?: AttendanceSummary | null;
  edits?: PayrollRecordEditAudit[] | null;
  created_at?: string;
  updated_at?: string | null;
  employee?: PayrollRecordEmployee | null;
}

export type SalaryBandComponentsTemplate =
  | {
      basic_pct?: number;
      hra_pct?: number;
      allowance_pct?: number;
    }
  | Array<{
      name?: string;
      type?: string;
      percentage_of_basic?: number | null;
      fixed_amount?: number | null;
    }>
  | Record<string, unknown>
  | null;

export interface SalaryBand {
  id: string;
  designation: string;
  department: string | null;
  min_ctc: number | string;
  max_ctc: number | string;
  components_template: SalaryBandComponentsTemplate;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface IncrementProposal {
  id: string;
  employee_id: string;
  proposed_by: string;
  current_ctc: number | null;
  proposed_ctc: number;
  effective_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | string;
  approved_by?: string | null;
  created_at?: string;
  updated_at?: string | null;
  employee?: { id: string; full_name: string } | null;
  proposed_by_user?: { id: string; full_name: string } | null;
}

export interface PayrollAnalyticsAnomaly {
  employee_id: string;
  current_gross: number;
  previous_gross: number;
  change_pct: number;
  month: string;
}

export interface PayrollAnalyticsMonthlyTrendRow {
  id: string;
  month: string;
  status: PayrollRunStatus;
  total_gross: number | null;
  total_net: number | null;
  total_deductions?: number | null;
}

export interface PayrollAnalytics {
  monthlyTrend: PayrollAnalyticsMonthlyTrendRow[];
  departmentCosts: Record<string, number>;
  anomalies: PayrollAnalyticsAnomaly[];
}

export interface HrEmployeeOption {
  id: string;
  fullName: string;
  full_name?: string;
  email: string;
  departmentId?: string | null;
  teamId?: string | null;
  departmentName?: string | null;
  department_name?: string | null;
  teamName?: string | null;
  team_name?: string | null;
  currentCtc?: number | null;
  current_ctc?: number | null;
  jobTitle?: string | null;
  job_title?: string | null;
}
