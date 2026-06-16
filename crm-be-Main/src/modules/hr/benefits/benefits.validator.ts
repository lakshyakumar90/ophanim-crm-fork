import { z } from "zod";

export const benefitPlanIdParamSchema = z.object({
  id: z.string().uuid("Invalid benefit plan ID"),
});

export const benefitEnrollmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid enrollment ID"),
});

export const listBenefitPlansQuerySchema = z.object({
  is_active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createBenefitPlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  eligibility_rules: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export const updateBenefitPlanSchema = createBenefitPlanSchema.partial();

export const listEnrollmentsQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
  status: z.enum(["pending", "active", "cancelled", "expired"]).optional(),
});

export const createEnrollmentSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  plan_id: z.string().uuid("Invalid plan ID"),
  status: z.enum(["pending", "active", "cancelled", "expired"]).optional(),
  notes: z.string().optional(),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(["pending", "active", "cancelled", "expired"]).optional(),
  notes: z.string().optional(),
});
