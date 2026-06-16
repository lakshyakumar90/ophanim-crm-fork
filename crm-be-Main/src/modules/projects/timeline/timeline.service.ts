import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import type { AuthUser } from "../../../types/api.types.js";
import { checkProjectAccess } from "../notes/notes.service.js";
import { getProjectById } from "../projects/projects.service.js";

export interface TimelineEvent {
  id: string;
  type: "milestone" | "sprint" | "task" | "time_entry" | "activity";
  title: string;
  description?: string | null;
  status?: string | null;
  date: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectTimeline {
  projectId: string;
  projectName: string;
  events: TimelineEvent[];
  summary: {
    milestonesTotal: number;
    milestonesCompleted: number;
    sprintsTotal: number;
    sprintsActive: number;
    tasksTotal: number;
    tasksCompleted: number;
    hoursLogged: number;
  };
}

export async function getProjectTimeline(
  projectId: string,
  authUser: AuthUser,
): Promise<ProjectTimeline> {
  const hasAccess = await checkProjectAccess(projectId, authUser);
  if (!hasAccess) {
    throw new ApiError(ERROR_CODES.FORBIDDEN);
  }

  const project = await getProjectById(projectId);
  const events: TimelineEvent[] = [];

  const [milestonesRes, sprintsRes, tasksRes, timeEntriesRes, activityRes] =
    await Promise.all([
      supabaseAdmin
        .from("project_milestones")
        .select("id, name, description, status, due_date, completed_at, created_at")
        .eq("project_id", projectId),
      supabaseAdmin
        .from("sprints")
        .select("id, name, goal, status, start_date, end_date, created_at")
        .eq("project_id", projectId),
      supabaseAdmin
        .from("tasks")
        .select("id, title, description, status, due_date, completed_at, created_at")
        .eq("project_id", projectId)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("time_entries")
        .select("id, hours, entry_date, status, description, created_at")
        .eq("project_id", projectId),
      supabaseAdmin
        .from("activity_events")
        .select("id, event_type, entity_name, metadata, created_at")
        .eq("entity_type", "project")
        .eq("entity_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  for (const m of milestonesRes.data || []) {
    events.push({
      id: m.id,
      type: "milestone",
      title: m.name,
      description: m.description,
      status: m.status,
      date: m.due_date || m.created_at,
      metadata: { completedAt: m.completed_at },
    });
  }

  for (const s of sprintsRes.data || []) {
    events.push({
      id: s.id,
      type: "sprint",
      title: s.name,
      description: s.goal,
      status: s.status,
      date: s.start_date || s.created_at,
      metadata: { startDate: s.start_date, endDate: s.end_date },
    });
  }

  for (const t of tasksRes.data || []) {
    events.push({
      id: t.id,
      type: "task",
      title: t.title,
      description: t.description,
      status: t.status,
      date: t.due_date || t.created_at,
      metadata: { completedAt: t.completed_at },
    });
  }

  for (const te of timeEntriesRes.data || []) {
    events.push({
      id: te.id,
      type: "time_entry",
      title: `${te.hours}h logged`,
      description: te.description,
      status: te.status,
      date: te.entry_date,
      metadata: { hours: te.hours },
    });
  }

  for (const a of activityRes.data || []) {
    events.push({
      id: a.id,
      type: "activity",
      title: a.entity_name || a.event_type,
      description: null,
      status: null,
      date: a.created_at,
      metadata: { eventType: a.event_type, ...(a.metadata || {}) },
    });
  }

  events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const milestones = milestonesRes.data || [];
  const sprints = sprintsRes.data || [];
  const tasks = tasksRes.data || [];
  const timeEntries = timeEntriesRes.data || [];

  return {
    projectId,
    projectName: project.name,
    events,
    summary: {
      milestonesTotal: milestones.length,
      milestonesCompleted: milestones.filter((m) => m.status === "completed").length,
      sprintsTotal: sprints.length,
      sprintsActive: sprints.filter((s) => s.status === "active").length,
      tasksTotal: tasks.length,
      tasksCompleted: tasks.filter((t) => t.status === "completed").length,
      hoursLogged: timeEntries.reduce(
        (sum, te) => sum + Number(te.hours || 0),
        0,
      ),
    },
  };
}
