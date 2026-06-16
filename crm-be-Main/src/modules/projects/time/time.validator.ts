import { z } from "zod";

export const timeEntryStatusEnum = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  hours: z.number().positive().max(24),
  description: z.string().max(2000).optional().nullable(),
});

export const updateTimeEntrySchema = z.object({
  taskId: z.string().uuid().optional().nullable(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  hours: z.number().positive().max(24).optional(),
  description: z.string().max(2000).optional().nullable(),
});

export const timeEntryListQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: timeEntryStatusEnum.optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const rejectTimeEntrySchema = z.object({
  reason: z.string().min(1).max(500),
});

export const timeEntryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type TimeEntryListQuery = z.infer<typeof timeEntryListQuerySchema>;
