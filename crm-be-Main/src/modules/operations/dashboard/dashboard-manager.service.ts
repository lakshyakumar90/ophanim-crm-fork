import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { USER_ROLES } from "../../../config/constants.js";
import type { AuthUser } from "../../../types/api.types.js";
import {
  nowIST,
  getTodayIST,
  getTimestampIST,
  getMonthIST,
  getYearIST,
  getStartOfMonthIST,
  getStartOfTodayIST,
  getEndOfTodayIST,
} from "../../../utils/date-utils.js";
import * as invoiceService from "../../finance/services/invoice.service.js";
import * as expenseService from "../../finance/services/expense.service.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";

import {
  tryGetDashboardStatsRPC,
  tryGetLeadAggregationsRPC,
  fetchLeadIdsWithActivities,
  fetchLeadAnalyticsRowsByIds,
  fetchLeadAnalyticsRows,
  getScopedUserIds,
  type LeadAnalyticsRow,
  type LeadAnalyticsFilters,
  type UserWiseAnalyticsFilters,
} from "./dashboard.shared.js";

export async function getManagerDashboard(authUser: AuthUser) {
  if (!authUser.teamId) {
    return {
      team: { memberCount: 0 },
      leads: { total: 0, pipeline: {} },
      tasks: { pending: 0, overdue: 0 },
      attendance: { presentToday: 0 },
    };
  }

  const today = getTodayIST();
  const overdueTimestamp = getTimestampIST();
  const startOfMonth = getStartOfMonthIST(getYearIST(), getMonthIST());
  const startOfDay = getStartOfTodayIST();
  const endOfDay = getEndOfTodayIST();

  // Get team members
  const { data: teamMembers } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("team_id", authUser.teamId);

  const memberIds = (teamMembers || []).map(
    (m: any) => (m as { id: string }).id,
  );
  memberIds.push(authUser.id);

  // Build all queries upfront
  const teamLeadsQuery = supabaseAdmin
    .from("leads")
    .select("id, status, lead_value")
    .eq("is_deleted", false)
    .in("assigned_to", memberIds);

  const pendingTasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .in("assigned_to", memberIds)
    .in("status", ["todo", "in_progress"]);

  const overdueTasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .in("assigned_to", memberIds)
    .lt("due_date", overdueTimestamp)
    .neq("status", "completed")
    .neq("status", "cancelled");

  const attendanceQuery = supabaseAdmin
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("date", today)
    .in("user_id", memberIds)
    .in("status", ["present", "late"]);

  const newLeadsThisMonthQuery = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .in("assigned_to", memberIds)
    .gte("created_at", startOfMonth);

  const dueTodayQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .in("assigned_to", memberIds)
    .gte("due_date", startOfDay)
    .lte("due_date", endOfDay)
    .neq("status", "completed");

  // Execute all queries in parallel
  const [
    { data: teamLeads },
    { count: pendingTasks },
    { count: overdueTasks },
    { count: presentToday },
    { count: newLeadsThisMonth },
    { count: dueToday },
    invoiceStats,
    expenseStats,
  ] = await Promise.all([
    teamLeadsQuery,
    pendingTasksQuery,
    overdueTasksQuery,
    attendanceQuery,
    newLeadsThisMonthQuery,
    dueTodayQuery,
    invoiceService.getInvoiceStats(authUser.departmentId || undefined),
    expenseService.getExpenseStats(authUser.departmentId || undefined),
  ]);

  const leadPipeline: Record<string, number> = {};
  let totalRevenue = 0;
  for (const lead of teamLeads || []) {
    const l = lead as { status: string; lead_value?: number | null };
    leadPipeline[l.status] = (leadPipeline[l.status] || 0) + 1;
    if (l.status === 'won' && l.lead_value) {
      totalRevenue += l.lead_value;
    }
  }

  return {
    team: {
      memberCount: memberIds.length,
    },
    leads: {
      total: teamLeads?.length || 0,
      newThisMonth: newLeadsThisMonth || 0,
      pipeline: leadPipeline,
    },
    tasks: {
      total: (pendingTasks || 0) + (overdueTasks || 0),
      pending: pendingTasks || 0,
      overdue: overdueTasks || 0,
      dueToday: dueToday || 0,
    },
    attendance: {
      presentToday: presentToday || 0,
      totalMembers: memberIds.length,
    },
    revenue: {
      total: totalRevenue,
    },
    invoices: {
      overdueCount: invoiceStats.overdue_count,
    },
    expenses: {
      pendingCount: expenseStats.pending_count,
    },
  };
}

/**
 * Get employee dashboard stats
 * OPTIMIZED: Parallel queries for personal stats
 */
export async function getEmployeeDashboard(userId: string) {
  const todayDate = getTodayIST();
  const overdueTimestamp = getTimestampIST();
  const startOfDay = getStartOfTodayIST();
  const endOfDay = getEndOfTodayIST();
  const startOfMonth = getStartOfMonthIST(getYearIST(), getMonthIST()).split(
    "T",
  )[0];

  // Build all queries upfront
  const myLeadsQuery = supabaseAdmin
    .from("leads")
    .select("id, status, lead_value")
    .eq("is_deleted", false)
    .eq("assigned_to", userId);

  const pendingTasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("assigned_to", userId)
    .in("status", ["todo", "in_progress"]);

  const overdueTasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("assigned_to", userId)
    .lt("due_date", overdueTimestamp)
    .neq("status", "completed")
    .neq("status", "cancelled");

  const dueTodayQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("assigned_to", userId)
    .gte("due_date", startOfDay)
    .lte("due_date", endOfDay)
    .neq("status", "completed");

  const daysPresentQuery = supabaseAdmin
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("date", startOfMonth)
    .in("status", ["present", "late", "half_day"]);

  const todayAttendanceQuery = supabaseAdmin
    .from("attendance")
    .select("clock_in_time, clock_out_time, status")
    .eq("user_id", userId)
    .eq("date", todayDate)
    .single();

  const myExpensesQuery = supabaseAdmin
    .from("expenses")
    .select("status, amount")
    .eq("submitted_by", userId);

  const newLeadsThisMonthQuery = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("assigned_to", userId)
    .gte("created_at", startOfMonth);

  // Execute ALL queries in parallel
  const [
    { data: myLeads },
    { count: pendingTasks },
    { count: overdueTasks },
    { count: dueToday },
    { count: daysPresent },
    { data: todayAttendance },
    { data: myExpenses },
    { count: newLeadsThisMonth },
  ] = await Promise.all([
    myLeadsQuery,
    pendingTasksQuery,
    overdueTasksQuery,
    dueTodayQuery,
    daysPresentQuery,
    todayAttendanceQuery,
    myExpensesQuery,
    newLeadsThisMonthQuery,
  ]);

  const leadPipeline: Record<string, number> = {};
  let totalRevenue = 0;
  for (const lead of myLeads || []) {
    const l = lead as { status: string; lead_value?: number | null };
    leadPipeline[l.status] = (leadPipeline[l.status] || 0) + 1;
    if (l.status === 'won' && l.lead_value) {
      totalRevenue += l.lead_value;
    }
  }

  const myTotalExpenses = (myExpenses || []).reduce(
    (sum, e: any) => sum + (Number(e.amount) || 0),
    0,
  );
  const myPendingExpenses = (myExpenses || []).filter(
    (e: any) => e.status === "pending",
  ).length;

  return {
    leads: {
      total: myLeads?.length || 0,
      newThisMonth: newLeadsThisMonth || 0,
      pipeline: leadPipeline,
    },
    tasks: {
      total: (pendingTasks || 0) + (overdueTasks || 0),
      pending: pendingTasks || 0,
      overdue: overdueTasks || 0,
      dueToday: dueToday || 0,
    },
    attendance: {
      daysThisMonth: daysPresent || 0,
      today: todayAttendance || null,
    },
    revenue: {
      total: totalRevenue,
    },
    expenses: {
      myTotal: myTotalExpenses,
      myPending: myPendingExpenses,
    },
  };
}
