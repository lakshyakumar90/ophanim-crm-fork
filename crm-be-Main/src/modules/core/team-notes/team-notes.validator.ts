import { z } from "zod";

export const createTeamNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

export const updateTeamNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});
