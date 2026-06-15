import { z } from "zod";

const projectStatusEnum = z.enum([
  "planned",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]);

const projectPriorityEnum = z.enum(["low", "medium", "high"]);

// Create Project
export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  clientName: z.string().max(200).optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid("Invalid manager ID"), // PM must be assigned
  priority: projectPriorityEnum.default("medium"),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// Update Project
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  clientName: z.string().max(200).optional().nullable(),
  status: projectStatusEnum.optional(),
  priority: projectPriorityEnum.optional(),
  managerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

// Project List Query
export const projectListQuerySchema = z.object({
  status: z.string().optional(), // Can be comma separated
  priority: z.string().optional(),
  managerId: z.string().uuid().optional(),
  search: z.string().optional(),
});

// Add Member
export const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.string().min(1, "Role is required"), // e.g., 'Developer', 'Designer'
  allocationPercentage: z.number().int().min(0).max(100).default(100),
});

// Update Member
export const updateMemberSchema = z.object({
  role: z.string().min(1).optional(),
  allocationPercentage: z.number().int().min(0).max(100).optional(),
});

// Types
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
