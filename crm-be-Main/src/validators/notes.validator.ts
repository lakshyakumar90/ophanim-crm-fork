import { z } from "zod";

// Create note schema
export const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(10000),
});

// Update note schema
export const updateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required").max(10000),
});

// Types
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
