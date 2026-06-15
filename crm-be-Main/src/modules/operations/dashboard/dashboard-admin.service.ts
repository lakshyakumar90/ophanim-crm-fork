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
import { getHighPriorityAlerts } from "./dashboard-lead-analytics.service.js";
import {
  getLeadTrendData,
  getRevenueTrendData,
  getProjectStatusData,
  getDepartmentPerformance,
  getTopPerformers,
} from "./dashboard-revenue.service.js";

/**
 * Get admin dashboard stats
 * OPTIMIZED: Tries PostgreSQL RPC function first (single DB call)
 * Falls back to parallel queries if RPC not available
 */
export async function getAdminDashboard(departmentId?: string) {
  const year = getYearIST();
  const month = getMonthIST();
  const startOfMonth = getStartOfMonthIST(year, month);
  const today = getTodayIST();
  const overdueTimestamp = getTimestampIST();

  // Try RPC-based approach first (most efficient - single DB call for basic stats)
  const [rpcStats, rpcLeadAgg, invoiceStats, expenseStats, projectStats] =
    await Promise.all([
      tryGetDashboardStatsRPC(departmentId, startOfMonth, today, overdueTimestamp),
      tryGetLeadAggregationsRPC(departmentId),
      invoiceService.getInvoiceStats(departmentId),
      expenseService.getExpenseStats(departmentId),
      getProjectStatusData(),
    ]);

  // If RPC succeeded, use those results
  if (rpcStats && rpcLeadAgg) {
    return {
      users: {
        total: rpcStats.total_users || 0,
        active: rpcStats.active_users || 0,
      },
      leads: {
        total: rpcStats.total_leads || 0,
        newThisMonth: rpcStats.new_leads_this_month || 0,
        wonThisMonth: rpcStats.won_leads_this_month || 0,
        pipeline: rpcLeadAgg.pipeline || {},
        sources: rpcLeadAgg.sources || {},
      },
      projects: projectStats,
      revenue: {
        thisMonth: rpcStats.monthly_revenue || 0,
        total: invoiceStats.total_revenue,
      },
      tasks: {
        total: rpcStats.total_tasks || 0,
        pending: rpcStats.pending_tasks || 0,
        overdue: rpcStats.overdue_tasks || 0,
      },
      attendance: {
        presentToday: rpcStats.present_today || 0,
      },
      invoices: {
        overdueCount: invoiceStats.overdue_count,
      },
      expenses: {
        pendingCount: expenseStats.pending_count,
      },
    };
  }

  // FALLBACK: Use parallel queries if RPC not available
  // Pre-fetch team and user IDs in parallel if department filter is active
  let teamIdsInDept: string[] = [];
  let userIdsForAttendance: string[] = [];

  if (departmentId) {
    const [teamsResult, usersResult] = await Promise.all([
      supabaseAdmin.from("teams").select("id").eq("department_id", departmentId),
      supabaseAdmin
        .from("users")
        .select("id, teams!inner(department_id)")
        .eq("teams.department_id", departmentId),
    ]);
    teamIdsInDept = (teamsResult.data || []).map((t: any) => t.id);
    userIdsForAttendance = (usersResult.data || []).map((u: any) => u.id);
  }

  // Build all queries upfront
  let usersQuery = supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true });
  if (departmentId && teamIdsInDept.length > 0) {
    usersQuery = usersQuery.in("team_id", teamIdsInDept);
  }

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);
  if (departmentId) {
    leadsQuery = leadsQuery.or(
      `department_id.eq.${departmentId},department_id.is.null`,
    );
  }

  let tasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);
  if (departmentId) {
    tasksQuery = tasksQuery.or(
      `department_id.eq.${departmentId},department_id.is.null`,
    );
  }

  let activeUsersQuery = supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (departmentId && teamIdsInDept.length > 0) {
    activeUsersQuery = activeUsersQuery.in("team_id", teamIdsInDept);
  }

  let leadsDataQuery = supabaseAdmin
    .from("leads")
    .select("status, source")
    .eq("is_deleted", false);
  if (departmentId) {
    leadsDataQuery = leadsDataQuery.or(
      `department_id.eq.${departmentId},department_id.is.null`,
    );
  }

  let newLeadsQuery = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .gte("created_at", startOfMonth);
  if (departmentId) {
    newLeadsQuery = newLeadsQuery.or(
      `department_id.eq.${departmentId},department_id.is.null`,
    );
  }

  let wonLeadsQuery = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "won")
    .gte("converted_at", startOfMonth);
  if (departmentId) {
    wonLeadsQuery = wonLeadsQuery.or(
      `department_id.eq.${departmentId},department_id.is.null`,
    );
  }

  let revenueQuery = supabaseAdmin
    .from("leads")
    .select("lead_value")
    .eq("status", "won")
    .gte("converted_at", startOfMonth);
  if (departmentId) {
    revenueQuery = revenueQuery.eq("department_id", departmentId);
  }

  let pendingTasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .in("status", ["todo", "in_progress"]);
  if (departmentId) {
    pendingTasksQuery = pendingTasksQuery.eq("department_id", departmentId);
  }

  let overdueTasksQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false)
    .lt("due_date", overdueTimestamp)
    .neq("status", "completed")
    .neq("status", "cancelled");
  if (departmentId) {
    overdueTasksQuery = overdueTasksQuery.eq("department_id", departmentId);
  }

  let attendanceQuery = supabaseAdmin
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("date", today)
    .in("status", ["present", "late"]);
  if (departmentId && userIdsForAttendance.length > 0) {
    attendanceQuery = attendanceQuery.in("user_id", userIdsForAttendance);
  }

  const [
    { count: totalUsers },
    { count: totalLeads },
    { count: totalTasks },
    { count: activeUsers },
    { data: leadsData },
    { count: newLeadsThisMonth },
    { count: wonLeadsThisMonth },
    { data: revenueData },
    { count: pendingTasks },
    { count: overdueTasks },
    { count: presentToday },
  ] = await Promise.all([
    usersQuery,
    leadsQuery,
    tasksQuery,
    activeUsersQuery,
    leadsDataQuery,
    newLeadsQuery,
    wonLeadsQuery,
    revenueQuery,
    pendingTasksQuery,
    overdueTasksQuery,
    attendanceQuery,
  ]);

  const leadPipeline: Record<string, number> = {};
  const leadSources: Record<string, number> = {};
  for (const lead of leadsData || []) {
    const l = lead as { status: string; source: string | null };
    leadPipeline[l.status] = (leadPipeline[l.status] || 0) + 1;
    const source = l.source || "Unknown";
    leadSources[source] = (leadSources[source] || 0) + 1;
  }

  const monthlyRevenue = (revenueData || []).reduce(
    (sum: number, lead: any) =>
      sum + ((lead as { lead_value: number | null }).lead_value || 0),
    0,
  );

  return {
    users: {
      total: totalUsers || 0,
      active: activeUsers || 0,
    },
    leads: {
      total: totalLeads || 0,
      newThisMonth: newLeadsThisMonth || 0,
      wonThisMonth: wonLeadsThisMonth || 0,
      pipeline: leadPipeline,
      sources: leadSources,
    },
    projects: projectStats,
    revenue: {
      thisMonth: monthlyRevenue,
      total: invoiceStats.total_revenue,
    },
    tasks: {
      total: totalTasks || 0,
      pending: pendingTasks || 0,
      overdue: overdueTasks || 0,
    },
    attendance: {
      presentToday: presentToday || 0,
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
 * Get enhanced admin dashboard with all data
 */
export async function getEnhancedAdminDashboard() {
  const today = getTodayIST();

  const [
    basicStats,
    highPriorityAlerts,
    leadTrend,
    revenueTrend,
    projectStatus,
    departmentPerformance,
    topPerformers,
    { count: activeProjects },
    { count: totalActiveUsers },
    { count: presentToday },
  ] = await Promise.all([
    getAdminDashboard(),
    getHighPriorityAlerts(),
    getLeadTrendData(6),
    getRevenueTrendData(6),
    getProjectStatusData(),
    getDepartmentPerformance(),
    getTopPerformers(5),
    supabaseAdmin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false)
      .eq("status", "in_progress"),
    supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseAdmin
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .in("status", ["present", "late", "half_day"]),
  ]);

  const attendanceRate =
    totalActiveUsers && totalActiveUsers > 0
      ? Math.round(((presentToday || 0) / totalActiveUsers) * 100)
      : 0;

  return {
    ...basicStats,
    activeProjects: activeProjects || 0,
    attendanceRate,
    highPriority: highPriorityAlerts,
    trends: {
      leads: leadTrend,
      revenue: revenueTrend,
    },
    charts: {
      projectStatus,
      departmentPerformance,
    },
    topPerformers,
  };
}
