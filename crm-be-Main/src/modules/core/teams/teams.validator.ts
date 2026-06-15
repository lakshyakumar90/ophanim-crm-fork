import { z } from "zod";

// Create team
export const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100),
  managerId: z.string().uuid("Manager is required"),
  departmentId: z.string().uuid("Department is required"),
  description: z.string().max(500).optional().nullable(),
});

// Update team
export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  managerId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

// Add user to team
export const addUserToTeamSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// Types
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddUserToTeamInput = z.infer<typeof addUserToTeamSchema>;
