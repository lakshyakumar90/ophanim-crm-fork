import { z } from "zod";

export const sprintStatusEnum = z.enum([
  "planned",
  "active",
  "completed",
  "cancelled",
]);

export const createSprintSchema = z.object({
  name: z.string().min(1).max(200),
  goal: z.string().max(2000).optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  status: sprintStatusEnum.optional(),
});

export const updateSprintSchema = createSprintSchema.partial();

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
