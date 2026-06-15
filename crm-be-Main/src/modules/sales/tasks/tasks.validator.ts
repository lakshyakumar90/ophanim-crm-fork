import { z } from "zod";

const taskStatusEnum = z.enum([
  "todo",
  "in_progress",
  "completed",
  "cancelled",
]);
const taskPriorityEnum = z.enum(["high", "medium", "low"]);

// Create task
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  taskType: z
    .enum([
      "lead_related",
      "general",
      "project_related",
      "hr_related",
      "finance_related",
    ])
    .default("general"),
  relatedLeadId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  relatedTeamId: z.string().uuid().optional().nullable(),
  relatedUserId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid("Invalid assigned user ID").optional(), // Optional - defaults to self
  priority: taskPriorityEnum.default("medium"),
  status: taskStatusEnum.default("todo"),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  reminderBeforeMinutes: z.number().int().optional().nullable(), // 15, 30, 60, 1440 (1 day)
});

// Update task
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  relatedTeamId: z.string().uuid().optional().nullable(),
  relatedUserId: z.string().uuid().optional().nullable(),
});

// Task list query
export const taskListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  relatedLeadId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  overdue: z.string().optional(),
  dueToday: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// Reassign task
export const reassignTaskSchema = z.object({
  assignTo: z.string().uuid("Invalid user ID"),
});

// Task comment
export const createCommentSchema = z.object({
  commentText: z.string().min(1, "Comment is required").max(2000),
});

// Types
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type ReassignTaskInput = z.infer<typeof reassignTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
