import { z } from "zod";

export const skillIdParamSchema = z.object({
  id: z.string().uuid("Invalid skill ID"),
});

export const employeeSkillParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  skillId: z.string().uuid("Invalid skill ID"),
});

export const employeeSkillsParamsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const listSkillsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

export const createSkillSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const updateSkillSchema = createSkillSchema.partial();

export const upsertEmployeeSkillSchema = z.object({
  skill_id: z.string().uuid("Invalid skill ID"),
  proficiency: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .optional(),
  certified_until: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEmployeeSkillSchema = upsertEmployeeSkillSchema
  .omit({ skill_id: true })
  .partial();

export const skillsMatrixQuerySchema = z.object({
  category: z.string().optional(),
  department_id: z.string().uuid().optional(),
});
