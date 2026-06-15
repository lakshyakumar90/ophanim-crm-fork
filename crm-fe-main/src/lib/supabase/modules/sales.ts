import { supabase } from "../../supabase";
import { mapToCamelCase } from "../map-to-camel";

// ===================
// LEADS
// ===================

export async function getLeads(params?: {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  assignedTo?: string;
  assigned?: "assigned" | "unassigned";
  teamId?: string;
  country?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("leads")
    .select(
      `id, lead_name, business_name, email, phone, status, source,
       assigned_to, website, country, timezone, nal_reason, client_response,
       lead_type, created_by, converted_at, created_at, updated_at, is_deleted,
       assignee:users!assigned_to(id, full_name, avatar_url)`,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  if (params?.status) {
    const statuses = params.status.split(",").map((s) => s.trim());
    query = query.in("status", statuses);
  }

  if (params?.source) {
    const sources = params.source.split(",").map((s) => s.trim());
    query = query.in("source", sources);
  }

  if (params?.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  // Team filter: get all users in the team and filter by their IDs
  // If lookup fails, throw to trigger backend fallback (backend uses supabaseAdmin)
  if (params?.teamId) {
    try {
      const { data: teamMembers, error: teamError } = await supabase
        .from("users")
        .select("id")
        .eq("team_id", params.teamId)
        .eq("is_active", true);
      
      if (teamError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Team member lookup failed via Supabase RLS:", teamError);
        }
        // Throw to trigger backend API fallback
        throw teamError;
      }
      
      const memberIds = (teamMembers || []).map((u: any) => u.id);
      if (memberIds.length > 0) {
        query = query.in("assigned_to", memberIds);
      } else {
        // No team members found (empty team or filtered out by RLS)
        // Return empty result - this is correct behavior
        query = query.eq("assigned_to", "00000000-0000-0000-0000-000000000000");
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Team filter lookup failed, will trigger fallback to backend API:", (error as any)?.message);
      }
      throw error;
    }
  }

  if (params?.assigned === "assigned") {
    query = query.not("assigned_to", "is", null);
  } else if (params?.assigned === "unassigned") {
    query = query.is("assigned_to", null);
  }

  if (params?.country) {
    query = query.ilike("country", `%${params.country}%`);
  }

  if (params?.search) {
    query = query.or(
      `lead_name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%,business_name.ilike.%${params.search}%`,
    );
  }

  if (params?.startDate) {
    query = query.gte("created_at", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  const sortBy = params?.sortBy || "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching leads:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  // Flatten assignee from array to single object (Supabase foreign key join)
  const mapped = (data || []).map((lead: any) => ({
    ...lead,
    assignee: Array.isArray(lead.assignee)
      ? lead.assignee[0] || null
      : lead.assignee,
  }));

  return {
    data: mapToCamelCase(mapped),
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getLeadById(id: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(`*, assignee:users!assigned_to(id, full_name, avatar_url, email)`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  if (!data) {
    throw new Error("Lead not found or not accessible via Supabase");
  }

  const mapped = {
    ...data,
    assignee: Array.isArray(data.assignee)
      ? data.assignee[0] || null
      : data.assignee,
  };

  return mapToCamelCase(mapped);
}

export async function getLeadPipeline() {
  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .eq("is_deleted", false);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead pipeline:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const pipeline: Record<string, number> = {};
  for (const lead of data || []) {
    const status = (lead as any).status;
    pipeline[status] = (pipeline[status] || 0) + 1;
  }

  return pipeline;
}

export async function getWonLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select(
      `id, lead_name, business_name, email, phone, lead_value, converted_at,
       assignee:users!assigned_to(id, full_name, avatar_url)`,
    )
    .eq("status", "won")
    .eq("is_deleted", false)
    .order("converted_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching won leads:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const mapped = (data || []).map((lead: any) => ({
    ...lead,
    assignee: Array.isArray(lead.assignee)
      ? lead.assignee[0] || null
      : lead.assignee,
  }));

  return mapToCamelCase(mapped);
}

export async function getLeadActivities(leadId: string) {
  const { data, error } = await supabase
    .from("lead_activities")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead activities:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeadComments(leadId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("entity_type", "lead")
    .eq("entity_id", leadId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead comments:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getLeadReminders(leadId: string) {
  const { data, error } = await supabase
    .from("lead_reminders")
    .select(
      `*, lead:leads!lead_id(id, lead_name), user:users!user_id(id, full_name)`,
    )
    .eq("lead_id", leadId)
    .order("reminder_at", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead reminders:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getAllReminders(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  status?: "pending" | "sent" | "all";
  date?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("lead_reminders")
    .select(
      `*, lead:leads!lead_id(id, lead_name), user:users!user_id(id, full_name)`,
      { count: "exact" },
    );

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.status === "pending") {
    query = query.eq("is_done", false);
  } else if (params?.status === "sent") {
    query = query.eq("is_done", true);
  }

  if (params?.date) {
    query = query
      .gte("reminder_at", `${params.date}T00:00:00`)
      .lte("reminder_at", `${params.date}T23:59:59`);
  }

  const sortBy = params?.sortBy || "reminder_at";
  const ascending = params?.sortOrder !== "desc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching all reminders:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return {
    data: mapToCamelCase(data || []),
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

export async function getRemindersCount(params?: {
  userId?: string;
  status?: "pending" | "sent" | "all";
  date?: string;
}) {
  let query = supabase
    .from("lead_reminders")
    .select("id", { count: "exact", head: true });

  if (params?.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params?.status === "pending") {
    query = query.eq("is_done", false);
  } else if (params?.status === "sent") {
    query = query.eq("is_done", true);
  }

  if (params?.date) {
    query = query
      .gte("reminder_at", `${params.date}T00:00:00`)
      .lte("reminder_at", `${params.date}T23:59:59`);
  }

  const { count, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching reminders count:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return { count: count || 0 };
}

export async function getUpcomingLeadReminders(userId: string) {
  const now = new Date();
  const minus7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const plus48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("lead_reminders")
    .select(
      `
      id,
      lead_id,
      reminder_at,
      note,
      is_done,
      lead:leads!lead_id(id, lead_name)
    `,
    )
    .eq("user_id", userId)
    .eq("is_done", false)
    .gte("reminder_at", minus7d)
    .lte("reminder_at", plus48h)
    .order("reminder_at", { ascending: true })
    .limit(50);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching upcoming lead reminders:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return (data || []).map((r: any) => ({
    id: r.id as string,
    leadId: r.lead_id as string,
    reminderAt: r.reminder_at as string,
    note: (r.note ?? null) as string | null,
    isDone: r.is_done as boolean,
    leadName: (r.lead?.lead_name ?? null) as string | null,
  }));
}

export async function getLeadStatsByUser() {
  const { data, error } = await supabase
    .from("leads")
    .select("assigned_to, status")
    .eq("is_deleted", false);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead stats:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  // Group by user
  const userStats: Record<
    string,
    { total: number; byStatus: Record<string, number> }
  > = {};
  let unassignedCount = 0;

  for (const lead of data || []) {
    const l = lead as { assigned_to: string | null; status: string };
    if (!l.assigned_to) {
      unassignedCount++;
      continue;
    }
    if (!userStats[l.assigned_to]) {
      userStats[l.assigned_to] = { total: 0, byStatus: {} };
    }
    userStats[l.assigned_to].total++;
    userStats[l.assigned_to].byStatus[l.status] =
      (userStats[l.assigned_to].byStatus[l.status] || 0) + 1;
  }

  // Fetch user names
  const userIds = Object.keys(userStats);
  let users: any[] = [];
  if (userIds.length > 0) {
    const { data: userData } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    users = (userData || []).map((u: any) => ({
      ...mapToCamelCase(u),
      ...userStats[u.id],
    }));
  }

  return { users, unassignedCount };
}

export async function getLeadActivitiesLog(params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase.from("lead_activities").select(
    `*, user:users!user_id(id, full_name, avatar_url),
       lead:leads!lead_id(id, lead_name)`,
    { count: "exact" },
  );

  if (params?.startDate) {
    query = query.gte("created_at", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead activities log:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return {
    data: mapToCamelCase(data || []),
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// ===================
// LEAD ACTIVITY COUNTS BY USER
// ===================

/**
 * Count lead_activities per user_id.
 * Returns a map of userId → activity count.
 */
export async function getLeadActivitiesCountByUser(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("user_id");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching lead activities count by user:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const uid = (row as any).user_id;
    if (uid) counts[uid] = (counts[uid] || 0) + 1;
  }
  return counts;
}

/**
 * Count distinct leads worked on per user_id (from lead_activities).
 * Returns a map of userId → unique lead count.
 */
export async function getDistinctLeadsWorkedByUser(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("user_id, lead_id");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching distinct leads worked by user:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const leadSets: Record<string, Set<string>> = {};
  for (const row of data || []) {
    const uid = (row as any).user_id;
    const lid = (row as any).lead_id;
    if (uid && lid) {
      if (!leadSets[uid]) leadSets[uid] = new Set();
      leadSets[uid].add(lid);
    }
  }

  const result: Record<string, number> = {};
  for (const [uid, ledSet] of Object.entries(leadSets)) {
    result[uid] = ledSet.size;
  }
  return result;
}
