import { z } from "zod";

export const createPortalTokenSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type CreatePortalTokenInput = z.infer<typeof createPortalTokenSchema>;
