import { supabaseAdmin } from "../../../config/supabase.js";
import { ApiError } from "../../../utils/responses.js";
import { ERROR_CODES } from "../../../utils/error-codes.js";
import { USER_ROLES } from "../../../config/constants.js";
import { getCurrentTimestamp } from "../../../utils/helpers.js";
import type { AuthUser } from "../../../types/api.types.js";
import { Database } from "../../../types/database.types.js";
import { logger } from "../../../utils/logger.js";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

type ProjectMemberRow = Database["public"]["Tables"]["project_members"]["Row"];
type ProjectMemberInsert =
  Database["public"]["Tables"]["project_members"]["Insert"];

interface ResolvedUserPermissions {
  role: string;
  permissions: string[];
  isGlobal: boolean;
}

async function getResolvedUserPermissions(
  userId: string,
): Promise<ResolvedUserPermissions> {
  const [{ data: userRow, error: userError }, { data: permRow }] =
    await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, role")
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("user_resolved_permissions" as any)
        .select("permissions, is_global")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (userError || !userRow) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, "User not found");
  }

  return {
    role: userRow.role,
    permissions: (permRow as any)?.permissions ?? [],
    isGlobal: ((permRow as any)?.is_global ?? false) as boolean,
  };
}

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
    email?: string;
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
          fullName: row.user.full_name || row.user.email || "Unknown User",
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
          fullName: row.manager.full_name || row.manager.email || "Unknown User",
          email: row.manager.email,
          avatarUrl: row.manager.avatar_url,
        }
      : undefined,
    members: row.members
      ? row.members.map((m) => mapProjectMemberRow(m))
      : undefined,
  };
}

// Short-lived in-memory cache to deduplicate concurrent requests for the same user
const _accessibleProjectsCache = new Map<string, { ids: string[] | null; expiresAt: number }>();

async function getAccessibleProjectIds(authUser: AuthUser): Promise<string[] | null> {
  // Only true admins and globally-scoped role users can see ALL projects.
  // A globally-scoped role (scope = 'global') is what makes someone an operations manager
  // or similar cross-department overseer. Department-scoped managers (including PMs)
  // only see projects they are explicitly assigned to.
  const isAdmin =
    authUser.role === USER_ROLES.ADMIN ||
    authUser.permissions.includes("crm:admin") ||
    authUser.isGlobal === true;

  if (isAdmin) {
    return null; // null = all projects
  }

  // Cache hit: return previously computed IDs (valid for 5 seconds)
  const cached = _accessibleProjectsCache.get(authUser.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ids;
  }

  // Everyone else can only see projects they are explicitly part of:
  //   1. Listed as manager_id on the project
  //   2. Listed in project_members (any role — developer, designer, project_manager, etc.)
  const [managerRes, memberRes] = await Promise.all([
    supabaseAdmin.from("projects").select("id").eq("manager_id", authUser.id),
    supabaseAdmin.from("project_members").select("project_id").eq("user_id", authUser.id),
  ]);

  if (managerRes.error) {
    logger.warn({ userId: authUser.id, error: managerRes.error.message }, "projects: error fetching manager projects");
  }
  if (memberRes.error) {
    logger.warn({ userId: authUser.id, error: memberRes.error.message }, "projects: error fetching member projects");
  }

  const managerProjectIds = managerRes.data?.map((p: any) => p.id) || [];
  const memberProjectIds = memberRes.data?.map((m: any) => m.project_id) || [];
  const allIds = Array.from(new Set([...managerProjectIds, ...memberProjectIds]));

  logger.info(
    { userId: authUser.id, role: authUser.role, isGlobal: authUser.isGlobal, managerCount: managerProjectIds.length, memberCount: memberProjectIds.length, total: allIds.length },
    "[getAccessibleProjectIds] result",
  );

  _accessibleProjectsCache.set(authUser.id, { ids: allIds, expiresAt: Date.now() + 5000 });

  return allIds;
}

/**
 * Get Projects (Filtered by Role)
 * Features role-based visibility rules spanning direct assignment and team management.
 */
export async function getProjects(
  authUser: AuthUser,
): Promise<ProjectRecord[]> {
  const projectIds = await getAccessibleProjectIds(authUser);

  if (projectIds !== null && projectIds.length === 0) {
    return [];
  }

  let query = supabaseAdmin
    .from("projects")
    .select(`
      *,
      manager:users!manager_id(id, full_name, email, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, email, avatar_url)
      )
    `)
    .order("updated_at", { ascending: false });

  if (projectIds !== null) {
    query = query.in("id", projectIds);
  }

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
      manager:users!manager_id(id, full_name, email, avatar_url),
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
      manager:users!manager_id(id, full_name, email, avatar_url)
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
      manager:users!manager_id(id, full_name, email, avatar_url)
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
  // Enforce that the target user is actually allowed to work on projects:
  // they must either be admin/global (crm:admin / isGlobal) or have at least
  // one explicit `projects:*` permission assigned via RBAC.
  const resolved = await getResolvedUserPermissions(input.userId);
  const isAdminOrGlobal =
    resolved.role === USER_ROLES.ADMIN ||
    resolved.isGlobal ||
    resolved.permissions.includes("crm:admin");
  const hasProjectPermission = resolved.permissions.some((p) =>
    p.startsWith("projects:"),
  );

  if (!isAdminOrGlobal && !hasProjectPermission) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      "User does not have project-related permissions and cannot be added to projects",
    );
  }

  // Check if this user+role combo already exists (multi-role is allowed)
  const { data: existing } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .eq("role", input.role)
    .single();

  if (existing) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "User already has this role on the project",
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
 * Admin sees all, PM/Manager sees their projects, Employee sees assigned
 */
export async function getProjectStats(
  authUser: AuthUser,
): Promise<ProjectStats> {
  const projectIds = await getAccessibleProjectIds(authUser);

  if (projectIds !== null && projectIds.length === 0) {
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

  // Get all projects based on role
  let baseQuery = supabaseAdmin.from("projects").select(
    `
      id,
      status,
      priority,
      manager_id,
      updated_at,
      manager:users!manager_id(id, full_name, email, avatar_url)
    `,
  );

  if (projectIds !== null) {
    baseQuery = baseQuery.in("id", projectIds);
  }

  const { data: projects, error } = await baseQuery;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const allProjects = projects || [];
  const fetchedProjectIds = allProjects.map((p) => p.id);

  // Also fetch project_members with project_manager role for these projects
  // so they show up in the "Project Managers Overview" section
  const { data: pmMembers } = fetchedProjectIds.length > 0
    ? await supabaseAdmin
        .from("project_members")
        .select("project_id, user_id, role, user:users(id, full_name, avatar_url)")
        .in("project_id", fetchedProjectIds)
        .eq("role", "project_manager")
    : { data: [] };

  // Fetch task stats related to these projects
  const { data: tasks } = fetchedProjectIds.length > 0
    ? await supabaseAdmin
        .from("tasks")
        .select("id, status, due_date, project_id, assigned_to")
        .in("project_id", fetchedProjectIds)
        .eq("is_deleted", false)
    : { data: [] };

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

  // Build manager map — includes both manager_id (primary PM) and project_members with PM role
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
      projectIds: Set<string>;
    }
  >();

  const upsertManager = (managerId: string, managerName: string, managerAvatar: string | null) => {
    if (!managerMap.has(managerId)) {
      managerMap.set(managerId, {
        managerId,
        managerName,
        managerAvatar,
        projectCount: 0,
        activeCount: 0,
        completedCount: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        projectIds: new Set(),
      });
    }
    return managerMap.get(managerId)!;
  };

  // Add managers from manager_id field
  for (const p of allProjects as any[]) {
    const entry = upsertManager(
      p.manager_id,
      p.manager?.full_name || "Unknown",
      p.manager?.avatar_url || null,
    );
    if (!entry.projectIds.has(p.id)) {
      entry.projectIds.add(p.id);
      entry.projectCount++;
      if (p.status === "in_progress") entry.activeCount++;
      if (p.status === "completed") entry.completedCount++;
    }
  }

  // Add project_manager members (users assigned as PM in project_members but not manager_id)
  for (const pm of (pmMembers || []) as any[]) {
    if (!pm.user) continue;
    const entry = upsertManager(
      pm.user_id,
      pm.user.full_name || "Unknown",
      pm.user.avatar_url || null,
    );
    // Only count this project if not already counted via manager_id
    if (!entry.projectIds.has(pm.project_id)) {
      entry.projectIds.add(pm.project_id);
      const proj = allProjects.find((p: any) => p.id === pm.project_id) as any;
      if (proj) {
        entry.projectCount++;
        if (proj.status === "in_progress") entry.activeCount++;
        if (proj.status === "completed") entry.completedCount++;
      }
    }
  }

  // Aggregate task stats per manager's projects
  for (const t of allTasks as any[]) {
    for (const [, entry] of managerMap) {
      if (entry.projectIds.has(t.project_id)) {
        entry.totalTasks++;
        if (t.status === "done") entry.completedTasks++;
        if (t.due_date && t.due_date < today && t.status !== "done")
          entry.overdueTasks++;
        break; // each task belongs to one project, only count once per manager
      }
    }
  }

  const byManager = Array.from(managerMap.values()).map(({ projectIds: _pids, ...m }) => ({
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
          .filter((t: any) => t.status !== "done" && t.assigned_to)
          .map((t: any) => t.assigned_to),
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
        if (t.status !== "done" && t.assigned_to) {
          const name = userMap.get(t.assigned_to) || "Unknown";
          if (!workloadMap.has(t.assigned_to)) {
            workloadMap.set(t.assigned_to, {
              userId: t.assigned_to,
              userName: name,
              activeTasks: 0,
            });
          }
          const entry = workloadMap.get(t.assigned_to)!;
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
      manager:users!manager_id(id, full_name, email, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, email, avatar_url)
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
  // Query both sources in parallel:
  // 1. Projects where this user is the main manager_id
  // 2. Projects where this user is listed in project_members with role "project_manager"
  const [directRes, memberRes] = await Promise.all([
    supabaseAdmin
      .from("projects")
      .select("id")
      .eq("manager_id", managerId),
    supabaseAdmin
      .from("project_members")
      .select("project_id")
      .eq("user_id", managerId)
      .eq("role", "project_manager"),
  ]);

  const directIds = (directRes.data || []).map((r) => r.id);
  const memberIds = (memberRes.data || []).map((r) => r.project_id);
  const allProjectIds = Array.from(new Set([...directIds, ...memberIds]));

  if (allProjectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
      *,
      manager:users!manager_id(id, full_name, email, avatar_url),
      members:project_members(
        *,
        user:users(id, full_name, email, avatar_url)
      )
    `,
    )
    .in("id", allProjectIds)
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
  // Fetch all active users and the resolved RBAC role names in parallel
  const [usersRes, rbacRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, full_name, email, avatar_url, job_title, role")
      .eq("is_active", true),
    supabaseAdmin
      .from("user_resolved_permissions" as any)
      .select("user_id, role_names"),
  ]);

  if (usersRes.error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, usersRes.error.message);
  }

  const allUsers = usersRes.data || [];

  // Build a map of user_id -> role_names from RBAC
  const rbacRoleNames = new Map<string, string[]>();
  for (const row of (rbacRes.data || []) as any[]) {
    rbacRoleNames.set(row.user_id, row.role_names || []);
  }

  const hasRbacRole = (userId: string, roleName: string) =>
    (rbacRoleNames.get(userId) || []).some(
      (n: string) => n.toLowerCase() === roleName.toLowerCase(),
    );

  return {
    developers: allUsers.filter(
      (u: any) =>
        u.job_title === "developer" || hasRbacRole(u.id, "Developer"),
    ),
    designers: allUsers.filter(
      (u: any) =>
        u.job_title === "designer" || hasRbacRole(u.id, "Designer"),
    ),
    seoSpecialists: allUsers.filter(
      (u: any) =>
        u.job_title === "seo_specialist" ||
        hasRbacRole(u.id, "SEO Specialist"),
    ),
    contentWriters: allUsers.filter(
      (u: any) =>
        u.job_title === "content_writer" ||
        hasRbacRole(u.id, "Content Writer"),
    ),
    // Project Managers: anyone with PM job title, PM RBAC role, admin, or manager role
    projectManagers: allUsers.filter(
      (u: any) =>
        u.job_title === "project_manager" ||
        u.role === "admin" ||
        hasRbacRole(u.id, "Project Manager"),
    ),
  };
}

/**
 * Get "My Projects" for team members
 */
export async function getMyProjects(userId: string): Promise<ProjectRecord[]> {
  // 1. Get Project IDs where user is a member OR the manager
  const [memberRes, managerRes] = await Promise.all([
    supabaseAdmin
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId),
    supabaseAdmin
      .from("projects")
      .select("id")
      .eq("manager_id", userId),
  ]);

  if (memberRes.error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, memberRes.error.message);
  }

  const memberProjectIds = (memberRes.data || []).map((m) => m.project_id);
  const managedProjectIds = (managerRes.data || []).map((p) => p.id);
  const projectIds = Array.from(new Set([...memberProjectIds, ...managedProjectIds]));

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
  overdueTasks: any[];
  teamMembers: any[];
}> {
  // 1. Get Task Stats
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("tasks")
    .select("id, title, status, due_date, priority, assigned_to")
    .eq("project_id", projectId)
    .eq("is_deleted", false);

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

  const overdueTasks = allTasks
    .filter(
      (t) =>
        t.due_date &&
        t.due_date < today &&
        t.status !== "done" &&
        t.status !== "cancelled",
    )
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

  return {
    taskProgress: {
      total,
      completed,
      inProgress,
      todo,
    },
    upcomingTasks,
    overdueTasks,
    teamMembers: [],
  };
}
