import { z } from "zod";

export const hrEmployeeIdParamSchema = z.object({
  id: z.string().uuid("Invalid employee ID format"),
});

export const leaveRequestIdParamSchema = z.object({
  id: z.string().uuid("Invalid leave request ID format"),
});

export const leaveTypeIdParamSchema = z.object({
  id: z.string().uuid("Invalid leave type ID format"),
});

export const userLeaveBalanceParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

export const hrEmployeeUpdateSchema = z
  .object({
    email: z.string().email().optional(),
    fullName: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional().nullable(),
    role: z.enum(["admin", "manager", "employee", "hr"]).optional(),
    departmentId: z.string().uuid().optional().nullable(),
    jobTitle: z.string().max(120).optional().nullable(),
    teamId: z.string().uuid().optional().nullable(),
    managerId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    shiftType: z.string().max(50).optional().nullable(),
    currentCtc: z.number().positive().optional().nullable(),
    salaryComponents: z
      .object({
        basic_pct: z.number().min(0).max(100).optional(),
        hra_pct: z.number().min(0).max(100).optional(),
        allowance_pct: z.number().min(0).max(100).optional(),
      })
      .optional(),
    timezone: z.string().max(100).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const hrLeaveListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  status: z
    .enum(["pending", "manager_approved", "approved", "rejected", "cancelled"])
    .optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export const hrLeaveBalanceQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const hrCreateLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid("Invalid leave type ID format").optional(),
  startDate: z.string().date("Invalid startDate format, expected YYYY-MM-DD"),
  endDate: z.string().date("Invalid endDate format, expected YYYY-MM-DD"),
  reason: z.string().max(1000).optional(),
  targetUserId: z.string().uuid("Invalid target user ID format"),
});

export const hrLeaveDecisionSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const hrCreateLeaveTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional(),
  daysAllowed: z.coerce.number().int().min(0).max(366),
  isPaid: z.boolean().optional(),
  carryForward: z.boolean().optional(),
});

export const hrUpdateLeaveTypeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    daysAllowed: z.coerce.number().int().min(0).max(366).optional(),
    isActive: z.boolean().optional(),
    isPaid: z.boolean().optional(),
    carryForward: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
