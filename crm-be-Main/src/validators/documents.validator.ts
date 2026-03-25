import { z } from "zod";

/** Slug stored in employee_documents.document_type — must match hr_document_types.slug for active types */
export const documentTypeSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Use lowercase letters, numbers, underscores; must start with a letter",
  );

// Create document schema
export const createDocumentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  documentType: documentTypeSlugSchema,
  documentName: z.string().min(1, "Document name is required").max(200),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// Update document schema
export const updateDocumentSchema = z
  .object({
    documentName: z.string().min(1).max(200).optional(),
    documentType: documentTypeSlugSchema.optional(),
    expiryDate: z.string().nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Query schema
export const documentQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  documentType: documentTypeSlugSchema.optional(),
  isVerified: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid("Invalid document ID"),
});

export const documentUserIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const hrDocumentTypeIdParamSchema = z.object({
  id: z.string().uuid("Invalid document type ID"),
});

export const createHrDocumentTypeSchema = z.object({
  slug: documentTypeSlugSchema,
  label: z.string().min(1, "Label is required").max(120),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateHrDocumentTypeSchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Verify document schema
export const verifyDocumentSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const rejectDocumentSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(1000),
});

const uploadDocumentBaseFieldsSchema = z.object({
  documentType: documentTypeSlugSchema,
  documentName: z.string().min(1, "Document name is required").max(200),
  expiryDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

/** Multipart fields for POST /hr/documents/upload (file sent as form field "file") */
export const uploadHrDocumentFormSchema = uploadDocumentBaseFieldsSchema.extend({
  userId: z.string().uuid("Invalid user ID"),
});

export const uploadMyDocumentFormSchema = uploadDocumentBaseFieldsSchema;

// Types
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type VerifyDocumentInput = z.infer<typeof verifyDocumentSchema>;
export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>;
