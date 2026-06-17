import { supabase } from "../../supabase";
import { mapToCamelCase } from "../map-to-camel";

// ===================
// PROJECTS
// ===================

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, manager:users!manager_id(id, full_name, avatar_url),
       members:project_members(id, user_id, role, allocation_percentage,
         user:users!user_id(id, full_name, avatar_url, job_title))`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[supabase] getProjects:", (error as any)?.message || (error as any)?.code || error);
    throw error;
  }

  return mapToCamelCase(data || []);
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, manager:users!manager_id(id, full_name, avatar_url, email),
       lead:leads!lead_id(id, lead_name, business_name, status, email, phone),
       members:project_members(id, user_id, role, allocation_percentage,
         user:users!user_id(id, full_name, avatar_url, job_title, email))`,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[supabase] getProjectById:", (error as any)?.message || (error as any)?.code || error);
    throw error;
  }

  return mapToCamelCase(data);
}

// ===================
// PROJECT NOTES (direct Supabase — requires 052_fix_pm_rls migration)
// ===================

export async function getProjectNotes(projectId: string) {
  const { data, error } = await supabase
    .from("project_notes")
    .select("*, user:users!user_id(id, full_name, avatar_url, email)")
    .eq("project_id", projectId)
    .eq("is_private", false)
    .order("created_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[supabase] getProjectNotes:", (error as any)?.message || (error as any)?.code || error);
    throw error;
  }

  return (data || []).map((note: any) => ({
    id: note.id as string,
    projectId: note.project_id as string,
    userId: note.user_id as string | null,
    userName: (note.user?.full_name || note.user?.email || "Unknown") as string,
    userAvatar: (note.user?.avatar_url || null) as string | null,
    content: note.content as string,
    isPinned: note.is_pinned as boolean,
    createdAt: note.created_at as string,
    updatedAt: note.updated_at as string,
  }));
}

// ===================
// PROJECT ACTIVITIES (direct Supabase via all_activities view)
// ===================

export async function getProjectActivities(params: {
  projectId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const limit = params.limit || 500;

  let query = supabase
    .from("all_activities" as any)
    .select("*")
    .eq("entity_id", params.projectId)
    .eq("entity_type", "project")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.startDate) query = query.gte("created_at", params.startDate);
  if (params.endDate) query = query.lte("created_at", params.endDate);

  const { data, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[supabase] getProjectActivities:", (error as any)?.message || (error as any)?.code || error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    entity_id: row.entity_id,
    activity_type: row.activity_type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    created_at: row.created_at,
    entity_type: row.entity_type,
    user: row.user_id
      ? {
          id: row.user_id,
          full_name: row.user_name,
          email: row.user_email,
          avatar_url: row.user_avatar,
        }
      : null,
  }));
}
