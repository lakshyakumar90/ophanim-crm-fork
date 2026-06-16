import { z } from "zod";

export const exitChecklistIdParamSchema = z.object({
  id: z.string().uuid("Invalid exit checklist ID"),
});

export const exitChecklistUserParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const listExitChecklistsQuerySchema = z.object({
  status: z.enum(["in_progress", "completed", "cancelled"]).optional(),
  user_id: z.string().uuid().optional(),
});

export const exitChecklistItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
  due_date: z.string().optional(),
});

export const createExitChecklistSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  template_json: z.array(exitChecklistItemSchema).default([]),
  completed_items: z.array(z.string()).optional(),
  exit_date: z.string().optional(),
  last_working_day: z.string().optional(),
  exit_type: z.string().optional(),
  notes: z.string().optional(),
});

export const updateExitChecklistSchema = z.object({
  template_json: z.array(exitChecklistItemSchema).optional(),
  completed_items: z.array(z.string()).optional(),
  exit_date: z.string().optional(),
  last_working_day: z.string().optional(),
  exit_type: z.string().optional(),
  status: z.enum(["in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export const completeExitItemSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
});
