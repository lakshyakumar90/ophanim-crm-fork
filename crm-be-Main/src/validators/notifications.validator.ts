import { z } from "zod";

export const updateNotificationPreferencesSchema = z
  .object({
    leadAssignment: z.boolean().optional(),
    taskAssignment: z.boolean().optional(),
    statusUpdates: z.boolean().optional(),
    mentions: z.boolean().optional(),
    systemNotifications: z.boolean().optional(),
    attendanceAlerts: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one preference field is required",
  });

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
