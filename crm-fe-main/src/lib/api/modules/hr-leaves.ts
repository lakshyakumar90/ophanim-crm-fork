import { api } from "@/lib/api";
import { fetchHrEmployees as fetchCanonicalHrEmployees } from "@/lib/hr-employee-api";
import * as sq from "@/lib/supabase-queries";
import { smartRead, type QueryStrategy } from "@/lib/smart-read";
import type {
  HrEmployeeDirectoryRow,
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveStatsDto,
  LeaveTypeDto,
  OnLeaveTodayEntryDto,
} from "@/types/hr-leaves";

type Envelope<T> = { data: T };

type SupabaseLeaveRow = Partial<LeaveRequestDto> & {
  user?: {
    id?: string;
    fullName?: string;
    full_name?: string;
    email?: string;
  } | null;
  leaveType?: {
    id?: string;
    name?: string;
  } | null;
  leave_type?: {
    id?: string;
    name?: string;
  } | null;
};

function normalizeLeaveRequest(row: SupabaseLeaveRow): LeaveRequestDto {
  const user = row.user;
  const leaveType = row.leaveType ?? row.leave_type;

  return {
    ...(row as LeaveRequestDto),
    userId: row.userId ?? user?.id ?? "",
    leaveTypeId: row.leaveTypeId ?? leaveType?.id ?? "",
    employeeName:
      row.employeeName ??
      user?.fullName ??
      user?.full_name ??
      "Employee",
    employeeEmail: row.employeeEmail ?? user?.email ?? undefined,
    leaveTypeName: row.leaveTypeName ?? leaveType?.name ?? "Leave",
  };
}

function unwrap<T>(res: { data: Envelope<T> }): T {
  return res.data.data;
}

const HR_LEAVE_READ_STRATEGY: Record<string, QueryStrategy> = {
  fetchLeaveTypes: "supabase-with-fallback",
  fetchLeaveTypesAdmin: "backend-only",
  fetchLeaveStats: "backend-only",
  fetchOnLeaveToday: "backend-only",
  fetchLeaveRequests: "supabase-with-fallback",
  fetchPendingLeaves: "backend-only",
  fetchLeaveBalances: "supabase-with-fallback",
} as const;

export async function fetchLeaveTypes(): Promise<LeaveTypeDto[]> {
  return smartRead({
    routeKey: "hr.leave.fetchLeaveTypes",
    strategy: HR_LEAVE_READ_STRATEGY.fetchLeaveTypes,
    supabaseQuery: () => sq.getLeaveTypes() as Promise<LeaveTypeDto[]>,
    backendQuery: async () => unwrap(await api.get<Envelope<LeaveTypeDto[]>>("/hr/leave-types")),
  });
}

export async function fetchLeaveTypesAdmin(): Promise<LeaveTypeDto[]> {
  const res = await api.get<Envelope<LeaveTypeDto[]>>("/hr/leave-types/admin");
  return unwrap(res);
}

export async function createLeaveType(body: {
  name: string;
  description?: string;
  daysAllowed: number;
  isPaid?: boolean;
  carryForward?: boolean;
}): Promise<LeaveTypeDto> {
  const res = await api.post<Envelope<LeaveTypeDto>>("/hr/leave-types", body);
  return unwrap(res);
}

export async function updateLeaveType(
  id: string,
  body: Partial<{
    name: string;
    description: string | null;
    daysAllowed: number;
    isActive: boolean;
    isPaid: boolean;
    carryForward: boolean;
  }>,
): Promise<LeaveTypeDto> {
  const res = await api.patch<Envelope<LeaveTypeDto>>(`/hr/leave-types/${id}`, body);
  return unwrap(res);
}

export async function fetchLeaveStats(): Promise<LeaveStatsDto> {
  return smartRead({
    routeKey: "hr.leave.fetchLeaveStats",
    strategy: HR_LEAVE_READ_STRATEGY.fetchLeaveStats,
    backendQuery: async () => unwrap(await api.get<Envelope<LeaveStatsDto>>("/hr/leave-stats")),
  });
}

export async function fetchOnLeaveToday(): Promise<OnLeaveTodayEntryDto[]> {
  return smartRead({
    routeKey: "hr.leave.fetchOnLeaveToday",
    strategy: HR_LEAVE_READ_STRATEGY.fetchOnLeaveToday,
    backendQuery: async () =>
      unwrap(await api.get<Envelope<OnLeaveTodayEntryDto[]>>("/hr/on-leave-today")),
  });
}

export async function fetchLeaveRequests(params?: {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<LeaveRequestDto[]> {
  return smartRead({
    routeKey: "hr.leave.fetchLeaveRequests",
    strategy: HR_LEAVE_READ_STRATEGY.fetchLeaveRequests,
    supabaseQuery: async () => {
      const rows = (await sq.getLeaveRequests({
        userId: params?.userId,
        status: params?.status,
      })) as SupabaseLeaveRow[];
      return rows.map(normalizeLeaveRequest);
    },
    backendQuery: async () => unwrap(await api.get<Envelope<LeaveRequestDto[]>>("/hr/leaves", { params })),
  });
}

export async function fetchPendingLeaves(): Promise<LeaveRequestDto[]> {
  return smartRead({
    routeKey: "hr.leave.fetchPendingLeaves",
    strategy: HR_LEAVE_READ_STRATEGY.fetchPendingLeaves,
    backendQuery: async () => unwrap(await api.get<Envelope<LeaveRequestDto[]>>("/hr/leaves/pending")),
  });
}

export async function fetchLeaveBalances(
  userId: string,
  year?: number,
): Promise<LeaveBalanceDto[]> {
  return smartRead({
    routeKey: "hr.leave.fetchLeaveBalances",
    strategy: HR_LEAVE_READ_STRATEGY.fetchLeaveBalances,
    supabaseQuery: () => sq.getLeaveBalances(userId, year) as Promise<LeaveBalanceDto[]>,
    backendQuery: async () =>
      unwrap(
        await api.get<Envelope<LeaveBalanceDto[]>>(`/hr/leaves/balances/${userId}`, {
          params: year ? { year } : undefined,
        }),
      ),
  });
}

export async function createLeaveOnBehalf(body: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  targetUserId: string;
}): Promise<LeaveRequestDto> {
  const res = await api.post<Envelope<LeaveRequestDto>>("/hr/leaves", body);
  return unwrap(res);
}

export async function approveLeave(id: string, notes?: string): Promise<LeaveRequestDto> {
  const res = await api.post<Envelope<LeaveRequestDto>>(`/hr/leaves/${id}/approve`, {
    notes,
  });
  return unwrap(res);
}

export async function rejectLeave(id: string, notes?: string): Promise<LeaveRequestDto> {
  const res = await api.post<Envelope<LeaveRequestDto>>(`/hr/leaves/${id}/reject`, {
    notes,
  });
  return unwrap(res);
}

export async function fetchHrEmployees(): Promise<HrEmployeeDirectoryRow[]> {
  // Canonical source lives in hr-employee-api; keep this wrapper for compatibility.
  return (await fetchCanonicalHrEmployees()) as HrEmployeeDirectoryRow[];
}

/** Approved leaves for calendar — filter client-side from full list or dedicated fetch */
export async function fetchApprovedLeavesForCalendar(): Promise<LeaveRequestDto[]> {
  return fetchLeaveRequests({ status: "approved" });
}
