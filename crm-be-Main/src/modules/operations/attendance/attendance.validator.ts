import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// Clock in
export const clockInSchema = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Clock out
export const clockOutSchema = z.object({
  breakDuration: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Manual attendance (admin)
export const manualAttendanceSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  clockInTime: z.string().datetime(),
  clockOutTime: z.string().datetime().optional().nullable(),
  status: z.enum(["present", "late", "half_day"]),
  notes: z.string().max(500).optional().nullable(),
});

// Update attendance
export const updateAttendanceSchema = z.object({
  clockInTime: z.string().datetime().optional().nullable(),
  clockOutTime: z.string().datetime().optional().nullable(),
  breakDuration: z.number().int().min(0).optional().nullable(),
  status: z.enum(["present", "late", "half_day"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

// Attendance list query
export const attendanceListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  departmentId: z.string().uuid().optional(),
});

export const attendanceSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const attendanceAnalyticsQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  departmentId: z.string().uuid().optional(),
});

export const attendanceUsersTodayQuerySchema = z.object({
  date: dateStringSchema.optional(),
  departmentId: z.string().uuid().optional(),
});

export const attendanceUserHistoryParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const attendanceUserHistoryQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

export const attendanceHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const attendanceLeavesQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
});

export const attendanceWeeklyHoursQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  weekStart: dateStringSchema.optional(),
});

// Attendance rules
export const attendanceRulesSchema = z.object({
  shiftType: z.enum(["day_shift", "night_shift"]).optional(),
  workStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  workEndTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  autoLogoutTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional(),
  lateThresholdMinutes: z.number().int().min(0).max(120).default(15),
  halfDayHours: z.number().min(1).max(12).default(4),
  fullDayHours: z.number().min(1).max(24).default(8),
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).default([0, 6]),
});

// Holiday
export const createHolidaySchema = z.object({
  name: z.string().min(1).max(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  isOptional: z.boolean().default(false),
  departmentId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  role: z.string().max(50).optional().nullable(),
});

// Types
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuerySchema>;
export type AttendanceAnalyticsQuery = z.infer<
  typeof attendanceAnalyticsQuerySchema
>;
export type AttendanceUsersTodayQuery = z.infer<
  typeof attendanceUsersTodayQuerySchema
>;
export type AttendanceUserHistoryQuery = z.infer<
  typeof attendanceUserHistoryQuerySchema
>;
export type AttendanceRulesInput = z.infer<typeof attendanceRulesSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
// Admin clock in/out use same schemas as regular clock in/out
export type AdminClockInInput = ClockInInput;
export type AdminClockOutInput = ClockOutInput;
