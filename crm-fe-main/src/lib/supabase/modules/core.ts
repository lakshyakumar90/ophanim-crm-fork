import { supabase } from "../../supabase";
import { mapToCamelCase } from "../map-to-camel";

// ===================
// DEPARTMENTS
// ===================

export async function getDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching departments:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// TEAMS
// ===================

export async function getTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("*, manager:users!manager_id(id, full_name, avatar_url), department:departments(name)")
    .order("name");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching teams:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  // Fetch member counts efficiently
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("team_id")
    .eq("is_active", true)
    .not("team_id", "is", null);

  const memberCounts: Record<string, number> = {};
  if (usersData && !usersError) {
    usersData.forEach((u: any) => {
      if (u.team_id) {
        memberCounts[u.team_id] = (memberCounts[u.team_id] || 0) + 1;
      }
    });
  }

  const teamsWithCounts = (data || []).map((t: any) => ({
    ...t,
    member_count: memberCounts[t.id] || 0,
  }));

  return mapToCamelCase(teamsWithCounts);
}

// ===================
// USERS
// ===================

export async function getUsers(params?: {
  page?: number;
  limit?: number;
  role?: string;
  departmentId?: string;
  teamId?: string;
  isActive?: boolean;
  search?: string;
  jobTitle?: string;
  shiftType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const limit = params?.limit || 50;
  const page = params?.page || 1;
  const offset = (page - 1) * limit;

  let query = supabase.from("users").select(
    `id, email, full_name, role, team_id, department_id, phone, job_title,
       avatar_url, is_active, last_login, created_at, updated_at,
       theme_preference, primary_color, is_2fa_enabled, shift_type`,
    { count: "exact" },
  );

  if (params?.role) {
    const roles = params.role.split(",").map((r) => r.trim());
    if (roles.length === 1) {
      query = query.eq("role", roles[0]);
    } else {
      query = query.in("role", roles);
    }
  }

  if (params?.departmentId) {
    query = query.eq("department_id", params.departmentId);
  }

  if (params?.teamId) {
    query = query.eq("team_id", params.teamId);
  }

  if (params?.isActive !== undefined) {
    query = query.eq("is_active", params.isActive);
  }

  if (params?.shiftType) {
    query = query.eq("shift_type", params.shiftType);
  }

  if (params?.jobTitle) {
    const jobTitles = params.jobTitle.split(",").map((title) => title.trim());
    if (jobTitles.length === 1) {
      query = query.eq("job_title", jobTitles[0]);
    } else {
      query = query.in("job_title", jobTitles);
    }
  }

  if (params?.search) {
    query = query.or(
      `full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
    );
  }

  const sortBy = params?.sortBy || "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching users:", (error as any)?.message || (error as any)?.code || String(error));
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

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from("users")
    .select(
      `id, email, full_name, role, team_id, department_id, phone, job_title,
       avatar_url, is_active, last_login, created_at, updated_at,
       theme_preference, primary_color, is_2fa_enabled, shift_type`,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching user:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data);
}

export async function getProjectManagers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, role, department_id")
    .in("role", ["admin", "manager"])
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching project managers:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getUsersByJobTitle(titles: string[]) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, role, job_title, department_id")
    .in("job_title", titles)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching users by job title:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getJobTitles(roleType?: "employee" | "manager") {
  let query = supabase
    .from("users")
    .select("job_title")
    .not("job_title", "is", null)
    .eq("is_active", true);

  if (roleType) {
    query = query.eq("role", roleType);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching job titles:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const uniqueTitles = [
    ...new Set((data || []).map((d: any) => d.job_title).filter(Boolean)),
  ];
  return uniqueTitles;
}

export async function getTeamById(id: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(`*, manager:users!manager_id(id, full_name, avatar_url), department:departments(id, name)`)
    .eq("id", id)
    .single();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching team by id:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data);
}

export async function getTeamMembers(teamId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role, avatar_url, job_title")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching team members:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// SAVED FILTERS
// ===================

export async function getSavedFilters(filterType?: string) {
  let query = supabase
    .from("saved_filters")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterType) {
    query = query.eq("filter_type", filterType);
  }

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching saved filters:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// ROLES (direct Supabase)
// ===================

export async function getRoles() {
  const { data, error } = await supabase
    .from("roles")
    .select(`
      id, name, slug, scope, department_id, department_ids, permissions,
      is_system, created_at, updated_at,
      department:departments!department_id(id, name, slug)
    `)
    .order("name", { ascending: true });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[supabase] getRoles:", (error as any)?.message || (error as any)?.code || error);
    throw error;
  }

  return (data || []).map((r: any) => ({
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    scope: r.scope as "global" | "department",
    departmentId: (r.department_id ?? null) as string | null,
    departmentIds: (r.department_ids ?? []) as string[],
    departmentName: (r.department?.name ?? null) as string | null,
    departmentSlug: (r.department?.slug ?? null) as string | null,
    permissions: (r.permissions ?? []) as string[],
    isSystem: r.is_system as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}
