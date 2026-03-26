import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";

// ====================
// TYPES
// ====================

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  daysAllowed: number;
  isPaid: boolean;
  isActive: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
}

export interface LeaveRequest {
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
  status:
    | "pending"
    | "manager_approved"
    | "approved"
    | "rejected"
    | "cancelled";
  managerId: string | null;
  managerName?: string;
  managerApprovedAt: string | null;
  managerNotes: string | null;
  hrApprovedBy: string | null;
  hrApproverName?: string;
  hrApprovedAt: string | null;
  hrNotes: string | null;
  createdAt: string;
  overlapWarning?: string | null;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

function canViewOrgLeaves(authUser: AuthUser): boolean {
  if (authUser.role === USER_ROLES.ADMIN) return true;
  const perms = authUser.permissions || [];
  return (
    perms.includes("crm:admin") ||
    perms.includes("hr:view") ||
    perms.includes("hr:manage") ||
    perms.includes("hr:leave_view") ||
    perms.includes("hr:leave_manage") ||
    perms.includes("hr:leave_approve")
  );
}

export async function getApprovedLeavesForCalendar(
  filters: { startDate?: string; endDate?: string },
  authUser: AuthUser,
): Promise<LeaveRequest[]> {
  let query = supabaseAdmin
    .from("leave_summary")
    .select("*")
    .eq("status", "approved");

  if (filters.startDate) {
    query = query.gte("end_date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("start_date", filters.endDate);
  }

  const showOrgWide = canViewOrgLeaves(authUser);

  if (!showOrgWide) {
    if (authUser.role === USER_ROLES.EMPLOYEE) {
      query = query.eq("user_id", authUser.id);
    } else {
      let visibleUserIds: string[] = [authUser.id];
      if (authUser.teamId) {
        const { data: members, error: membersErr } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("team_id", authUser.teamId)
          .eq("is_active", true);

        if (membersErr) {
          throw new ApiError(ERROR_CODES.DATABASE_ERROR, membersErr.message);
        }

        visibleUserIds = Array.from(
          new Set([authUser.id, ...(members || []).map((m: any) => m.id)]),
        );
      }

      query = query.in("user_id", visibleUserIds);
    }
  }

  const { data, error } = await query.order("start_date", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lr: any) => ({
    id: lr.id,
    userId: lr.user_id,
    employeeName: lr.employee_name,
    employeeEmail: lr.employee_email,
    leaveTypeId: lr.leave_type_id,
    leaveTypeName: lr.leave_type,
    startDate: lr.start_date,
    endDate: lr.end_date,
    totalDays: parseFloat(lr.total_days),
    reason: lr.reason,
    status: lr.status,
    managerId: lr.manager_id,
    managerName: lr.manager_name,
    managerApprovedAt: lr.manager_approved_at,
    managerNotes: lr.manager_notes,
    hrApprovedBy: lr.hr_approved_by,
    hrApproverName: lr.hr_approver_name,
    hrApprovedAt: lr.hr_approved_at,
    hrNotes: lr.hr_notes,
    createdAt: lr.created_at,
  }));
}

// ====================
// LEAVE TYPES
// ====================

/**
 * Get all active leave types
 */
export async function getLeaveTypes(): Promise<LeaveType[]> {
  const { data, error } = await supabaseAdmin
    .from("leave_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lt: any) => ({
    id: lt.id,
    name: lt.name,
    description: lt.description,
    daysAllowed: lt.days_allowed,
    isPaid: lt.is_paid,
    isActive: lt.is_active,
    carryForward: lt.carry_forward,
    maxCarryForwardDays: lt.max_carry_forward_days,
  }));
}

/**
 * Get all leave types (including inactive) for HR settings
 */
export async function getLeaveTypesAdmin(): Promise<LeaveType[]> {
  const { data, error } = await supabaseAdmin
    .from("leave_types")
    .select("*")
    .order("name");

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lt: any) => ({
    id: lt.id,
    name: lt.name,
    description: lt.description,
    daysAllowed: lt.days_allowed,
    isPaid: lt.is_paid,
    isActive: lt.is_active,
    carryForward: lt.carry_forward,
    maxCarryForwardDays: lt.max_carry_forward_days,
  }));
}

/**
 * Create a new leave type (HR)
 */
export async function createLeaveType(input: {
  name: string;
  description?: string;
  daysAllowed: number;
  isPaid?: boolean;
  carryForward?: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("leave_types")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      days_allowed: input.daysAllowed,
      is_paid: input.isPaid ?? true,
      is_active: true,
      carry_forward: input.carryForward ?? false,
      max_carry_forward_days: 0,
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    daysAllowed: data.days_allowed,
    isPaid: data.is_paid,
    isActive: data.is_active,
    carryForward: data.carry_forward,
    maxCarryForwardDays: data.max_carry_forward_days,
  };
}

/**
 * Update an existing leave type (HR)
 */
export async function updateLeaveType(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    daysAllowed?: number;
    isActive?: boolean;
    isPaid?: boolean;
    carryForward?: boolean;
  },
): Promise<LeaveType> {
  const updates: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    updates.name = patch.name.trim();
  }
  if (patch.description !== undefined) {
    updates.description =
      patch.description === null || patch.description === ""
        ? null
        : String(patch.description).trim();
  }
  if (patch.daysAllowed !== undefined) {
    updates.days_allowed = patch.daysAllowed;
  }
  if (patch.isActive !== undefined) {
    updates.is_active = patch.isActive;
  }
  if (patch.isPaid !== undefined) {
    updates.is_paid = patch.isPaid;
  }
  if (patch.carryForward !== undefined) {
    updates.carry_forward = patch.carryForward;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "No valid fields to update",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("leave_types")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("Leave type");
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    daysAllowed: data.days_allowed,
    isPaid: data.is_paid,
    isActive: data.is_active,
    carryForward: data.carry_forward,
    maxCarryForwardDays: data.max_carry_forward_days,
  };
}

// ====================
// LEAVE BALANCES
// ====================

/**
 * Get leave balances for a user
 */
export async function getUserLeaveBalances(
  userId: string,
  year?: number,
): Promise<LeaveBalance[]> {
  const targetYear = year || new Date().getFullYear();

  const { data, error } = await supabaseAdmin
    .from("leave_balances")
    .select(
      `
      *,
      leave_types:leave_type_id (name)
    `,
    )
    .eq("user_id", userId)
    .eq("year", targetYear);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lb: any) => ({
    id: lb.id,
    userId: lb.user_id,
    leaveTypeId: lb.leave_type_id,
    leaveTypeName: lb.leave_types?.name,
    year: lb.year,
    totalDays: parseFloat(lb.total_days),
    usedDays: parseFloat(lb.used_days),
    remainingDays: parseFloat(lb.remaining_days),
  }));
}

// ====================
// LEAVE REQUESTS
// ====================

/**
 * Get leave requests with filters
 */
export async function getLeaveRequests(
  filters: {
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  authUser: AuthUser,
): Promise<LeaveRequest[]> {
  let query = supabaseAdmin.from("leave_summary").select("*");

  // Role-based filtering
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    // Employees can only see their own requests
    query = query.eq("user_id", authUser.id);
  } else if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.startDate) {
    query = query.gte("start_date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("end_date", filters.endDate);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lr: any) => ({
    id: lr.id,
    userId: lr.user_id,
    employeeName: lr.employee_name,
    employeeEmail: lr.employee_email,
    leaveTypeId: lr.leave_type_id,
    leaveTypeName: lr.leave_type,
    startDate: lr.start_date,
    endDate: lr.end_date,
    totalDays: parseFloat(lr.total_days),
    reason: lr.reason,
    status: lr.status,
    managerId: lr.manager_id,
    managerName: lr.manager_name,
    managerApprovedAt: lr.manager_approved_at,
    managerNotes: lr.manager_notes,
    hrApprovedBy: lr.hr_approved_by,
    hrApproverName: lr.hr_approver_name,
    hrApprovedAt: lr.hr_approved_at,
    hrNotes: lr.hr_notes,
    createdAt: lr.created_at,
  }));
}

/**
 * Get pending leave requests for HR
 */
export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  const { data, error } = await supabaseAdmin
    .from("leave_summary")
    .select("*")
    .in("status", ["pending", "manager_approved"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((lr: any) => ({
    id: lr.id,
    userId: lr.user_id,
    employeeName: lr.employee_name,
    employeeEmail: lr.employee_email,
    leaveTypeId: lr.leave_type_id,
    leaveTypeName: lr.leave_type,
    startDate: lr.start_date,
    endDate: lr.end_date,
    totalDays: parseFloat(lr.total_days),
    reason: lr.reason,
    status: lr.status,
    managerId: lr.manager_id,
    managerName: lr.manager_name,
    managerApprovedAt: lr.manager_approved_at,
    managerNotes: lr.manager_notes,
    hrApprovedBy: lr.hr_approved_by,
    hrApproverName: lr.hr_approver_name,
    hrApprovedAt: lr.hr_approved_at,
    hrNotes: lr.hr_notes,
    createdAt: lr.created_at,
  }));
}

/**
 * Create leave request
 */
export async function createLeaveRequest(
  input: {
    leaveTypeId?: string;
    startDate: string;
    endDate: string;
    reason?: string;
  },
  userId: string,
  options?: { skipBalanceCheck?: boolean },
): Promise<LeaveRequest> {
  // Validate dates
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  if (end < start) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "End date cannot be before start date",
    );
  }

  // Check leave balance (skip if no leave type specified)
  let balance;
  if (input.leaveTypeId) {
    const balances = await getUserLeaveBalances(userId, start.getFullYear());
    balance = balances.find((b) => b.leaveTypeId === input.leaveTypeId);

    const totalDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (
      !options?.skipBalanceCheck &&
      balance &&
      balance.remainingDays < totalDays
    ) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        `Insufficient leave balance. You have ${balance.remainingDays} days remaining.`,
      );
    }
  }

  // Check for overlapping requests
  const { data: existing } = await supabaseAdmin
    .from("leave_requests")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "manager_approved", "approved"])
    .or(`start_date.lte.${input.endDate},end_date.gte.${input.startDate}`);

  if (existing && existing.length > 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "You already have a leave request for overlapping dates",
    );
  }

  let overlapWarning: string | null = null;
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("team_id")
      .eq("id", userId)
      .single();
    if (userRow?.team_id) {
      const { data: teamApproved } = await supabaseAdmin
        .from("leave_summary")
        .select("employee_name")
        .eq("team_id", userRow.team_id)
        .eq("status", "approved")
        .neq("user_id", userId)
        .lte("start_date", input.endDate)
        .gte("end_date", input.startDate)
        .limit(3);
      if (teamApproved && teamApproved.length > 0) {
        overlapWarning = `Team overlap warning: ${teamApproved.length} teammate(s) are already approved for overlapping dates.`;
      }
    }
  } catch {
    overlapWarning = null;
  }

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .insert({
      user_id: userId,
      leave_type_id: input.leaveTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    userId: data.user_id,
    leaveTypeId: data.leave_type_id,
    startDate: data.start_date,
    endDate: data.end_date,
    totalDays: parseFloat(data.total_days),
    reason: data.reason,
    status: data.status,
    managerId: data.manager_id,
    managerApprovedAt: data.manager_approved_at,
    managerNotes: data.manager_notes,
    hrApprovedBy: data.hr_approved_by,
    hrApprovedAt: data.hr_approved_at,
    hrNotes: data.hr_notes,
    createdAt: data.created_at,
    overlapWarning,
  };
}

/**
 * Approve leave request (HR)
 */
export async function approveLeaveRequest(
  requestId: string,
  hrUserId: string,
  notes?: string,
): Promise<LeaveRequest> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("leave_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();

  if (existingError || !existing) {
    throw ApiError.notFound("Leave request");
  }

  if (!["pending", "manager_approved"].includes(existing.status)) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Cannot approve leave request in '${existing.status}' status`,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .update({
      status: "approved",
      hr_approved_by: hrUserId,
      hr_approved_at: new Date().toISOString(),
      hr_notes: notes,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    userId: data.user_id,
    leaveTypeId: data.leave_type_id,
    startDate: data.start_date,
    endDate: data.end_date,
    totalDays: parseFloat(data.total_days),
    reason: data.reason,
    status: data.status,
    managerId: data.manager_id,
    managerApprovedAt: data.manager_approved_at,
    managerNotes: data.manager_notes,
    hrApprovedBy: data.hr_approved_by,
    hrApprovedAt: data.hr_approved_at,
    hrNotes: data.hr_notes,
    createdAt: data.created_at,
  };
}

/**
 * Reject leave request (HR)
 */
export async function rejectLeaveRequest(
  requestId: string,
  hrUserId: string,
  notes?: string,
): Promise<LeaveRequest> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("leave_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();

  if (existingError || !existing) {
    throw ApiError.notFound("Leave request");
  }

  if (!["pending", "manager_approved"].includes(existing.status)) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      `Cannot reject leave request in '${existing.status}' status`,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .update({
      status: "rejected",
      hr_approved_by: hrUserId,
      hr_approved_at: new Date().toISOString(),
      hr_notes: notes || "Request rejected",
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return {
    id: data.id,
    userId: data.user_id,
    leaveTypeId: data.leave_type_id,
    startDate: data.start_date,
    endDate: data.end_date,
    totalDays: parseFloat(data.total_days),
    reason: data.reason,
    status: data.status,
    managerId: data.manager_id,
    managerApprovedAt: data.manager_approved_at,
    managerNotes: data.manager_notes,
    hrApprovedBy: data.hr_approved_by,
    hrApprovedAt: data.hr_approved_at,
    hrNotes: data.hr_notes,
    createdAt: data.created_at,
  };
}

/**
 * Cancel leave request (by employee)
 */
export async function cancelLeaveRequest(
  requestId: string,
  userId: string,
): Promise<void> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("leave_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw ApiError.notFound("Leave request");
  }

  if (existing.status === "approved") {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Cannot cancel an approved leave request. Contact HR.",
    );
  }

  const { error } = await supabaseAdmin
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Get leave statistics for HR dashboard
 */
export async function getLeaveStats(): Promise<{
  pending: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  onLeaveToday: number;
}> {
  const today = new Date().toISOString().split("T")[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  // Pending count
  const { count: pendingCount } = await supabaseAdmin
    .from("leave_requests")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "manager_approved"]);

  // Approved this month
  const { count: approvedCount } = await supabaseAdmin
    .from("leave_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .gte("hr_approved_at", startOfMonthStr);

  // Rejected this month
  const { count: rejectedCount } = await supabaseAdmin
    .from("leave_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "rejected")
    .gte("hr_approved_at", startOfMonthStr);

  // On leave today
  const { count: onLeaveCount } = await supabaseAdmin
    .from("leave_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .lte("start_date", today)
    .gte("end_date", today);

  return {
    pending: pendingCount || 0,
    approvedThisMonth: approvedCount || 0,
    rejectedThisMonth: rejectedCount || 0,
    onLeaveToday: onLeaveCount || 0,
  };
}
