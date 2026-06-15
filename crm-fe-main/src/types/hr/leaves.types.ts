/** Aligned with crm-be leave.service + leave_summary / leave_requests */

export type LeaveRequestStatus =
  | "pending"
  | "manager_approved"
  | "approved"
  | "rejected"
  | "cancelled";

export interface LeaveTypeDto {
  id: string;
  name: string;
  description: string | null;
  daysAllowed: number;
  isPaid: boolean;
  isActive: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
}

export interface LeaveRequestDto {
  id: string;
  userId: string;
  employeeName?: string;
  employeeEmail?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: LeaveRequestStatus;
  managerId?: string | null;
  managerName?: string;
  managerApprovedAt?: string | null;
  managerNotes?: string | null;
  hrApprovedBy?: string | null;
  hrApproverName?: string;
  hrApprovedAt?: string | null;
  hrNotes?: string | null;
  createdAt: string;
  overlapWarning?: string | null;
}

export interface LeaveBalanceDto {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface LeaveStatsDto {
  pending: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  onLeaveToday: number;
}

export interface OnLeaveTodayEntryDto {
  userId: string;
  userName: string;
}

export interface HrEmployeeDirectoryRow {
  id: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  departmentId?: string | null;
  department_id?: string | null;
  departmentName?: string | null;
  department_name?: string | null;
  jobTitle?: string | null;
  job_title?: string | null;
  teamId?: string | null;
  team_id?: string | null;
  teamName?: string | null;
  team_name?: string | null;
  role?: string;
}
