import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const onboardingIdParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const onboardingEmployeeIdParamSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
});

export const onboardingTaskParamsSchema = z.object({
  id: z.string().uuid("Invalid checklist ID"),
  taskIndex: z.coerce.number().int().min(0),
});

export const onboardingTemplatesQuerySchema = z.object({
  type: z.enum(["onboarding", "offboarding"]).optional(),
  department: z.string().optional(),
});

export const onboardingChecklistsQuerySchema = z.object({
  type: z.enum(["onboarding", "offboarding"]).optional(),
});

// ============================================================
// Template Schemas
// ============================================================

export const checklistTaskSchema = z.object({
  task_name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  owner: z.enum(["IT", "HR", "Manager", "NewHire"]),
  due_days_from_joining: z.number().int().nonnegative(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  department: z.string().optional(),
  type: z.enum(["onboarding", "offboarding"]).default("onboarding"),
  tasks: z.array(checklistTaskSchema).min(1, "At least one task is required"),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// ============================================================
// Checklist Schemas
// ============================================================

export const createChecklistSchema = z.object({
  employee_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  type: z.enum(["onboarding", "offboarding"]).default("onboarding"),
  joining_date: dateStringSchema.optional(),
});

export const updateChecklistTaskSchema = z.object({
  status: z.enum(["pending", "done", "overdue"]),
  notes: z.string().optional(),
});

// ============================================================
// Offboarding Schemas
// ============================================================

export const initiateOffboardingSchema = z.object({
  resignation_date: dateStringSchema.optional(),
  last_working_day: dateStringSchema,
  exit_type: z.enum(["resignation", "termination", "contract_end"]),
  reason: z.string().optional(),
});

export const exitInterviewSchema = z.object({
  overall_experience: z.number().int().min(1).max(5).optional(),
  reason: z.enum([
    "better_opportunity",
    "compensation",
    "work_culture",
    "personal",
    "relocation",
    "other",
  ]),
  would_recommend: z.boolean().optional(),
  feedback: z.string().optional(),
  suggestions: z.string().optional(),
});
