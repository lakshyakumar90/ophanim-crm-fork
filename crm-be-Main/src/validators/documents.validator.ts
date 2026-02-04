import { z } from "zod";

// Document types enum
export const DOCUMENT_TYPES = [
  "aadhar",
  "pan",
  "passport",
  "driving_license",
  "offer_letter",
  "contract",
  "nda",
  "resignation",
  "bank_details",
  "salary_slip",
  "tax_form",
  "education",
  "certification",
  "experience_letter",
  "photo",
  "other",
] as const;

// Create document schema
export const createDocumentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  documentType: z.enum(DOCUMENT_TYPES),
  documentName: z.string().min(1, "Document name is required").max(200),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// Update document schema
export const updateDocumentSchema = z.object({
  documentName: z.string().min(1).max(200).optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  expiryDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// Query schema
export const documentQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  documentType: z.enum(DOCUMENT_TYPES).optional(),
  isVerified: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

// Verify document schema
export const verifyDocumentSchema = z.object({
  notes: z.string().max(1000).optional(),
});

// Types
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
export type VerifyDocumentInput = z.infer<typeof verifyDocumentSchema>;
