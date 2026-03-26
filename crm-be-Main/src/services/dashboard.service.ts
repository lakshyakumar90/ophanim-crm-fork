import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { USER_ROLES } from "../config/constants.js";
import type { AuthUser } from "../types/api.types.js";
import {
  nowIST,
  getTodayIST,
  getTimestampIST,
  getMonthIST,
  getYearIST,
  getStartOfMonthIST,
  getStartOfTodayIST,
  getEndOfTodayIST,
} from "../utils/date-utils.js";
import * as invoiceService from "./finance/invoice.service.js";
import * as expenseService from "./finance/expense.service.js";
import { ERROR_CODES } from "../utils/error-codes.js";

/**
 * Try to use PostgreSQL function for faster dashboard stats
 * Falls back to individual queries if function doesn't exist
 */
async function tryGetDashboardStatsRPC(
  departmentId: string | undefined,
  startOfMonth: string,
  today: string,
  overdueTimestamp: string,
): Promise<{
  total_users: number;
  active_users: number;
  total_leads: number;
  new_leads_this_month: number;
  won_leads_this_month: number;
  monthly_revenue: number;
  total_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  present_today: number;
} | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_admin_dashboard_stats", {
      p_department_id: departmentId || null,
      p_start_of_month: startOfMonth,
      p_today: today,
      p_overdue_timestamp: overdueTimestamp,
    });

    if (error) {
      console.warn("Dashboard RPC not available, using fallback:", error.message);
      return null;
    }

    return data as any;
  } catch (e) {
    return null;
  }
}

/**
 * Try to use PostgreSQL function for lead aggregations
 */
async function tryGetLeadAggregationsRPC(
  departmentId: string | undefined,
): Promise<{
  pipeline: Record<string, number>;
  sources: Record<string, number>;
} | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_lead_aggregations", {
      p_department_id: departmentId || null,
    });

    if (error) {
      return null;
    }

    return data as any;
  } catch (e) {
    return null;
  }
}

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
 * Get manager dashboard stats
 * OPTIMIZED: Parallel queries for team stats
 */
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
    .select("id, status")
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

  // Execute all queries in parallel
  const [
    { data: teamLeads },
    { count: pendingTasks },
    { count: overdueTasks },
    { count: presentToday },
    invoiceStats,
    expenseStats,
  ] = await Promise.all([
    teamLeadsQuery,
    pendingTasksQuery,
    overdueTasksQuery,
    attendanceQuery,
    invoiceService.getInvoiceStats(authUser.departmentId || undefined),
    expenseService.getExpenseStats(authUser.departmentId || undefined),
  ]);

  const leadPipeline: Record<string, number> = {};
  for (const lead of teamLeads || []) {
    const status = (lead as { status: string }).status;
    leadPipeline[status] = (leadPipeline[status] || 0) + 1;
  }

  return {
    team: {
      memberCount: memberIds.length,
    },
    leads: {
      total: teamLeads?.length || 0,
      pipeline: leadPipeline,
    },
    tasks: {
      pending: pendingTasks || 0,
      overdue: overdueTasks || 0,
    },
    attendance: {
      presentToday: presentToday || 0,
      totalMembers: memberIds.length,
    },
    revenue: {
      total: invoiceStats.total_revenue,
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
    .select("id, status")
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

  // Execute ALL queries in parallel
  const [
    { data: myLeads },
    { count: pendingTasks },
    { count: overdueTasks },
    { count: dueToday },
    { count: daysPresent },
    { data: todayAttendance },
    { data: myExpenses },
  ] = await Promise.all([
    myLeadsQuery,
    pendingTasksQuery,
    overdueTasksQuery,
    dueTodayQuery,
    daysPresentQuery,
    todayAttendanceQuery,
    myExpensesQuery,
  ]);

  const leadPipeline: Record<string, number> = {};
  for (const lead of myLeads || []) {
    const status = (lead as { status: string }).status;
    leadPipeline[status] = (leadPipeline[status] || 0) + 1;
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
      pipeline: leadPipeline,
    },
    tasks: {
      pending: pendingTasks || 0,
      overdue: overdueTasks || 0,
      dueToday: dueToday || 0,
    },
    attendance: {
      daysThisMonth: daysPresent || 0,
      today: todayAttendance || null,
    },
    expenses: {
      myTotal: myTotalExpenses,
      myPending: myPendingExpenses,
    },
  };
}

/**
 * Get lead analytics
 */
export async function getLeadAnalytics(startDate: string, endDate: string) {
  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("status, source, lead_value, created_at, converted_at")
    .eq("is_deleted", false)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalValue = 0;
  let wonCount = 0;
  let wonValue = 0;

  for (const lead of leads || []) {
    const l = lead as {
      status: string;
      source: string | null;
      lead_value: number | null;
    };

    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    if (l.source) {
      bySource[l.source] = (bySource[l.source] || 0) + 1;
    }
    if (l.lead_value) {
      totalValue += l.lead_value;
    }
    if (l.status === "won") {
      wonCount++;
      if (l.lead_value) wonValue += l.lead_value;
    }
  }

  return {
    total: leads?.length || 0,
    byStatus,
    bySource,
    totalValue,
    wonCount,
    wonValue,
    conversionRate: leads?.length ? (wonCount / leads.length) * 100 : 0,
  };
}

interface LeadAnalyticsFilters {
  teamId?: string;
  userId?: string;
}

interface UserWiseAnalyticsFilters extends LeadAnalyticsFilters {
  startDate: string;
  endDate: string;
}

function getScopedUserIds(
  authUser: AuthUser,
  users: Array<{ id: string; team_id: string | null }>,
  filters: LeadAnalyticsFilters,
): string[] {
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    return [authUser.id];
  }

  if (authUser.role === USER_ROLES.MANAGER) {
    const managerTeamId = authUser.teamId;
    if (!managerTeamId) {
      return [authUser.id];
    }

    const teamUserIds = users
      .filter((u) => u.team_id === managerTeamId)
      .map((u) => u.id);
    if (!teamUserIds.includes(authUser.id)) {
      teamUserIds.push(authUser.id);
    }

    if (filters.teamId && filters.teamId !== managerTeamId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Managers can only view analytics for their own team",
      );
    }

    if (filters.userId && !teamUserIds.includes(filters.userId)) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Selected user is outside your team scope",
      );
    }

    if (filters.userId) {
      return [filters.userId];
    }

    return teamUserIds;
  }

  let scopedUsers = users;
  if (filters.teamId) {
    scopedUsers = scopedUsers.filter((u) => u.team_id === filters.teamId);
  }
  if (filters.userId) {
    scopedUsers = scopedUsers.filter((u) => u.id === filters.userId);
  }

  return scopedUsers.map((u) => u.id);
}

export async function getLeadAnalyticsScoped(
  authUser: AuthUser,
  startDate: string,
  endDate: string,
  filters: LeadAnalyticsFilters = {},
) {
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, team_id")
    .eq("is_active", true);

  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }

  const users = (usersData || []) as Array<{ id: string; team_id: string | null }>;
  const scopedUserIds = getScopedUserIds(authUser, users, filters);

  if (scopedUserIds.length === 0) {
    return {
      total: 0,
      byStatus: {},
      bySource: {},
      totalValue: 0,
      wonCount: 0,
      lostCount: 0,
      wonValue: 0,
      conversionRate: 0,
    };
  }

  const { data: leads, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("status, source, lead_value")
    .eq("is_deleted", false)
    .in("assigned_to", scopedUserIds)
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (leadsError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, leadsError.message);
  }

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalValue = 0;
  let wonCount = 0;
  let lostCount = 0;
  let wonValue = 0;

  for (const lead of leads || []) {
    const l = lead as {
      status: string;
      source: string | null;
      lead_value: number | null;
    };
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    const sourceKey =
      typeof l.source === "string" && l.source.trim().length > 0
        ? l.source
        : "email_marketer";
    bySource[sourceKey] = (bySource[sourceKey] || 0) + 1;
    if (l.lead_value) {
      totalValue += l.lead_value;
    }
    if (l.status === "won") {
      wonCount += 1;
      if (l.lead_value) {
        wonValue += l.lead_value;
      }
    }
    if (l.status === "lost") {
      lostCount += 1;
    }
  }

  return {
    total: leads?.length || 0,
    byStatus,
    bySource,
    totalValue,
    wonCount,
    lostCount,
    wonValue,
    conversionRate: leads?.length ? (wonCount / leads.length) * 100 : 0,
  };
}

export async function getUserWiseAnalytics(
  authUser: AuthUser,
  filters: UserWiseAnalyticsFilters,
): Promise<{
  users: Array<{
    id: string;
    fullName: string;
    role: string;
    teamId: string | null;
    teamName: string | null;
    totalLeads: number;
    leadsWorked: number;
    conversions: number;
    activitiesLogged: number;
    statusChanges: number;
    comments: number;
    winRate: number;
  }>;
  leaderboard: Array<{
    rank: number;
    id: string;
    fullName: string;
    role: string;
    teamName: string | null;
    conversions: number;
    leadsWorked: number;
    totalLeads: number;
    winRate: number;
  }>;
}> {
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, full_name, role, team_id")
    .eq("is_active", true);

  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }

  const users = (usersData || []) as Array<{
    id: string;
    full_name: string;
    role: string;
    team_id: string | null;
  }>;

  const scopedUserIds = getScopedUserIds(authUser, users, {
    teamId: filters.teamId,
    userId: filters.userId,
  });

  if (scopedUserIds.length === 0) {
    return { users: [], leaderboard: [] };
  }

  const { data: teamsData } = await supabaseAdmin
    .from("teams")
    .select("id, name")
    .in(
      "id",
      [
        ...new Set(
          users
            .filter((u) => scopedUserIds.includes(u.id))
            .map((u) => u.team_id)
            .filter((x): x is string => Boolean(x)),
        ),
      ],
    );

  const teamMap = (teamsData || []).reduce(
    (acc: Record<string, string>, t: { id: string; name: string }) => {
      acc[t.id] = t.name;
      return acc;
    },
    {},
  );

  const [assignedRows, workedRows, convertedRows, activityRows, commentsRows] = await Promise.all([
    supabaseAdmin
      .from("lead_assignments_history")
      .select("to_user_id")
      .in("to_user_id", scopedUserIds)
      .gte("created_at", filters.startDate)
      .lte("created_at", filters.endDate),
    supabaseAdmin
      .from("lead_activities")
      .select("user_id, lead_id")
      .in("user_id", scopedUserIds)
      .gte("created_at", filters.startDate)
      .lte("created_at", filters.endDate),
    supabaseAdmin
      .from("leads")
      .select("assigned_to")
      .in("assigned_to", scopedUserIds)
      .eq("status", "won")
      .gte("converted_at", filters.startDate)
      .lte("converted_at", filters.endDate),
    supabaseAdmin
      .from("lead_activities")
      .select("user_id, activity_type")
      .in("user_id", scopedUserIds)
      .gte("created_at", filters.startDate)
      .lte("created_at", filters.endDate),
    supabaseAdmin
      .from("comments")
      .select("user_id")
      .eq("entity_type", "lead")
      .eq("is_deleted", false)
      .in("user_id", scopedUserIds)
      .gte("created_at", filters.startDate)
      .lte("created_at", filters.endDate),
  ]);

  const assignedError = assignedRows.error;
  const workedError = workedRows.error;
  const convertedError = convertedRows.error;
  const activityError = activityRows.error;
  const commentsError = commentsRows.error;
  if (assignedError || workedError || convertedError || activityError || commentsError) {
    const msg =
      assignedError?.message ||
      workedError?.message ||
      convertedError?.message ||
      activityError?.message ||
      commentsError?.message ||
      "Failed to compute user-wise analytics";
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, msg);
  }

  const totalLeadsByUser: Record<string, number> = {};
  for (const row of assignedRows.data || []) {
    const userId = (row as { to_user_id: string }).to_user_id;
    totalLeadsByUser[userId] = (totalLeadsByUser[userId] || 0) + 1;
  }

  const workedSetByUser: Record<string, Set<string>> = {};
  for (const row of workedRows.data || []) {
    const r = row as { user_id: string; lead_id: string };
    let userSet = workedSetByUser[r.user_id];
    if (!userSet) {
      userSet = new Set<string>();
      workedSetByUser[r.user_id] = userSet;
    }
    userSet.add(r.lead_id);
  }

  const conversionsByUser: Record<string, number> = {};
  for (const row of convertedRows.data || []) {
    const userId = (row as { assigned_to: string }).assigned_to;
    conversionsByUser[userId] = (conversionsByUser[userId] || 0) + 1;
  }

  const activitiesByUser: Record<string, number> = {};
  const statusChangesByUser: Record<string, number> = {};
  const commentsByUser: Record<string, number> = {};
  for (const row of activityRows.data || []) {
    const r = row as { user_id: string; activity_type: string };
    activitiesByUser[r.user_id] = (activitiesByUser[r.user_id] || 0) + 1;
    if (r.activity_type === "status_change") {
      statusChangesByUser[r.user_id] = (statusChangesByUser[r.user_id] || 0) + 1;
    }
  }
  for (const row of commentsRows.data || []) {
    const userId = (row as { user_id: string | null }).user_id;
    if (!userId) continue;
    commentsByUser[userId] = (commentsByUser[userId] || 0) + 1;
  }

  const userRows = users
    .filter((u) => scopedUserIds.includes(u.id))
    .map((u) => {
      const totalLeads = totalLeadsByUser[u.id] || 0;
      const leadsWorked = workedSetByUser[u.id]?.size || 0;
      const conversions = conversionsByUser[u.id] || 0;
      const activitiesLogged = activitiesByUser[u.id] || 0;
      const statusChanges = statusChangesByUser[u.id] || 0;
      const comments = commentsByUser[u.id] || 0;
      const winRate = totalLeads > 0 ? (conversions / totalLeads) * 100 : 0;
      return {
        id: u.id,
        fullName: u.full_name,
        role: u.role,
        teamId: u.team_id,
        teamName: (u.team_id ? teamMap[u.team_id] : null) || null,
        totalLeads,
        leadsWorked,
        conversions,
        activitiesLogged,
        statusChanges,
        comments,
        winRate,
      };
    });

  const leaderboard = [...userRows]
    .sort((a, b) => {
      if (b.conversions !== a.conversions) return b.conversions - a.conversions;
      if (b.leadsWorked !== a.leadsWorked) return b.leadsWorked - a.leadsWorked;
      if (b.totalLeads !== a.totalLeads) return b.totalLeads - a.totalLeads;
      return a.fullName.localeCompare(b.fullName);
    })
    .map((row, idx) => ({
      rank: idx + 1,
      id: row.id,
      fullName: row.fullName,
      role: row.role,
      teamName: row.teamName,
      conversions: row.conversions,
      leadsWorked: row.leadsWorked,
      totalLeads: row.totalLeads,
      winRate: row.winRate,
    }));

  return {
    users: userRows,
    leaderboard,
  };
}

export async function getUserPerformance(
  userId: string,
  startDate: string,
  endDate: string,
) {
  // Execute all queries in parallel
  const [
    { count: leadsAssigned },
    { count: leadsWon },
    { count: tasksCompleted },
    { count: activitiesLogged },
    { count: daysPresent },
  ] = await Promise.all([
    supabaseAdmin
      .from("lead_assignments_history")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate),
    supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .eq("status", "won")
      .gte("converted_at", startDate)
      .lte("converted_at", endDate),
    supabaseAdmin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .eq("status", "completed")
      .gte("completed_at", startDate)
      .lte("completed_at", endDate),
    supabaseAdmin
      .from("lead_activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate),
    supabaseAdmin
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", startDate.split("T")[0])
      .lte("date", endDate.split("T")[0])
      .in("status", ["present", "late"]),
  ]);

  return {
    leadsAssigned: leadsAssigned || 0,
    leadsWon: leadsWon || 0,
    tasksCompleted: tasksCompleted || 0,
    activitiesLogged: activitiesLogged || 0,
    daysPresent: daysPresent || 0,
    conversionRate: leadsAssigned ? ((leadsWon || 0) / leadsAssigned) * 100 : 0,
  };
}

/**
 * Get high priority alerts for dashboard
 */
export async function getHighPriorityAlerts() {
  const now = getTimestampIST();
  const today = getTodayIST();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const staleDate = thirtyDaysAgo.toISOString();

  // Execute all queries in parallel
  const [
    { count: overdueTasks },
    { count: pendingLeaves },
    { count: staleLeads },
    { count: overdueInvoices },
    { count: totalActiveUsers },
    { count: presentToday },
  ] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false)
      .lt("due_date", now)
      .not("status", "in", '("completed","cancelled")'),
    supabaseAdmin
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "manager_approved"]),
    supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false)
      .not("status", "in", '("won","lost","customer")')
      .lt("updated_at", staleDate),
    supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "overdue"),
    supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("role", "admin"),
    supabaseAdmin
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .in("status", ["present", "late", "half_day"]),
  ]);

  const absentToday = Math.max(
    0,
    (totalActiveUsers || 0) - (presentToday || 0),
  );

  return {
    overdueTasks: overdueTasks || 0,
    pendingLeaves: pendingLeaves || 0,
    staleLeads: staleLeads || 0,
    overdueInvoices: overdueInvoices || 0,
    absentToday,
  };
}

/**
 * Get lead trend data for area chart
 * OPTIMIZED: Batch queries for all months in parallel
 */
export async function getLeadTrendData(months: number = 6) {
  const now = new Date();

  // Build all month ranges upfront
  const monthRanges = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthRanges.push({
      monthStart: date.toISOString(),
      monthEnd: nextMonth.toISOString(),
      monthLabel: date.toLocaleString("default", { month: "short" }),
    });
  }

  // Execute all queries in parallel
  const results = await Promise.all(
    monthRanges.flatMap((range) => [
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .gte("created_at", range.monthStart)
        .lt("created_at", range.monthEnd),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "won")
        .gte("converted_at", range.monthStart)
        .lt("converted_at", range.monthEnd),
    ]),
  );

  // Process results
  const trendData: { month: string; leads: number; converted: number }[] = [];
  for (let i = 0; i < monthRanges.length; i++) {
    const range = monthRanges[i];
    const leadsResult = results[i * 2];
    const convertedResult = results[i * 2 + 1];
    if (range && leadsResult && convertedResult) {
      trendData.push({
        month: range.monthLabel,
        leads: leadsResult.count || 0,
        converted: convertedResult.count || 0,
      });
    }
  }

  return trendData;
}

/**
 * Get revenue trend data for line chart
 * OPTIMIZED: Batch queries for all months in parallel
 */
export async function getRevenueTrendData(months: number = 6) {
  const now = new Date();

  // Build all month ranges upfront
  const monthRanges = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthRanges.push({
      monthStart: date.toISOString(),
      monthEnd: nextMonth.toISOString(),
      monthLabel: date.toLocaleString("default", { month: "short" }),
    });
  }

  // Execute all queries in parallel
  const results = await Promise.all(
    monthRanges.flatMap((range) => [
      supabaseAdmin
        .from("invoices")
        .select("total_amount")
        .eq("status", "paid")
        .gte("paid_at", range.monthStart)
        .lt("paid_at", range.monthEnd),
      supabaseAdmin
        .from("expenses")
        .select("amount")
        .eq("status", "approved")
        .gte("expense_date", range.monthStart.split("T")[0])
        .lt("expense_date", range.monthEnd.split("T")[0]),
    ]),
  );

  // Process results
  const trendData: { month: string; revenue: number; expenses: number }[] = [];
  for (let i = 0; i < monthRanges.length; i++) {
    const invoicesResult = results[i * 2];
    const expensesResult = results[i * 2 + 1];
    const invoices = invoicesResult?.data || [];
    const expenses = expensesResult?.data || [];

    const revenue = invoices.reduce(
      (sum: number, inv: any) => sum + (Number(inv.total_amount) || 0),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
      0,
    );

    const range = monthRanges[i];
    if (range) {
      trendData.push({
        month: range.monthLabel,
        revenue,
        expenses: totalExpenses,
      });
    }
  }

  return trendData;
}

/**
 * Get project status distribution
 */
export async function getProjectStatusData() {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("status")
    .eq("is_deleted", false);

  const distribution: Record<string, number> = {};
  for (const project of data || []) {
    const status = (project as { status: string }).status;
    distribution[status] = (distribution[status] || 0) + 1;
  }

  return Object.entries(distribution).map(([name, value]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
  }));
}

/**
 * Get department performance comparison
 * OPTIMIZED: Single batch query approach instead of N+1 queries per department
 */
export async function getDepartmentPerformance() {
  const { data: departments } = await supabaseAdmin
    .from("departments")
    .select("id, name, slug");

  if (!departments || departments.length === 0) {
    return [];
  }

  const deptIds = departments.map((d: any) => d.id);

  // Batch all data fetching in parallel instead of per-department sequential
  const [teamsData, leadsData, invoicesData] = await Promise.all([
    // Get all teams with their department IDs
    supabaseAdmin.from("teams").select("id, department_id").in("department_id", deptIds),
    // Get all leads counts by department
    supabaseAdmin
      .from("leads")
      .select("department_id")
      .eq("is_deleted", false)
      .in("department_id", deptIds),
    // Get all paid invoices by department
    supabaseAdmin
      .from("invoices")
      .select("department_id, total_amount")
      .eq("status", "paid")
      .in("department_id", deptIds),
  ]);

  // Build team to department mapping
  const teamToDept: Record<string, string> = {};
  for (const team of teamsData.data || []) {
    const t = team as { id: string; department_id: string };
    teamToDept[t.id] = t.department_id;
  }

  // Get users in these teams
  const teamIds = Object.keys(teamToDept);
  let usersData: any[] = [];
  let completedTasksData: any[] = [];

  if (teamIds.length > 0) {
    const [users, tasks] = await Promise.all([
      supabaseAdmin.from("users").select("id, team_id").in("team_id", teamIds),
      supabaseAdmin
        .from("tasks")
        .select("assigned_to")
        .eq("status", "completed"),
    ]);
    usersData = users.data || [];
    completedTasksData = tasks.data || [];
  }

  // Build user to department mapping
  const userToDept: Record<string, string> = {};
  for (const user of usersData) {
    const u = user as { id: string; team_id: string };
    const deptId = teamToDept[u.team_id];
    if (deptId) {
      userToDept[u.id] = deptId;
    }
  }

  // Count tasks per department
  const tasksByDept: Record<string, number> = {};
  for (const task of completedTasksData) {
    const t = task as { assigned_to: string };
    const deptId = userToDept[t.assigned_to];
    if (deptId) {
      tasksByDept[deptId] = (tasksByDept[deptId] || 0) + 1;
    }
  }

  // Count leads per department
  const leadsByDept: Record<string, number> = {};
  for (const lead of leadsData.data || []) {
    const l = lead as { department_id: string };
    leadsByDept[l.department_id] = (leadsByDept[l.department_id] || 0) + 1;
  }

  // Sum revenue per department
  const revenueByDept: Record<string, number> = {};
  for (const inv of invoicesData.data || []) {
    const i = inv as { department_id: string; total_amount: number };
    revenueByDept[i.department_id] =
      (revenueByDept[i.department_id] || 0) + (Number(i.total_amount) || 0);
  }

  // Build final result
  return departments.map((dept: any) => {
    const d = dept as { id: string; name: string; slug: string };
    return {
      name: d.name,
      leads: leadsByDept[d.id] || 0,
      tasks: tasksByDept[d.id] || 0,
      revenue: revenueByDept[d.id] || 0,
    };
  });
}

/**
 * Get top performers
 * OPTIMIZED: Single batch queries instead of N queries per user
 */
export async function getTopPerformers(limit: number = 5) {
  const startOfMonth = getStartOfMonthIST(getYearIST(), getMonthIST());

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, full_name, avatar_url, role")
    .eq("is_active", true)
    .neq("role", "admin");

  if (!users || users.length === 0) {
    return [];
  }

  const userIds = users.map((u: any) => u.id);

  // Batch all performance data in parallel - 2 queries instead of 2*N queries
  const [leadsWonData, tasksCompletedData] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("assigned_to")
      .in("assigned_to", userIds)
      .eq("status", "won")
      .gte("converted_at", startOfMonth),
    supabaseAdmin
      .from("tasks")
      .select("assigned_to")
      .in("assigned_to", userIds)
      .eq("status", "completed")
      .gte("completed_at", startOfMonth),
  ]);

  // Count leads won per user
  const leadsWonByUser: Record<string, number> = {};
  for (const lead of leadsWonData.data || []) {
    const l = lead as { assigned_to: string };
    leadsWonByUser[l.assigned_to] = (leadsWonByUser[l.assigned_to] || 0) + 1;
  }

  // Count tasks completed per user
  const tasksCompletedByUser: Record<string, number> = {};
  for (const task of tasksCompletedData.data || []) {
    const t = task as { assigned_to: string };
    tasksCompletedByUser[t.assigned_to] =
      (tasksCompletedByUser[t.assigned_to] || 0) + 1;
  }

  // Calculate scores for all users
  const userStats = users.map((user: any) => {
    const u = user as {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    };
    const leadsWon = leadsWonByUser[u.id] || 0;
    const tasksCompleted = tasksCompletedByUser[u.id] || 0;
    const score = leadsWon * 10 + tasksCompleted * 2;

    return {
      id: u.id,
      name: u.full_name,
      avatar: u.avatar_url,
      role: u.role,
      leadsWon,
      tasksCompleted,
      score,
    };
  });

  // Filter and sort
  return userStats
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get enhanced admin dashboard with all data
 * Already optimized with Promise.all
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
