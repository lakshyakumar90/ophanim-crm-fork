import { z } from "zod";

export const milestoneStatusEnum = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: milestoneStatusEnum.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const createDeliverableSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateDeliverableSchema = createDeliverableSchema.partial();

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

export const milestoneIdParamSchema = z.object({
  projectId: z.string().uuid(),
  milestoneId: z.string().uuid(),
});

export const deliverableIdParamSchema = z.object({
  projectId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  deliverableId: z.string().uuid(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
