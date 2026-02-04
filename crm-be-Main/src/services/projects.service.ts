import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { USER_ROLES } from "../config/constants.js";
import { getCurrentTimestamp } from "../utils/helpers.js";
import type { AuthUser } from "../types/api.types.js";
import { Database } from "../types/database.types.js";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

type ProjectMemberRow = Database["public"]["Tables"]["project_members"]["Row"];
type ProjectMemberInsert =
  Database["public"]["Tables"]["project_members"]["Insert"];

// Public Interface for Project
export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  clientName: string | null;
  leadId: string | null;
  managerId: string;
  status: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  manager?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  members?: ProjectMemberRecord[];
}

export interface ProjectMemberRecord {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  allocationPercentage: number;
  joinedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

// Mappers
function mapProjectMemberRow(
  row: ProjectMemberRow & { user?: any },
): ProjectMemberRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    allocationPercentage: row.allocation_percentage,
    joinedAt: row.joined_at,
    user: row.user
      ? {
          id: row.user.id,
          fullName: row.user.full_name,
          email: row.user.email,
          avatarUrl: row.user.avatar_url,
        }
      : undefined,
  };
}

function mapProjectRow(
  row: ProjectRow & { manager?: any; members?: any[] },
): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    clientName: row.client_name,
    leadId: row.lead_id,
    managerId: row.manager_id,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manager: row.manager
      ? {
          id: row.manager.id,
          fullName: row.manager.full_name,
          avatarUrl: row.manager.avatar_url,
        }
      : undefined,
    members: row.members
      ? row.members.map((m) => mapProjectMemberRow(m))
      : undefined,
  };
}

/**
 * Get Projects (Filtered by Role)
 * OPTIMIZED: Employee query now uses inner join instead of 2 sequential queries
 */
export async function getProjects(
  authUser: AuthUser,
): Promise<ProjectRecord[]> {
  // For employees, use a different query structure with inner join
  if (authUser.role === USER_ROLES.EMPLOYEE) {
    // Use inner join to filter projects where user is a member - single query
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select(
        `
        *,
        manager:users!manager_id(id, full_name, avatar_url),
        members:project_members!inner(
          *,
          user:users(id, full_name, avatar_url)
        )
      `,
      )
      .eq("members.user_id", authUser.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
    }

    return (data || []).map((row: any) => mapProjectRow(row));
  }

  // For managers and admins, use normal query
  let query = supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, avatar_url)
      )
    `,
    )
    .order("updated_at", { ascending: false });

  if (authUser.role === USER_ROLES.MANAGER) {
    // Managers see projects they manage
    query = query.eq("manager_id", authUser.id);
  }
  // Admin sees all

  const { data, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row: any) => mapProjectRow(row));
}

/**
 * Get Project By ID
 */
export async function getProjectById(
  projectId: string,
): Promise<ProjectRecord> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, email, avatar_url)
      )
    `,
    )
    .eq("id", projectId)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Project");
  }

  return mapProjectRow(data as any);
}

/**
 * Create Project
 */
export async function createProject(
  input: {
    name: string;
    description?: string | null;
    clientName?: string | null;
    leadId?: string | null;
    managerId: string; // The assigned PM
    priority?: "low" | "medium" | "high";
    startDate?: string | null;
    endDate?: string | null;
    // Optional team members to add on creation
    teamMembers?: { userId: string; role: string }[];
  },
  createdByRole: string, // Admin or Manager
  currentUserId: string,
): Promise<ProjectRecord> {
  // If Manager is creating, they likely assign themselves or are assigned automatically.
  // We assume validation happens in controller.

  // Validate leadId - ensure the lead exists and has 'won' status
  if (input.leadId) {
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id, status")
      .eq("id", input.leadId)
      .eq("is_deleted", false)
      .single();

    if (leadError || !leadData) {
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Lead not found");
    }

    if (leadData.status !== "won") {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Only leads with 'won' status can be linked to projects",
      );
    }
  }

  const insertData: ProjectInsert = {
    name: input.name,
    description: input.description,
    client_name: input.clientName,
    lead_id: input.leadId,
    manager_id: input.managerId,
    priority: input.priority || "medium",
    status: "planned",
    start_date: input.startDate
      ? new Date(input.startDate).toISOString()
      : null,
    end_date: input.endDate ? new Date(input.endDate).toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert(insertData)
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url)
    `,
    )
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Auto-add manager as a member too? Usually yes, but with special role 'Project Manager'
  // Let's add them as 'Project Manager' in members table for consistency in logic "My Projects"
  await addProjectMember({
    projectId: data.id,
    userId: input.managerId,
    role: "project_manager",
    allocationPercentage: 100,
  });

  // Add additional team members if provided
  if (input.teamMembers && input.teamMembers.length > 0) {
    for (const member of input.teamMembers) {
      // Skip if this is the manager (already added)
      if (member.userId === input.managerId) continue;

      try {
        await addProjectMember({
          projectId: data.id,
          userId: member.userId,
          role: member.role,
          allocationPercentage: 100,
        });
      } catch (err) {
        // Log but don't fail if a member couldn't be added (e.g., duplicate)
        console.warn(`Could not add member ${member.userId}: ${err}`);
      }
    }
  }

  return mapProjectRow(data as any);
}

/**
 * Update Project
 */
export async function updateProject(
  projectId: string,
  input: {
    name?: string;
    description?: string | null;
    clientName?: string | null;
    status?: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
    priority?: "low" | "medium" | "high";
    startDate?: string | null;
    endDate?: string | null;
    managerId?: string; // Reassign PM
  },
): Promise<ProjectRecord> {
  const updateData: ProjectUpdate = {
    updated_at: getCurrentTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.clientName !== undefined) updateData.client_name = input.clientName;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.managerId !== undefined) updateData.manager_id = input.managerId;

  if (input.startDate !== undefined)
    updateData.start_date = input.startDate
      ? new Date(input.startDate).toISOString()
      : null;

  if (input.endDate !== undefined)
    updateData.end_date = input.endDate
      ? new Date(input.endDate).toISOString()
      : null;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(updateData)
    .eq("id", projectId)
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url)
    `,
    )
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapProjectRow(data as any);
}

/**
 * Delete Project
 */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Add Project Member
 */
export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role: string;
  allocationPercentage?: number;
}): Promise<ProjectMemberRecord> {
  // Check if already exists
  const { data: existing } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .single();

  if (existing) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "User is already a member of this project",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("project_members")
    .insert({
      project_id: input.projectId,
      user_id: input.userId,
      role: input.role,
      allocation_percentage: input.allocationPercentage || 100,
    })
    .select(
      `
      *,
      user:users(id, full_name, email, avatar_url)
    `,
    )
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return mapProjectMemberRow(data as any);
}

/**
 * Remove Project Member
 */
export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

/**
 * Update Project Member (e.g. Role or Allocation)
 */
export async function updateProjectMember(
  projectId: string,
  userId: string,
  update: { role?: string; allocationPercentage?: number },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("project_members")
    .update({
      role: update.role,
      allocation_percentage: update.allocationPercentage,
    })
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }
}

// =========================================
// Dashboard & Analytics Functions
// =========================================

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  planned: number;
  cancelled: number;
  idle: number;
  byManager: {
    managerId: string;
    managerName: string;
    managerAvatar: string | null;
    projectCount: number;
    activeCount: number;
    completedCount: number;
    taskCompletionRate?: number; // New
    overdueTasks?: number; // New
  }[];
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  teamWorkload?: {
    // New
    userId: string;
    userName: string;
    activeTasks: number;
  }[];
  totalOverdueTasks: number; // New
}

/**
 * Get Project Statistics for Dashboard
 * Admin sees all, PM sees only their projects
 */
export async function getProjectStats(
  authUser: AuthUser,
): Promise<ProjectStats> {
  // Get all projects based on role
  let query = supabaseAdmin.from("projects").select(
    `
      id,
      status,
      priority,
      manager_id,
      updated_at,
      manager:users!manager_id(id, full_name, avatar_url)
    `,
  );

  if (authUser.role === USER_ROLES.MANAGER) {
    query = query.eq("manager_id", authUser.id);
  } else if (authUser.role === USER_ROLES.EMPLOYEE) {
    // Get projects where employee is a member
    const { data: memberData } = await supabaseAdmin
      .from("project_members")
      .select("project_id")
      .eq("user_id", authUser.id);

    const projectIds = (memberData || []).map((m) => m.project_id);
    if (projectIds.length === 0) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        onHold: 0,
        planned: 0,
        cancelled: 0,
        idle: 0,
        byManager: [],
        byPriority: { high: 0, medium: 0, low: 0 },
        totalOverdueTasks: 0,
      };
    }
    query = query.in("id", projectIds);
  }
  // Admin sees all

  const { data: projects, error } = await query;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const allProjects = projects || [];
  const projectIds = allProjects.map((p) => p.id);

  // Fetch task stats related to these projects
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, status, due_date, project_id, assignee_id")
    .in("project_id", projectIds);

  const allTasks = tasks || [];
  const today = new Date().toISOString().split("T")[0] || "";
  const overdueTasks = allTasks.filter(
    (t: any) => t.due_date && t.due_date < today && t.status !== "done",
  );

  // Calculate idle projects (not completed, no update in 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const idleProjects = allProjects.filter((p: any) => {
    if (p.status === "completed" || p.status === "cancelled") return false;
    const updatedAt = new Date(p.updated_at);
    return updatedAt < sevenDaysAgo;
  });

  // Group by manager
  const managerMap = new Map<
    string,
    {
      managerId: string;
      managerName: string;
      managerAvatar: string | null;
      projectCount: number;
      activeCount: number;
      completedCount: number;
      totalTasks: number;
      completedTasks: number;
      overdueTasks: number;
    }
  >();

  // Initialize managers from projects
  for (const p of allProjects as any[]) {
    const managerId = p.manager_id;
    const manager = p.manager;
    if (!managerMap.has(managerId)) {
      managerMap.set(managerId, {
        managerId,
        managerName: manager?.full_name || "Unknown",
        managerAvatar: manager?.avatar_url || null,
        projectCount: 0,
        activeCount: 0,
        completedCount: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      });
    }
    const entry = managerMap.get(managerId)!;
    entry.projectCount++;
    if (p.status === "in_progress") entry.activeCount++;
    if (p.status === "completed") entry.completedCount++;
  }

  // Aggregate task stats per manager's projects
  for (const t of allTasks as any[]) {
    const project = allProjects.find((p) => p.id === t.project_id) as any;
    if (project && managerMap.has(project.manager_id)) {
      const entry = managerMap.get(project.manager_id)!;
      entry.totalTasks++;
      if (t.status === "done") entry.completedTasks++;
      if (t.due_date && t.due_date < today && t.status !== "done")
        entry.overdueTasks++;
    }
  }

  const byManager = Array.from(managerMap.values()).map((m) => ({
    ...m,
    taskCompletionRate:
      m.totalTasks > 0
        ? Math.round((m.completedTasks / m.totalTasks) * 100)
        : 0,
  }));

  // Count by priority
  const byPriority = { high: 0, medium: 0, low: 0 };
  for (const p of allProjects as any[]) {
    if (p.priority === "high") byPriority.high++;
    else if (p.priority === "medium") byPriority.medium++;
    else if (p.priority === "low") byPriority.low++;
  }

  // Workload (Admin/Manager only)
  let teamWorkload = undefined;
  if (
    authUser.role === USER_ROLES.ADMIN ||
    authUser.role === USER_ROLES.MANAGER
  ) {
    const workloadMap = new Map<
      string,
      { userId: string; userName: string; activeTasks: number }
    >();

    // Get user details for task assignees (simplified - fetching all users might be heavy, assume assignee_id is enough if we join)
    // For now, simpler approach: just count tasks per assignee ID
    // Note: To get names, we'd need to join users. Let's do a quick separate fetch for active assignees
    const assigneeIds = [
      ...new Set(
        allTasks
          .filter((t: any) => t.status !== "done" && t.assignee_id)
          .map((t: any) => t.assignee_id),
      ),
    ];

    if (assigneeIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, full_name")
        .in("id", assigneeIds);
      const userMap = new Map(
        (users || []).map((u: any) => [u.id, u.full_name]),
      );

      for (const t of allTasks as any[]) {
        if (t.status !== "done" && t.assignee_id) {
          const name = userMap.get(t.assignee_id) || "Unknown";
          if (!workloadMap.has(t.assignee_id)) {
            workloadMap.set(t.assignee_id, {
              userId: t.assignee_id,
              userName: name,
              activeTasks: 0,
            });
          }
          const entry = workloadMap.get(t.assignee_id)!;
          entry.activeTasks++;
        }
      }
    }
    teamWorkload = Array.from(workloadMap.values())
      .sort((a, b) => b.activeTasks - a.activeTasks)
      .slice(0, 5); // Top 5 busy
  }

  return {
    total: allProjects.length,
    active: allProjects.filter((p: any) => p.status === "in_progress").length,
    completed: allProjects.filter((p: any) => p.status === "completed").length,
    onHold: allProjects.filter((p: any) => p.status === "on_hold").length,
    planned: allProjects.filter((p: any) => p.status === "planned").length,
    cancelled: allProjects.filter((p: any) => p.status === "cancelled").length,
    idle: idleProjects.length,
    byManager,
    byPriority,
    totalOverdueTasks: overdueTasks.length,
    teamWorkload,
  };
}

/**
 * Get Idle Projects (not completed, no activity for 7 days)
 * Admin only
 */
export async function getIdleProjects(): Promise<ProjectRecord[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, avatar_url)
      )
    `,
    )
    .not("status", "in", '("completed","cancelled")')
    .lt("updated_at", sevenDaysAgo.toISOString())
    .order("updated_at", { ascending: true });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row: any) => mapProjectRow(row));
}

/**
 * Get Projects by Manager ID
 */
export async function getProjectsByManagerId(
  managerId: string,
): Promise<ProjectRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, avatar_url)
      )
    `,
    )
    .eq("manager_id", managerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (data || []).map((row: any) => mapProjectRow(row));
}

/**
 * Get All Project Members with their job titles for resource management
 */
export async function getProjectResources(authUser: AuthUser): Promise<{
  developers: any[];
  designers: any[];
  seoSpecialists: any[];
  contentWriters: any[];
  projectManagers: any[];
}> {
  // Get all active users with job titles
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, avatar_url, job_title, role")
    .eq("is_active", true)
    .not("job_title", "is", null);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const allUsers = users || [];

  return {
    developers: allUsers.filter((u: any) => u.job_title === "developer"),
    designers: allUsers.filter((u: any) => u.job_title === "designer"),
    seoSpecialists: allUsers.filter(
      (u: any) => u.job_title === "seo_specialist",
    ),
    contentWriters: allUsers.filter(
      (u: any) => u.job_title === "content_writer",
    ),
    projectManagers: allUsers.filter(
      (u: any) =>
        u.job_title === "project_manager" ||
        u.role === "admin" ||
        u.role === "manager",
    ),
  };
}

/**
 * Get "My Projects" for team members
 */
export async function getMyProjects(userId: string): Promise<ProjectRecord[]> {
  // 1. Get Project IDs where user is a member
  const { data: memberData, error: memberError } = await supabaseAdmin
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);

  if (memberError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, memberError.message);
  }

  const projectIds = (memberData || []).map((m) => m.project_id);

  if (projectIds.length === 0) {
    return [];
  }

  // 2. Get full project details
  const { data: projects, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, avatar_url)
      )
    `,
    )
    .in("id", projectIds)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return (projects || []).map((row: any) => mapProjectRow(row));
}

/**
 * Get Project Dashboard Stats (Tasks Progress & Upcoming)
 */
export async function getProjectDashboardStats(projectId: string): Promise<{
  taskProgress: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  upcomingTasks: any[];
  teamMembers: any[];
}> {
  // 1. Get Task Stats
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, due_date, priority, assignee_id")
    .eq("project_id", projectId);

  if (tasksError) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, tasksError.message);
  }

  const allTasks = tasks || [];
  const total = allTasks.length;
  const completed = allTasks.filter((t) => t.status === "done").length;
  const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
  const todo = allTasks.filter(
    (t) => t.status === "todo" || t.status === "review",
  ).length;

  const today = new Date().toISOString().split("T")[0] || "";
  const upcomingTasks = allTasks
    .filter((t) => t.status !== "done" && t.due_date && t.due_date >= today)
    .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))
    .slice(0, 5);

  // 2. Get Team Members with Roles (Explicitly to ensure we have them)
  // Re-fetching might be redundant if we use getProjectById, but this ensures we get specific details if needed
  // Let's rely on the project details fetch for team members, but we can augment if needed.
  // Actually, let's just return the task stats and let the frontend use existing team data,
  // OR we can fetch refined team stats here if "team view" needs more than just list.
  // For now, let's just return task stats and upcoming tasks.

  return {
    taskProgress: {
      total,
      completed,
      inProgress,
      todo,
    },
    upcomingTasks,
    teamMembers: [], // Placeholder if we want to move team logic here
  };
}
