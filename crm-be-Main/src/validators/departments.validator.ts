import { z } from "zod";

export const departmentSlugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    "Slug must contain lowercase letters, numbers, and underscores only",
  );

export const createDepartmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: departmentSlugSchema,
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const departmentSlugParamSchema = z.object({
  slug: departmentSlugSchema,
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
