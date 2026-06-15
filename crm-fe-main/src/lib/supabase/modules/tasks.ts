import { supabase } from "../../supabase";
import { mapToCamelCase } from "../map-to-camel";

// ===================
// TASKS
// ===================

export async function getTasks(params?: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assignedTo?: string;
  relatedLeadId?: string;
  projectId?: string;
  overdue?: boolean;
  dueToday?: boolean;
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
    .from("tasks")
    .select(
      `id, title, description, task_type, related_lead_id, project_id,
       assigned_to, assigned_by, priority, status, due_date, completed_at,
       reminder_before_minutes, department_id,
       tags, is_deleted, created_at, updated_at,
       assigned_user:users!assigned_to(id, full_name, avatar_url, email, department_id),
       department:departments!department_id(id, name, slug),
       project:projects!project_id(id, name)`,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  if (params?.status) {
    const statuses = params.status.split(",").map((s) => s.trim());
    query = query.in("status", statuses);
  }

  if (params?.priority) {
    const priorities = params.priority.split(",").map((p) => p.trim());
    query = query.in("priority", priorities);
  }

  if (params?.assignedTo) {
    query = query.eq("assigned_to", params.assignedTo);
  }

  if (params?.relatedLeadId) {
    query = query.eq("related_lead_id", params.relatedLeadId);
  }

  if (params?.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params?.overdue) {
    query = query
      .lt("due_date", new Date().toISOString())
      .neq("status", "completed")
      .neq("status", "cancelled");
  }

  if (params?.dueToday) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    query = query
      .gte("due_date", todayStart.toISOString())
      .lte("due_date", todayEnd.toISOString());
  }

  if (params?.startDate) {
    query = query.gte("due_date", params.startDate);
  }
  if (params?.endDate) {
    query = query.lte("due_date", params.endDate);
  }

  const sortBy = params?.sortBy || "created_at";
  const ascending = params?.sortOrder === "asc";
  query = query.order(sortBy, { ascending }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching tasks:", (error as any)?.message || (error as any)?.code || String(error));
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

export async function getTaskById(id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching task:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data);
}

export async function getTaskSummary() {
  const { data, error } = await supabase
    .from("tasks")
    .select("status, due_date")
    .eq("is_deleted", false);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching task summary:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  const now = new Date().toISOString();
  const summary = {
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  for (const task of data || []) {
    const t = task as { status: string; due_date: string | null };
    summary.total++;
    if (t.status === "todo") summary.todo++;
    if (t.status === "in_progress") summary.inProgress++;
    if (t.status === "completed") summary.completed++;
    if (
      t.due_date &&
      t.due_date < now &&
      t.status !== "completed" &&
      t.status !== "cancelled"
    ) {
      summary.overdue++;
    }
  }

  return summary;
}

export async function getTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, user:users!user_id(id, full_name, avatar_url)`)
    .eq("entity_type", "task")
    .eq("entity_id", taskId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("Error fetching task comments:", (error as any)?.message || (error as any)?.code || String(error));
    throw error;
  }

  return mapToCamelCase(data || []);
}

// ===================
// UPCOMING REMINDERS (direct Supabase — tasks assigned to current user with reminders due)
// ===================

export async function getUpcomingReminders(userId: string) {
  const now = new Date().toISOString();
  const plus48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id, title, due_date, reminder_before_minutes, priority, status, project_id,
      project:projects!project_id(id, name)
    `)
    .eq("assigned_to", userId)
    .not("reminder_before_minutes", "is", null)
    .not("due_date", "is", null)
    .not("status", "in", '("completed","cancelled")')
    .lte("due_date", plus48h)
    .gte("due_date", now)
    .order("due_date", { ascending: true })
    .limit(20);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[supabase] getUpcomingReminders:", (error as any)?.message || (error as any)?.code || error);
    throw error;
  }

  return (data || []).map((t: any) => ({
    id: t.id as string,
    title: t.title as string,
    dueDate: t.due_date as string,
    reminderBeforeMinutes: t.reminder_before_minutes as number,
    priority: t.priority as string,
    status: t.status as string,
    projectId: (t.project_id ?? null) as string | null,
    projectName: (t.project?.name ?? null) as string | null,
  }));
}
