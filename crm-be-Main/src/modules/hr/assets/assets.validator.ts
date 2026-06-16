import { z } from "zod";

export const assetIdParamSchema = z.object({
  id: z.string().uuid("Invalid asset ID"),
});

export const listAssetsQuerySchema = z.object({
  status: z.enum(["available", "assigned", "maintenance", "retired"]).optional(),
  assigned_user_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  serial_number: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["available", "assigned", "maintenance", "retired"]).optional(),
  purchased_at: z.string().optional(),
  warranty_until: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assignAssetSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  notes: z.string().optional(),
});

export const listAssignmentsQuerySchema = z.object({
  asset_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  active_only: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
