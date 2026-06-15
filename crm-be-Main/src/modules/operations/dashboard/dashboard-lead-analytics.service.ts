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

export async function getLeadAnalytics(startDate: string, endDate: string) {
  const leads = await fetchLeadAnalyticsRows(startDate, endDate);

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalValue = 0;
  let wonCount = 0;
  let wonValue = 0;

  for (const lead of leads) {
    const l = lead;

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
    total: leads.length,
    byStatus,
    bySource,
    totalValue,
    wonCount,
    wonValue,
    conversionRate: leads.length ? (wonCount / leads.length) * 100 : 0,
  };
}

export async function getLeadAnalyticsScoped(
  authUser: AuthUser,
  startDate: string,
  endDate: string,
  filters: LeadAnalyticsFilters = {},
) {
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, team_id, department_id")
    .eq("is_active", true);

  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }

  let users = (usersData || []) as Array<{
    id: string;
    team_id: string | null;
    department_id: string | null;
  }>;

  if (authUser.role === USER_ROLES.ADMIN && filters.departmentId) {
    users = users.filter((u) => u.department_id === filters.departmentId);
  }
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

  const [createdPeriodLeads, activityLeadIds] = await Promise.all([
    fetchLeadAnalyticsRows(startDate, endDate, scopedUserIds),
    fetchLeadIdsWithActivities(startDate, endDate, scopedUserIds),
  ]);

  const activityLeads = await fetchLeadAnalyticsRowsByIds(
    activityLeadIds,
    scopedUserIds,
  );

  const leadMap = new Map<string, LeadAnalyticsRow>();
  for (const lead of createdPeriodLeads) {
    leadMap.set(lead.id, lead);
  }
  for (const lead of activityLeads) {
    leadMap.set(lead.id, lead);
  }
  const leads = Array.from(leadMap.values());

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalValue = 0;
  let wonCount = 0;
  let lostCount = 0;
  let wonValue = 0;

  for (const lead of leads) {
    const l = lead;
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
    total: leads.length,
    byStatus,
    bySource,
    totalValue,
    wonCount,
    lostCount,
    wonValue,
    conversionRate: leads.length ? (wonCount / leads.length) * 100 : 0,
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
    activityCountCapped: boolean;
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
    .select("id, full_name, role, team_id, department_id")
    .eq("is_active", true);

  if (usersError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersError.message);
  }

  let users = (usersData || []) as Array<{
    id: string;
    full_name: string;
    role: string;
    team_id: string | null;
    department_id: string | null;
  }>;

  if (authUser.role === USER_ROLES.ADMIN && filters.departmentId) {
    users = users.filter((u) => u.department_id === filters.departmentId);
  }

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

  const [assignedRows, workedRows, convertedRows, commentsRows] = await Promise.all([
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
  const commentsError = commentsRows.error;
  if (assignedError || workedError || convertedError || commentsError) {
    const msg =
      assignedError?.message ||
      workedError?.message ||
      convertedError?.message ||
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

  // Count activities per user independently to avoid row-limit skew.
  const activitiesByUser: Record<string, number> = {};
  const activityCountCappedByUser: Record<string, boolean> = {};
  const statusChangesByUser: Record<string, number> = {};
  const commentsByUser: Record<string, number> = {};

  const activityCountResults = await Promise.all(
    scopedUserIds.map(async (userId) => {
      const [allActivities, statusChanges] = await Promise.all([
        supabaseAdmin
          .from("lead_activities")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", filters.startDate)
          .lte("created_at", filters.endDate),
        supabaseAdmin
          .from("lead_activities")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("activity_type", "status_change")
          .gte("created_at", filters.startDate)
          .lte("created_at", filters.endDate),
      ]);

      if (allActivities.error || statusChanges.error) {
        throw new ApiError(
          ERROR_CODES.DATABASE_ERROR,
          allActivities.error?.message ||
            statusChanges.error?.message ||
            "Failed to compute user activity counts",
        );
      }

      const totalCount = allActivities.count || 0;
      return {
        userId,
        totalCount,
        statusChangeCount: statusChanges.count || 0,
      };
    }),
  );

  for (const row of activityCountResults) {
    activitiesByUser[row.userId] = row.totalCount;
    statusChangesByUser[row.userId] = row.statusChangeCount;
    activityCountCappedByUser[row.userId] = row.totalCount >= 1000;
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
        activityCountCapped: activityCountCappedByUser[u.id] || false,
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
