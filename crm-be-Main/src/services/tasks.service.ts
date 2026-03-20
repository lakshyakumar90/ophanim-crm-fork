import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/responses.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { logActivity } from "./activity-events.service.js";
import { USER_ROLES } from "../config/constants.js";
import {
  parsePaginationParams,
  calculatePaginationMeta,
  calculateOffset,
  parseSortParams,
  parseArrayParam,
  parseDateRange,
  parseBooleanParam,
} from "../utils/pagination.js";
import { getCurrentTimestamp } from "../utils/helpers.js";
import { getTimestampIST, nowIST, getTodayIST } from "../utils/date-utils.js";
import type { PaginatedResult, AuthUser } from "../types/api.types.js";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskListQuery,
  ReassignTaskInput,
  CreateCommentInput,
} from "../validators/tasks.validator.js";

interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  taskType: string;
  relatedLeadId: string | null;
  projectId: string | null;
  relatedTeamId: string | null; // Added
  relatedUserId: string | null; // Added
  departmentId: string | null;
  assignedTo: string;
  assignedBy: string;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  tags: string[] | null;
  reminderBeforeMinutes: number | null;
  reminderSent: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  department?: { id: string; name: string; slug: string } | null;
  assignedUser?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    departmentId: string | null;
  } | null;
  project?: { id: string; name: string } | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  related_lead_id: string | null;
  project_id: string | null;
  related_team_id: string | null; // Added
  related_user_id: string | null; // Added
  department_id: string | null;
  assigned_to: string;
  assigned_by: string;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  tags: string[] | null;
  reminder_before_minutes: number | null;
  reminder_sent: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string; slug: string } | null;
  assigned_user?: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
  project?: { id: string; name: string } | null;
}

function mapTaskRowToRecord(data: TaskRow): TaskRecord {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    taskType: data.task_type,
    relatedLeadId: data.related_lead_id,
    projectId: data.project_id,
    relatedTeamId: data.related_team_id, // Map
    relatedUserId: data.related_user_id, // Map
    departmentId: data.department_id,
    assignedTo: data.assigned_to,
    assignedBy: data.assigned_by,
    priority: data.priority,
    status: data.status,
    dueDate: data.due_date,
    completedAt: data.completed_at,
    tags: data.tags,
    reminderBeforeMinutes: data.reminder_before_minutes,
    reminderSent: data.reminder_sent,
    isDeleted: data.is_deleted,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    department: (data as any).department ?? null,
    assignedUser: (data as any).assigned_user
      ? {
          id: (data as any).assigned_user.id,
          fullName: (data as any).assigned_user.full_name,
          email: (data as any).assigned_user.email,
          avatarUrl: (data as any).assigned_user.avatar_url,
          departmentId: (data as any).assigned_user.department_id ?? null,
        }
      : null,
    project: (data as any).project ? { id: (data as any).project.id, name: (data as any).project.name } : null,
  };
}

/**
 * Get paginated list of tasks
 */
export async function getTasks(
  query: TaskListQuery,
  authUser: AuthUser,
): Promise<PaginatedResult<TaskRecord>> {
  const pagination = parsePaginationParams(query);
  const { sortBy, ascending } = parseSortParams(
    query,
    ["created_at", "title", "priority", "status", "due_date"],
    "created_at",
  );

  // OPTIMIZED: Select only required columns instead of SELECT *
  let baseQuery = supabaseAdmin
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      task_type,
      related_lead_id,
      project_id,
      related_team_id,
      related_user_id,
      department_id,
      assigned_to,
      assigned_by,
      priority,
      status,
      due_date,
      completed_at,
      tags,
      reminder_before_minutes,
      reminder_sent,
      is_deleted,
      created_at,
      updated_at,
      department:departments!department_id(id, name, slug),
      assigned_user:users!assigned_to(id, full_name, email, avatar_url, department_id),
      project:projects!project_id(id, name)
    `,
      { count: "exact" },
    )
    .eq("is_deleted", false);

  // Role-based filtering with department security
  const isAdminOrGlobal =
    authUser.role === USER_ROLES.ADMIN ||
    authUser.isGlobal ||
    (authUser.permissions ?? []).includes("crm:admin");
  if (isAdminOrGlobal) {
    // Admins and global-scoped users see all tasks
  } else if (authUser.role === USER_ROLES.EMPLOYEE) {
    // Employees see only their assigned tasks
    baseQuery = baseQuery.eq("assigned_to", authUser.id);
  } else if (authUser.role === USER_ROLES.MANAGER) {
    const deptIds =
      (authUser.departmentIds?.length ?? 0) > 0
        ? authUser.departmentIds!
        : authUser.departmentId
          ? [authUser.departmentId]
          : [];
    if (deptIds.length > 0) {
      const deptList = deptIds.join(",");
      // Some tasks may not yet have department_id set but the assignee's
      // user record does. Include both to ensure managers see all team tasks.
      baseQuery = baseQuery.or(
        `department_id.in.(${deptList}),assigned_user.department_id.in.(${deptList})`,
      );
    }
  }

  // Apply filters
  if (query.status) {
    const statuses = parseArrayParam(query.status);
    if (statuses.length > 0) {
      baseQuery = baseQuery.in("status", statuses);
    }
  }

  if (query.priority) {
    const priorities = parseArrayParam(query.priority);
    if (priorities.length > 0) {
      baseQuery = baseQuery.in("priority", priorities);
    }
  }

  if (query.assignedTo) {
    baseQuery = baseQuery.eq("assigned_to", query.assignedTo);
  }

  if (query.relatedLeadId) {
    baseQuery = baseQuery.eq("related_lead_id", query.relatedLeadId);
  }

  if (query.projectId) {
    baseQuery = baseQuery.eq("project_id", query.projectId);
  }

  // Overdue filter
  if (query.overdue) {
    const isOverdue = parseBooleanParam(query.overdue);
    if (isOverdue) {
      baseQuery = baseQuery
        .lt("due_date", getTimestampIST())
        .neq("status", "completed")
        .neq("status", "cancelled");
    }
  }

  // Due today filter
  if (query.dueToday) {
    const isDueToday = parseBooleanParam(query.dueToday);
    if (isDueToday) {
      const today = nowIST();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      baseQuery = baseQuery
        .gte("due_date", startOfDay)
        .lte("due_date", endOfDay);
    }
  }

  const dateRange = parseDateRange(query);
  if (dateRange.startDate) {
    baseQuery = baseQuery.gte("due_date", dateRange.startDate.toISOString());
  }
  if (dateRange.endDate) {
    baseQuery = baseQuery.lte("due_date", dateRange.endDate.toISOString());
  }

  // Pagination and sorting
  const offset = calculateOffset(pagination);
  baseQuery = baseQuery
    .order(sortBy, { ascending })
    .range(offset, offset + pagination.limit - 1);

  const { data, error, count } = await baseQuery;

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const tasks = (data || []).map((t: any) =>
    mapTaskRowToRecord(t as unknown as TaskRow),
  );

  return {
    data: tasks,
    meta: calculatePaginationMeta(count || 0, pagination),
  };
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string): Promise<TaskRecord> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    throw ApiError.notFound("Task");
  }

  return mapTaskRowToRecord(data as unknown as TaskRow);
}

/**
 * Get allowed assignee IDs based on role hierarchy:
 * - Admin or crm:admin: anyone
 * - Manager: self + team members only
 * - Employee: self only
 */
async function getAllowedAssigneeIds(authUser: AuthUser): Promise<Set<string>> {
  const isAdmin = authUser.role === USER_ROLES.ADMIN;
  const hasGlobalPerm = authUser.permissions?.includes("crm:admin") ?? false;
  if (isAdmin || hasGlobalPerm) {
    return new Set(); // Empty = no restriction (anyone allowed)
  }

  if (authUser.role === USER_ROLES.EMPLOYEE) {
    return new Set([authUser.id]);
  }

  if (authUser.role === USER_ROLES.MANAGER && authUser.teamId) {
    const { data: members } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("team_id", authUser.teamId)
      .eq("is_active", true);
    const ids = new Set([authUser.id, ...(members || []).map((m: { id: string }) => m.id)]);
    return ids;
  }

  // Manager without team: only self
  return new Set([authUser.id]);
}

/**
 * Create task
 * Assignment hierarchy: admin/global → anyone; manager → team; employee → self only
 */
export async function createTask(
  input: CreateTaskInput,
  authUser: AuthUser,
): Promise<TaskRecord> {
  const createdBy = authUser.id;

  // Default assignedTo to self if not provided
  const assignedTo = input.assignedTo || createdBy;

  const allowedIds = await getAllowedAssigneeIds(authUser);
  if (allowedIds.size > 0 && !allowedIds.has(assignedTo)) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      authUser.role === USER_ROLES.EMPLOYEE
        ? "You can only create tasks assigned to yourself"
        : "You can only assign tasks to members of your team",
    );
  }

  const insertData: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    task_type: input.taskType || "general",
    related_lead_id: input.relatedLeadId,
    project_id: input.projectId,
    related_team_id: (input as any).relatedTeamId ?? null,
    related_user_id: (input as any).relatedUserId ?? null,
    assigned_to: assignedTo,
    assigned_by: createdBy,
    priority: input.priority || "medium",
    status: input.status || "todo",
    due_date: input.dueDate,
    tags: input.tags,
    reminder_before_minutes: input.reminderBeforeMinutes ?? 30,
    reminder_sent: false,
    is_deleted: false,
  };

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Create notification for assignee (only if assigned to someone else)
  if (assignedTo !== createdBy) {
    await supabaseAdmin.from("notifications").insert({
      user_id: assignedTo,
      title: "New Task Assigned",
      message: `You have been assigned a new task: ${input.title}`,
      type: "task_assigned",
      related_entity_type: "task",
      related_entity_id: data.id,
    });
  }

  // Join team member IDs for notification logic if needed

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: createdBy,
    entity_type: "task",
    entity_id: data.id,
    activity_type: "task_create",
    title: "Task created",
    description: `Created task: ${input.title}`,
    metadata: {
      priority: input.priority || "medium",
      status: input.status || "todo",
      assigned_to: assignedTo,
    },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: createdBy,
    entityType: "task",
    entityId: data.id,
    entityName: input.title,
    eventType: "task_created",
    source: "task",
    metadata: {
      priority: input.priority || "medium",
      status: input.status || "todo",
      assigned_to: assignedTo,
    },
  });

  return mapTaskRowToRecord(data as unknown as TaskRow);
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  updatedBy: string,
): Promise<TaskRecord> {
  const currentTask = await getTaskById(taskId);

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData["title"] = input.title;
  if (input.description !== undefined)
    updateData["description"] = input.description;
  if (input.priority !== undefined) updateData["priority"] = input.priority;
  if (input.status !== undefined) updateData["status"] = input.status;
  if (input.dueDate !== undefined) updateData["due_date"] = input.dueDate;
  if (input.tags !== undefined) updateData["tags"] = input.tags;
  if (input.projectId !== undefined) updateData["project_id"] = input.projectId;
  if ((input as any).relatedTeamId !== undefined)
    updateData["related_team_id"] = (input as any).relatedTeamId;
  if ((input as any).relatedUserId !== undefined)
    updateData["related_user_id"] = (input as any).relatedUserId;
  updateData["updated_at"] = getTimestampIST();

  // Handle status change to completed
  if (input.status === "completed" && currentTask.status !== "completed") {
    updateData["completed_at"] = getTimestampIST();
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  if (!data) {
    throw ApiError.notFound("Task");
  }

  // Build old and new values for only the fields that actually changed
  const changedOldValues: Record<string, unknown> = {};
  const changedNewValues: Record<string, unknown> = {};

  const taskFieldMappings: Record<string, keyof TaskRecord> = {
    title: "title",
    description: "description",
    priority: "priority",
    status: "status",
    dueDate: "dueDate",
    tags: "tags",
    projectId: "projectId",
    relatedTeamId: "relatedTeamId",
    relatedUserId: "relatedUserId",
  };

  for (const [inputKey, taskKey] of Object.entries(taskFieldMappings)) {
    const inputValue = input[inputKey as keyof UpdateTaskInput];
    if (inputValue !== undefined) {
      const currentValue = currentTask[taskKey];
      // Only log if the value actually changed
      if (JSON.stringify(inputValue) !== JSON.stringify(currentValue)) {
        changedOldValues[inputKey] = currentValue;
        changedNewValues[inputKey] = inputValue;
      }
    }
  }

  // Log activity (status change gets special action)
  const action =
    input.status && input.status !== currentTask.status
      ? input.status === "completed"
        ? "complete"
        : "status_change"
      : "task_update";

  const metadataChanges: Record<string, any> = {};
  for (const key of Object.keys(changedNewValues)) {
    metadataChanges[key] = {
      old: changedOldValues[key],
      new: changedNewValues[key]
    };
  }

  await supabaseAdmin.from("user_activities").insert({
    user_id: updatedBy,
    entity_type: "task",
    entity_id: taskId,
    activity_type: action,
    title: action === "complete" ? "Task completed" : "Task updated",
    description:
      action === "complete"
        ? `Completed task: ${data.title}`
        : `Updated task: ${data.title}`,
    metadata: {
      from_status: currentTask.status,
      to_status: data.status,
      updates: Object.keys(changedNewValues),
      ...metadataChanges,
    },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: updatedBy,
    entityType: "task",
    entityId: taskId,
    entityName: data.title,
    eventType: action === "complete" ? "task_completed" : action === "status_change" ? "task_status_changed" : "task_updated",
    source: "task",
    metadata: {
      from_status: currentTask.status,
      to_status: data.status,
      ...metadataChanges,
    },
  });

  return mapTaskRowToRecord(data as unknown as TaskRow);
}

/**
 * Reassign task
 * Admin/global (crm:admin): assign to anyone. Manager: team members only.
 */
export async function reassignTask(
  taskId: string,
  input: ReassignTaskInput,
  authUser: AuthUser,
): Promise<TaskRecord> {
  const reassignedBy = authUser.id;
  const currentTask = await getTaskById(taskId);

  const allowedIds = await getAllowedAssigneeIds(authUser);
  if (allowedIds.size > 0 && !allowedIds.has(input.assignTo)) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      authUser.role === USER_ROLES.EMPLOYEE
        ? "You can only reassign tasks to yourself"
        : "You can only reassign tasks to members of your team",
    );
  }

  if (currentTask.assignedTo === input.assignTo) {
    throw new ApiError(
      ERROR_CODES.ALREADY_EXISTS,
      "Task is already assigned to this user",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update({
      assigned_to: input.assignTo,
      updated_at: getTimestampIST(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Create notification for new assignee
  await supabaseAdmin.from("notifications").insert({
    user_id: input.assignTo,
    title: "Task Reassigned",
    message: `A task has been reassigned to you: ${currentTask.title}`,
    type: "task_assigned",
    related_entity_type: "task",
    related_entity_id: taskId,
  });

  // Task reassignment tracked via notifications

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: reassignedBy,
    entity_type: "task",
    entity_id: taskId,
    activity_type: "task_reassign",
    title: "Task reassigned",
    description: `Reassigned task to ${input.assignTo}`,
    metadata: {
      from_user: currentTask.assignedTo,
      to_user: input.assignTo,
    },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: reassignedBy,
    entityType: "task",
    entityId: taskId,
    entityName: currentTask.title,
    eventType: "task_reassigned",
    source: "task",
    metadata: {
      from_user: currentTask.assignedTo,
      to_user: input.assignTo,
    },
  });

  return mapTaskRowToRecord(data as unknown as TaskRow);
}

/**
 * Delete task (soft delete)
 */
export async function deleteTask(
  taskId: string,
  deletedBy: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .update({ is_deleted: true, updated_at: getCurrentTimestamp() })
    .eq("id", taskId);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  // Log activity
  await supabaseAdmin.from("user_activities").insert({
    user_id: deletedBy,
    entity_type: "task",
    entity_id: taskId,
    activity_type: "task_delete",
    title: "Task deleted",
    description: "Task deleted",
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: deletedBy,
    entityType: "task",
    entityId: taskId,
    eventType: "task_deleted",
    source: "task",
  });
}

/**
 * Get task comments
 */
export async function getTaskComments(taskId: string) {
  const { data, error } = await supabaseAdmin
    .from("comments")
    .select(
      `
      *,
      users:user_id (id, full_name, email, avatar_url)
    `,
    )
    .eq("entity_type", "task")
    .eq("entity_id", taskId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  return data || [];
}

/**
 * Add comment to task
 */
export async function addTaskComment(
  taskId: string,
  input: CreateCommentInput,
  userId: string,
): Promise<void> {
  // Verify task exists
  const task = await getTaskById(taskId);

  const { data: commentData, error } = await supabaseAdmin
    .from("comments")
    .insert({
      entity_type: "task",
      entity_id: taskId,
      user_id: userId,
      content: input.commentText,
    })
    .select("id")
    .single();

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const commentPreview =
    input.commentText.length > 120
      ? `${input.commentText.slice(0, 117).trimEnd()}...`
      : input.commentText;

  await supabaseAdmin.from("user_activities").insert({
    user_id: userId,
    entity_type: "task",
    entity_id: taskId,
    activity_type: "comment",
    title: "Task comment added",
    description: `Commented on task: ${task.title}`,
    metadata: {
      comment_id: commentData.id,
      comment_preview: commentPreview,
      commented_on: task.title,
    },
    created_at: getTimestampIST(),
  });

  await logActivity({
    actorId: userId,
    entityType: "task",
    entityId: taskId,
    entityName: task.title,
    eventType: "comment_added",
    source: "task",
    metadata: {
      comment_id: commentData.id,
      comment_preview: commentPreview,
    },
  });
}

/**
 * Get my tasks summary
 */
export async function getMyTasksSummary(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("status")
    .eq("assigned_to", userId)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);
  }

  const summary = {
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  const now = getTimestampIST();

  for (const task of data || []) {
    const t = task as { status: string; due_date?: string };
    summary.total++;
    if (t.status === "todo") summary.todo++;
    if (t.status === "in_progress") summary.inProgress++;
    if (t.status === "completed") summary.completed++;
  }

  // Get overdue count
  const { data: overdueData } = await supabaseAdmin
    .from("tasks")
    .select("id")
    .eq("assigned_to", userId)
    .eq("is_deleted", false)
    .lt("due_date", now)
    .neq("status", "completed")
    .neq("status", "cancelled");

  summary.overdue = overdueData?.length || 0;

  return summary;
}

/**
 * Check and send reminder notifications for due tasks.
 * Finds tasks where NOW() >= due_date - reminder_before_minutes and reminder_sent = false.
 * Creates a notification for each due reminder and marks the task reminder_sent = true.
 * Pass userId to restrict to a single user, or omit to check all users (e.g. from a cron job).
 */
export async function checkDueReminders(userId?: string): Promise<{ notified: number }> {
  const { createNotification } = await import("./notifications.service.js");
  const nowTs = new Date().toISOString();

  // Fetch tasks where reminder is due and not yet sent
  let query = supabaseAdmin
    .from("tasks")
    .select(
      "id, title, due_date, reminder_before_minutes, assigned_to, project_id",
    )
    .eq("is_deleted", false)
    .eq("reminder_sent", false)
    .not("reminder_before_minutes", "is", null)
    .not("due_date", "is", null)
    .not("status", "in", '("completed","cancelled")');

  if (userId) {
    query = query.eq("assigned_to", userId);
  }

  const { data: tasks, error } = await query;
  if (error) throw new ApiError(ERROR_CODES.DATABASE_ERROR, error.message);

  let notified = 0;
  for (const task of tasks || []) {
    const t = task as {
      id: string;
      title: string;
      due_date: string;
      reminder_before_minutes: number;
      assigned_to: string;
      project_id: string | null;
    };
    // Check: NOW >= due_date - reminder_before_minutes
    const reminderAt = new Date(new Date(t.due_date).getTime() - t.reminder_before_minutes * 60 * 1000);
    if (new Date(nowTs) >= reminderAt) {
      try {
        const dueDateStr = new Date(t.due_date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });
        await createNotification({
          userId: t.assigned_to,
          title: "Task Reminder",
          message: `"${t.title}" is due on ${dueDateStr}`,
          type: "reminder",
          relatedEntityType: "task",
          relatedEntityId: t.id,
          actionUrl: t.project_id ? `/projects/${t.project_id}/tasks` : "/tasks",
          priority: "high",
        });
        // Mark reminder as sent
        await supabaseAdmin
          .from("tasks")
          .update({ reminder_sent: true })
          .eq("id", t.id);
        notified++;
      } catch {
        // Continue even if one notification fails
      }
    }
  }

  return { notified };
}
