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

/**
 * Try to use PostgreSQL function for faster dashboard stats
 * Falls back to individual queries if function doesn't exist
 */
export async function tryGetDashboardStatsRPC(
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
export async function tryGetLeadAggregationsRPC(
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

export const DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE = 1000;

export type LeadAnalyticsRow = {
  id: string;
  status: string;
  source: string | null;
  lead_value: number | null;
};

export async function fetchLeadIdsWithActivities(
  startDate: string,
  endDate: string,
  scopedUserIds?: string[],
): Promise<string[]> {
  const leadIds = new Set<string>();
  let from = 0;

  while (true) {
    let query = supabaseAdmin
      .from("lead_activities")
      .select("lead_id")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("id", { ascending: true })
      .range(from, from + DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE - 1);

    if (scopedUserIds && scopedUserIds.length > 0) {
      query = query.in("user_id", scopedUserIds);
    }

    const { data, error } = await query;
    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    const batch = (data || []) as Array<{ lead_id: string | null }>;
    for (const row of batch) {
      if (row.lead_id) {
        leadIds.add(row.lead_id);
      }
    }

    if (batch.length < DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE) {
      break;
    }

    from += DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE;
  }

  return Array.from(leadIds);
}

export async function fetchLeadAnalyticsRowsByIds(
  leadIds: string[],
  scopedUserIds?: string[],
): Promise<LeadAnalyticsRow[]> {
  if (leadIds.length === 0) {
    return [];
  }

  const rows: LeadAnalyticsRow[] = [];
  const idBatchSize = 200;

  for (let i = 0; i < leadIds.length; i += idBatchSize) {
    const idBatch = leadIds.slice(i, i + idBatchSize);

    let query = supabaseAdmin
      .from("leads")
      .select("id, status, source, lead_value")
      .eq("is_deleted", false)
      .in("id", idBatch);

    if (scopedUserIds && scopedUserIds.length > 0) {
      query = query.in("assigned_to", scopedUserIds);
    }

    const { data, error } = await query;
    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    rows.push(...((data || []) as LeadAnalyticsRow[]));
  }

  return rows;
}

export async function fetchLeadAnalyticsRows(
  startDate: string,
  endDate: string,
  scopedUserIds?: string[],
): Promise<LeadAnalyticsRow[]> {
  const allRows: LeadAnalyticsRow[] = [];
  let from = 0;

  while (true) {
    let query = supabaseAdmin
      .from("leads")
      .select("id, status, source, lead_value")
      .eq("is_deleted", false)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("id", { ascending: true })
      .range(from, from + DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE - 1);

    if (scopedUserIds && scopedUserIds.length > 0) {
      query = query.in("assigned_to", scopedUserIds);
    }

    const { data, error } = await query;
    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    const batch = (data || []) as LeadAnalyticsRow[];
    allRows.push(...batch);

    if (batch.length < DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE) {
      break;
    }

    from += DASHBOARD_LEAD_ANALYTICS_BATCH_SIZE;
  }

  return allRows;
}

export interface LeadAnalyticsFilters {
  teamId?: string;
  userId?: string;
  departmentId?: string;
}

export interface UserWiseAnalyticsFilters extends LeadAnalyticsFilters {
  startDate: string;
  endDate: string;
}

export function getScopedUserIds(
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
