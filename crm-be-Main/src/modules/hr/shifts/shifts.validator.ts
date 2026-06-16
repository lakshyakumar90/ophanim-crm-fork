import { z } from "zod";

export const shiftIdParamSchema = z.object({
  id: z.string().uuid("Invalid shift ID"),
});

export const listShiftsQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  shift_type: z.enum(["day_shift", "night_shift"]).optional(),
});

export const createShiftSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  shift_date: z.string().min(1, "Shift date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  shift_type: z.enum(["day_shift", "night_shift"]).optional(),
  notes: z.string().optional(),
});

export const updateShiftSchema = createShiftSchema
  .omit({ user_id: true })
  .partial();

export const bulkCreateShiftsSchema = z.object({
  shifts: z.array(createShiftSchema).min(1),
});
