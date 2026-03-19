import { supabaseAdmin } from "../config/supabase.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
} from "../utils/pagination.js";
import { ApiError } from "../utils/responses.js";
import { formatDateIST } from "../utils/date-utils.js";
import { ERROR_CODES } from "../utils/error-codes.js";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const COMMENT_ACTIVITY_TYPE = "comment";
const AUTH_ACTIVITY_TYPES = ["login", "logout"];

type ActivityScope = "self" | "team" | "department" | "all-crm" | "member";

type ActivityRow = {
  id: string;
  user_id: string | null;
  lead_id: string | null;
  entity_id: string | null;
  activity_type: string;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  source_type: string | null;
  entity_type: string | null;
  user_email: string | null;
  user_name: string | null;
  user_avatar: string | null;
  entity_name: string | null;
};

export interface ActivityFilters {
  page?: string;
  limit?: string;
  userId?: string;
  resourceType?: string;
  /** Filter to a specific entity by ID (e.g. a project UUID) */
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  teamId?: string;
  excludeAuthActivity?: boolean;
  authRole?: string;
  authUserId?: string;
  authTeamId?: string | null;
  authDepartmentId?: string | null;
  scope?: string;
  commentsOnly?: boolean;
}

async function getUsersInTeams(teamIds: string[]): Promise<string[]> {
  if (teamIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .in("team_id", teamIds);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return [...new Set((data || []).map((user: { id: string }) => user.id))];
}

async function getUsersInDepartment(departmentId: string): Promise<string[]> {
  const [{ data: directUsers, error: directError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabaseAdmin.from("users").select("id").eq("department_id", departmentId),
      supabaseAdmin.from("teams").select("id").eq("department_id", departmentId),
    ]);

  if (directError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, directError.message);
  }

  if (teamsError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, teamsError.message);
  }

  const teamIds = (teams || []).map((team: { id: string }) => team.id);
  const teamUsers = await getUsersInTeams(teamIds);

  return [
    ...new Set([
      ...(directUsers || []).map((user: { id: string }) => user.id),
      ...teamUsers,
    ]),
  ];
}

async function getManagedTeamIds(
  authUserId: string,
  fallbackTeamId?: string | null,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("manager_id", authUserId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const teamIds = (data || []).map((team: { id: string }) => team.id);
  if (teamIds.length > 0) return teamIds;

  return fallbackTeamId ? [fallbackTeamId] : [];
}

async function getUserById(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, team_id, department_id")
    .eq("id", userId)
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data;
}

function normalizeScope(scope?: string): ActivityScope {
  if (
    scope === "self" ||
    scope === "team" ||
    scope === "department" ||
    scope === "all-crm" ||
    scope === "member"
  ) {
    return scope;
  }

  return "self";
}

function normalizeResourceType(resourceType?: string) {
  if (!resourceType || resourceType === "all") return undefined;
  if (resourceType === "tasks") return "task";
  if (resourceType === "teams") return "team";
  return resourceType;
}

async function resolveUserIdsForScope(
  filters: ActivityFilters,
): Promise<string[] | null> {
  if (!filters.authUserId || !filters.authRole) {
    throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Authentication required");
  }

  const scope = normalizeScope(filters.scope);
  const authUserId = filters.authUserId;
  const authRole = filters.authRole;

  if (authRole === "admin") {
    if (scope === "all-crm") return null;
    if (scope === "self") return [authUserId];
    if (scope === "member") return [filters.userId || authUserId];
    if (scope === "team") {
      const teamId = filters.teamId || filters.authTeamId || undefined;
      return teamId ? await getUsersInTeams([teamId]) : [];
    }
    const departmentId =
      filters.departmentId || filters.authDepartmentId || undefined;
    return departmentId ? await getUsersInDepartment(departmentId) : [];
  }

  if (authRole === "manager") {
    const managedTeamIds = await getManagedTeamIds(authUserId, filters.authTeamId);

    if (scope === "all-crm" || scope === "department") {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "Managers can only view their own activity or their team activity",
      );
    }

    if (scope === "self") {
      return [authUserId];
    }

    if (managedTeamIds.length === 0) {
      return [authUserId];
    }

    if (scope === "team") {
      if (filters.teamId && !managedTeamIds.includes(filters.teamId)) {
        throw new ApiError(
          ERROR_CODES.FORBIDDEN,
          "You can only view activity for your own team",
        );
      }

      const targetTeamIds = filters.teamId ? [filters.teamId] : managedTeamIds;
      return getUsersInTeams(targetTeamIds);
    }

    const targetUserId = filters.userId || authUserId;
    if (targetUserId === authUserId) return [authUserId];

    const targetUser = await getUserById(targetUserId);
    if (!targetUser?.team_id || !managedTeamIds.includes(targetUser.team_id)) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        "You can only view activity for members of your own team",
      );
    }

    return [targetUserId];
  }

  if (scope !== "self") {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "You can only view your own activity",
    );
  }

  return [authUserId];
}

function applyActivityFilters(
  query: any,
  filters: ActivityFilters,
  userIdsFilter: string[] | null,
) {
  if (filters.excludeAuthActivity) {
    query = query.not(
      "activity_type",
      "in",
      `(${AUTH_ACTIVITY_TYPES.join(",")})`,
    );
  }

  if (filters.commentsOnly) {
    query = query.eq("activity_type", COMMENT_ACTIVITY_TYPE);
  } else if (filters.action) {
    query = query.eq("activity_type", filters.action);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (userIdsFilter !== null) {
    if (userIdsFilter.length > 0) {
      query = query.in("user_id", userIdsFilter);
    } else {
      query = query.eq("id", EMPTY_UUID);
    }
  }

  if (filters.entityId) {
    query = query.eq("entity_id", filters.entityId);
  }

  const resourceType = normalizeResourceType(filters.resourceType);
  if (!resourceType) return query;

  if (resourceType === "attendance") {
    return query.in("activity_type", ["clock_in", "clock_out"]);
  }

  if (resourceType === "user") {
    return query.or(
      "entity_type.eq.user,activity_type.in.(login,logout,password_change,profile_update)",
    );
  }

  return query.eq("entity_type", resourceType);
}

function mapActivityRow(row: ActivityRow) {
  const leadId = row.lead_id || (row.entity_type === "lead" ? row.entity_id : null);

  return {
    id: row.id,
    user_id: row.user_id,
    lead_id: leadId,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    entity_name: row.entity_name,
    source_type: row.source_type,
    activity_type: row.activity_type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    created_at: row.created_at,
    user: row.user_id
      ? {
          id: row.user_id,
          full_name: row.user_name,
          email: row.user_email,
          avatar_url: row.user_avatar,
        }
      : null,
    lead: leadId
      ? {
          id: leadId,
          lead_name: row.entity_name,
        }
      : undefined,
  };
}

export async function getActivityLogs(filters: ActivityFilters) {
  const params = parsePaginationParams({
    page: filters.page,
    limit: filters.limit || "50",
  });
  const offset = calculateOffset(params);
  const userIdsFilter = await resolveUserIdsForScope(filters);

  let query = supabaseAdmin
    .from("all_activities" as any)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  query = applyActivityFilters(query, filters, userIdsFilter);
  query = query.range(offset, offset + params.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[Activity Service] getActivityLogs error:", error);
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return {
    data: (data || []).map((row: ActivityRow) => mapActivityRow(row)),
    meta: calculatePaginationMeta(count || 0, params),
  };
}

export async function getLeadActivities(filters: ActivityFilters) {
  const params = parsePaginationParams({
    page: filters.page,
    limit: filters.limit || "20",
  });
  const offset = calculateOffset(params);

  let query = supabaseAdmin
    .from("lead_activities")
    .select(
      `
      *,
      user:users(id, full_name, email, avatar_url),
      lead:leads(id, lead_name)
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  query = query.range(offset, offset + params.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  return {
    data,
    meta: calculatePaginationMeta(count || 0, params),
  };
}

export async function getActivityStats(filters: ActivityFilters) {
  const userIdsFilter = await resolveUserIdsForScope(filters);

  let query = supabaseAdmin
    .from("all_activities" as any)
    .select("activity_type, entity_type", { count: "exact" });

  query = applyActivityFilters(query, filters, userIdsFilter);

  const { data, error, count } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const stats = {
    totalActivities: count || 0,
    commentsCount: 0,
    statusChanges: 0,
    tasksDone: 0,
    authEvents: 0,
  };

  for (const row of data || []) {
    if (row.activity_type === COMMENT_ACTIVITY_TYPE) stats.commentsCount++;
    if (row.activity_type === "status_change") stats.statusChanges++;
    if (row.activity_type === "complete" && row.entity_type === "task") {
      stats.tasksDone++;
    }
    if (AUTH_ACTIVITY_TYPES.includes(row.activity_type)) stats.authEvents++;
  }

  return stats;
}

export type ActivityEventRow = {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  event_type: string;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export interface ActivityEventFeedFilters {
  limit?: number;
  cursorTime?: string;
  cursorId?: string;
  actorId?: string;
  eventType?: string;
}

/**
 * Cursor-based paginated feed — reads from the new activity_events table.
 * Uses a Supabase RPC to leverage PostgreSQL row-value comparison:
 *   WHERE (created_at, id) < (cursor_ts, cursor_id)
 *   ORDER BY created_at DESC, id DESC
 *
 * Returns { data, nextCursor } where nextCursor is null on the last page.
 */
export async function getActivityEventsFeed(filters: ActivityEventFeedFilters) {
  const limit = Math.min(filters.limit ?? 50, 200);

  const { data, error } = await supabaseAdmin.rpc(
    "get_activity_events_feed" as any,
    {
      p_limit: limit,
      p_cursor_ts: filters.cursorTime ?? null,
      p_cursor_id: filters.cursorId ?? null,
      p_actor_id: filters.actorId ?? null,
      p_event_type: filters.eventType ?? null,
    },
  );

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const rows = (data ?? []) as ActivityEventRow[];

  const nextCursor =
    rows.length === limit
      ? {
          createdAt: rows[rows.length - 1]!.created_at,
          id: rows[rows.length - 1]!.id,
        }
      : null;

  return { data: rows, nextCursor };
}

export async function getActivityAnalytics(filters: {
  startDate?: string;
  endDate?: string;
  teamId?: string;
  userId?: string;
  interval?: "daily" | "weekly" | "monthly" | "quarterly";
  departmentId?: string;
}) {
  let query = supabaseAdmin
    .from("lead_activities")
    .select("created_at, activity_type, user_id")
    .order("created_at", { ascending: true });

  if (filters.departmentId && !filters.teamId && !filters.userId) {
    const userIds = await getUsersInDepartment(filters.departmentId);
    if (userIds.length > 0) {
      query = query.in("user_id", userIds);
    } else {
      return [];
    }
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.teamId && !filters.userId) {
    const userIds = await getUsersInTeams([filters.teamId]);
    if (userIds.length > 0) {
      query = query.in("user_id", userIds);
    } else {
      return [];
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.INTERNAL_ERROR, error.message);
  }

  const interval = filters.interval || "daily";
  const groupedData: Record<string, any> = {};

  (data || []).forEach((log) => {
    const istDateStr = formatDateIST(log.created_at, "date");
    const istYear = parseInt(istDateStr.split("-")[0] || "0", 10);
    const istMonth = parseInt(istDateStr.split("-")[1] || "1", 10);

    let key = "";

    if (interval === "daily") {
      key = istDateStr;
    } else if (interval === "monthly") {
      key = `${istYear}-${String(istMonth).padStart(2, "0")}`;
    } else if (interval === "quarterly") {
      key = `${istYear}-Q${Math.ceil(istMonth / 3)}`;
    } else {
      key = `${istDateStr.slice(0, 8)}W`;
    }

    if (!groupedData[key]) {
      groupedData[key] = {
        date: key,
        total: 0,
        status_change: 0,
        call: 0,
        email: 0,
        meeting: 0,
        note: 0,
        other: 0,
      };
    }

    groupedData[key].total++;

    const activityType = log.activity_type;
    if (activityType === "status_change") groupedData[key].status_change++;
    else if (activityType === "call") groupedData[key].call++;
    else if (activityType === "email") groupedData[key].email++;
    else if (activityType === "meeting") groupedData[key].meeting++;
    else if (activityType === "note") groupedData[key].note++;
    else groupedData[key].other++;
  });

  return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
}
